import 'server-only';

import { db } from '@/lib/supabase-admin';
import { getRequestContext } from '@/lib/auth/request-guard';

/**
 * Limitation de cadence des actions serveur (cahier §98).
 *
 * **Ce qui manquait.** `domain/auth/rate-limit.ts` protège la connexion et la
 * réinitialisation de mot de passe — cinq essais par compte, vingt par IP —
 * et ne servait qu'à cela. Toutes les actions vérifient bien l'origine
 * (`assertSameOrigin`), ce qui ferme le CSRF, mais rien ne limitait la
 * **cadence** d'un client par ailleurs légitime : création de compte,
 * ouverture de coffre, dépôt d'annonce au Marché.
 *
 * Le moteur anti-abus repère les schémas suspects, mais après coup : c'est une
 * détection, pas un frein. Une boucle qui reste sous ses seuils passait.
 *
 * ## Le contrat
 *
 * Un aller-retour, une instruction SQL, un verrou de ligne. Voir la migration
 * 0027 pour le raisonnement sur l'atomicité — lire puis écrire laisserait la
 * limite se contourner en tirant en parallèle, ce que fait précisément un
 * script.
 *
 * ## Ce que la limite ne fait jamais
 *
 * **Elle ne bloque pas sur une panne.** Si la base ne répond pas, l'action
 * passe. C'est un choix, et il est délibéré : un compteur en défaut ne doit
 * pas fermer le jeu à tout le monde. Le risque symétrique — un abuseur qui
 * profite d'une panne de base — est théorique, puisque l'action elle-même a
 * besoin de cette même base pour aboutir.
 */

export interface Quota {
  /** Nombre d'actions autorisées dans la fenêtre. */
  limite: number;
  /** Durée de la fenêtre, en secondes. */
  fenetreSecondes: number;
}

/**
 * Les quotas du produit, réunis ici pour qu'ils se lisent ensemble.
 *
 * Chaque valeur est fixée par rapport à un **usage humain plausible**, avec
 * une marge large : il s'agit d'arrêter une boucle, pas de gêner un joueur
 * pressé. Un joueur qui ouvre dix coffres d'affilée doit passer ; un script
 * qui en ouvre mille en une minute, non.
 */
export const QUOTAS = {
  /*
   * Création de compte. C'est le quota qui compte le plus : chaque inscription
   * ouvre un coffre de départ et peut déclencher un versement de parrainage,
   * donc de la valeur créée. Trois comptes par heure et par adresse laisse
   * passer une famille sur la même connexion, et arrête une ferme.
   */
  inscription: { limite: 3, fenetreSecondes: 3600 },

  /* Ouverture de coffre : dix par minute, largement au-dessus du rythme de la
     cérémonie, qui dure plusieurs secondes. */
  coffre: { limite: 10, fenetreSecondes: 60 },

  /* Dépôt d'annonce. Vingt par heure : un joueur qui vide son inventaire
     passe, un robot qui inonde le Marché pour manipuler les prix, non. */
  annonce: { limite: 20, fenetreSecondes: 3600 },

  /* Achat au Marché : la contrainte réelle est le portefeuille, celle-ci ne
     fait qu'empêcher la rafale. */
  achat: { limite: 30, fenetreSecondes: 60 },

  /* Verrouillage d'équipage : on peut changer d'avis souvent avant dimanche,
     mais pas cent fois par minute. */
  equipage: { limite: 30, fenetreSecondes: 60 },

  /* Fabrication d'une carte à partir d'éclats. */
  fabrication: { limite: 20, fenetreSecondes: 60 },

  /*
   * Créer ou rejoindre une ligue.
   *
   * Dix par heure : de quoi monter sa ligue, se tromper de code deux fois et
   * recommencer. Une ligue ne rapporte rien — elle filtre un classement déjà
   * calculé — donc il n'y a rien à farmer ; le frein n'est là que pour
   * empêcher un script de remplir la table.
   */
  ligue: { limite: 10, fenetreSecondes: 3600 },
} as const satisfies Record<string, Quota>;

export type QuotaName = keyof typeof QUOTAS;

export interface ThrottleResult {
  autorise: boolean;
  /** Instant à partir duquel la fenêtre se rouvre. */
  reessayerA: Date | null;
}

/** Message prêt à afficher, en français et avec une échéance. */
export function throttleMessage(result: ThrottleResult): string {
  if (!result.reessayerA) return 'Trop de tentatives. Réessaie dans un instant.';

  const secondes = Math.max(
    1,
    Math.ceil((result.reessayerA.getTime() - Date.now()) / 1000),
  );

  if (secondes < 90) {
    return `Trop de tentatives. Réessaie dans ${secondes} seconde${secondes > 1 ? 's' : ''}.`;
  }

  const minutes = Math.ceil(secondes / 60);
  return `Trop de tentatives. Réessaie dans ${minutes} minute${minutes > 1 ? 's' : ''}.`;
}

/**
 * Consomme un jeton pour `quota`, sur la portée `scope`.
 *
 * `scope` doit identifier **qui** est limité : un identifiant de joueur pour
 * ce qu'un compte fait, une adresse IP pour ce qu'on fait avant d'avoir un
 * compte. Mélanger les deux dans une même clé rendrait la limite dépendante de
 * l'ordre des appels.
 */
export async function consumeQuota(
  quota: QuotaName,
  scope: string,
): Promise<ThrottleResult> {
  const { limite, fenetreSecondes } = QUOTAS[quota];

  try {
    const { data, error } = await db()
      .rpc('consume_rate_limit', {
        p_bucket: `${quota}:${scope}`,
        p_limit: limite,
        p_window_seconds: fenetreSecondes,
      })
      .maybeSingle<{ allowed: boolean; remaining: number; retry_at: string }>();

    // Ouvert en cas de panne : voir l'en-tête. Une limite en défaut ne ferme
    // pas le jeu.
    if (error || !data) return { autorise: true, reessayerA: null };

    return {
      autorise: data.allowed,
      reessayerA: data.retry_at ? new Date(data.retry_at) : null,
    };
  } catch {
    return { autorise: true, reessayerA: null };
  }
}

/**
 * Limite sur l'adresse d'appel, pour ce qui précède l'existence d'un compte.
 *
 * ⚠️ `x-forwarded-for` est falsifiable si aucun proxy de confiance ne le
 * réécrit — c'est déjà dit dans `request-guard.ts` et cela vaut ici. Sur
 * Vercel, l'en-tête est posé par la plateforme. Sans adresse du tout, on
 * laisse passer plutôt que de tout ranger dans un seau commun : une clé
 * `ip:inconnue` partagée bloquerait des joueurs les uns à cause des autres.
 */
export async function consumeQuotaByIp(quota: QuotaName): Promise<ThrottleResult> {
  const { ip } = await getRequestContext();
  if (!ip) return { autorise: true, reessayerA: null };
  return consumeQuota(quota, `ip:${ip}`);
}

/** Limite sur le compte. */
export function consumeQuotaByPlayer(
  quota: QuotaName,
  playerId: string,
): Promise<ThrottleResult> {
  return consumeQuota(quota, `player:${playerId}`);
}
