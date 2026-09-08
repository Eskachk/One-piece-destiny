import type { Rarity } from '../types';
import { RARITY_COLOR, RARITY_ORDER, rarityRank } from './rarity';
import type { ChestCard } from './chest';

/**
 * Mise en scène de l'ouverture (cahier §56, §60, §61).
 *
 * La scénographie est isolée ici, en pur calcul : quelle est la meilleure
 * carte, quelle durée, quelle intensité, quelles couleurs. Le composant 3D ne
 * fait qu'exécuter ce plan — ce qui le rend testable sans WebGL.
 *
 * §61 est la contrainte structurante : **le silence qui précède fait la
 * tension**. Une cérémonie où tout arrive tout de suite ne récompense rien,
 * puisque le joueur voit le résultat avant d'avoir eu le temps d'espérer.
 * D'où le découpage en quatre temps distincts, et non une seule animation
 * continue :
 *
 *   1. `charge`   — le coffre encaisse, des éclairs de Haki s'en échappent ;
 *   2. `suspense` — tout se fige. C'est le temps mort qui fait la promesse ;
 *   3. `burst`    — le couvercle cède ;
 *   4. `reveal`   — les cartes tombent **une par une**, jamais en bloc.
 *
 * §60 borne l'ensemble : les animations longues restent réservées aux coffres.
 * Partout ailleurs, 150–250 ms.
 */

export type CeremonyTier = 'STANDARD' | 'PREMIUM' | 'ROYAL';

/**
 * Apparence du coffre.
 *
 * Séparée du palier de cérémonie : un coffre royal garde son bois noir et or
 * même si le tirage retombe sur un Épique, sinon le joueur croirait avoir
 * ouvert autre chose que ce qu'il a payé.
 */
export type ChestSkin = 'HARBOR' | 'ROYAL';

/**
 * Comment le coffre se comporte pendant la charge.
 *
 * `SHAKE` — il tremble et sursaute : quelque chose force pour sortir.
 * `LEVITATE` — il s'élève et tourne lentement : rien ne force, il s'ouvre
 *   parce que c'est l'heure.
 *
 * Les deux racontent des choses différentes, et c'est le but. Un coffre acheté
 * qui se débat comme un coffre ordinaire ne se distingue que par sa peinture ;
 * celui qui lévite dit qu'il n'a rien à forcer. C'est aussi la seule manière
 * d'être **certain** de ce qu'on a ouvert sans lire une étiquette (§111).
 */
export type ChestMotion = 'SHAKE' | 'LEVITATE';

/**
 * Nature des éclairs qui entourent le coffre.
 *
 * `RARITY` — la rampe de couleurs des raretés. Ils montent pendant la charge
 *   et **s'éteignent au silence** : c'est leur disparition qui rend le silence
 *   audible, et c'est le ressort du §61.
 *
 * `CONQUEROR` — le Haki des Rois : un cœur noir bordé de rouge, présent de la
 *   première image à la dernière. Il ne raconte pas une montée en tension mais
 *   une nature — ce coffre-là est ainsi tout le temps, et n'a rien à prouver.
 *
 * Un seul champ pour la teinte **et** la persistance, parce que ce sont ici la
 * même décision : des éclairs de Haki des Rois qui s'éteindraient au silence
 * ne seraient pas une variante, ils seraient une erreur.
 */
export type BoltStyle = 'RARITY' | 'CONQUEROR';

export interface CeremonyPlan {
  tier: CeremonyTier;
  /** Apparence du coffre à afficher. */
  skin: ChestSkin;
  /** Comportement du coffre pendant la charge. */
  motion: ChestMotion;
  /** Rareté la plus élevée du coffre, celle qui dicte la mise en scène. */
  highlight: Rarity;
  /** Secondes de tremblement et de montée en charge. */
  shakeSeconds: number;
  /** Silence avant la révélation (cahier §61). */
  suspenseSeconds: number;
  /** Ouverture du couvercle. */
  burstSeconds: number;
  /** Nombre de particules. 0 pour un coffre ordinaire. */
  particles: number;
  /**
   * Couleurs successives des éclairs de Haki, de la première à la dernière.
   *
   * La dernière est **celle de la meilleure carte du coffre** : le joueur
   * apprend donc ce qu'il a gagné une fraction de seconde avant de le voir.
   * C'est la promesse qui rend l'attente supportable plutôt que gratuite.
   */
  hakiColors: string[];
  /** Éclairs visibles simultanément au plus fort de la charge. */
  bolts: number;
  /** Nature des éclairs. */
  boltStyle: BoltStyle;
  /** Délai entre deux cartes révélées (cahier §61 : une par une). */
  cardIntervalSeconds: number;
  /** Instant où la première carte apparaît. */
  totalSeconds: number;
}

/** À partir de Légendaire, la cérémonie passe en version premium. */
const PREMIUM_FROM: Rarity = 'LEGENDARY';

/**
 * Rampe de couleurs du Haki.
 *
 * Les éclairs **traversent toutes les raretés**, du Commun au Mythique, avant
 * de se fixer sur celle que contient réellement le coffre. Le joueur reconnaît
 * chaque palier — ce sont exactement les couleurs de ses cartes — et l'attente
 * devient une question : jusqu'où la montée va-t-elle aller ?
 *
 * C'est aussi ce qui rend le coffre ordinaire supportable : la charge passe
 * par l'or et par la braise avant de retomber sur le turquoise. On a eu peur,
 * et c'est le but.
 *
 * **Toutes les teintes sont vives, et ce n'est pas un choix esthétique.** Les
 * éclairs sont rendus en fusion additive : à l'écran, leur couleur s'ajoute à
 * celle du fond. Une première version partait d'un violet presque noir pour
 * figurer le Haki de l'armement — et n'ajoutait donc rigoureusement rien à un
 * fond sombre. Les éclairs existaient, tournaient, changeaient de couleur, et
 * restaient parfaitement invisibles.
 */
const RARITY_RAMP = RARITY_ORDER.map((rarity) => RARITY_COLOR[rarity]);

/**
 * Un coffre premium fait **deux tours** de rampe avant de se fixer.
 *
 * La répétition est délibérée : au premier passage on lit les couleurs, au
 * second on comprend qu'elles montent — et qu'elles sont allées plus haut que
 * la fois d'avant.
 */
const HAKI_RAMP_STANDARD = RARITY_RAMP;
const HAKI_RAMP_PREMIUM = [...RARITY_RAMP, ...RARITY_RAMP];

const STANDARD = {
  shakeSeconds: 2.2,
  suspenseSeconds: 0.8,
  burstSeconds: 0.8,
  particles: 40,
  bolts: 8,
  cardIntervalSeconds: 0.34,
  ramp: HAKI_RAMP_STANDARD,
};

const PREMIUM = {
  shakeSeconds: 3.2,
  suspenseSeconds: 1.6,
  burstSeconds: 1,
  particles: 220,
  bolts: 14,
  cardIntervalSeconds: 0.5,
  ramp: HAKI_RAMP_PREMIUM,
};

/**
 * Coffre royal (boutique).
 *
 * Plus long, plus dense, et **la rampe ne redescend jamais sous le
 * Légendaire** : elle boucle entre les deux teintes hautes. Le joueur a payé
 * pour une garantie, il serait absurde de lui faire craindre un commun.
 */
const ROYAL = {
  shakeSeconds: 4,
  suspenseSeconds: 2,
  burstSeconds: 1.1,
  particles: 320,
  /*
   * Onze, et non dix-huit.
   *
   * Les éclairs du coffre royal sont désormais des rubans épais présents du
   * début à la fin, et non des traits fins limités à la charge. À dix-huit,
   * ils se recouvraient au point de former un disque noir autour du coffre —
   * on ne distinguait plus un seul éclair. Moins nombreux, chacun se voit.
   */
  bolts: 11,
  cardIntervalSeconds: 0.55,
  ramp: [
    RARITY_COLOR.EPIC,
    RARITY_COLOR.LEGENDARY,
    RARITY_COLOR.MYTHIC,
    RARITY_COLOR.LEGENDARY,
    RARITY_COLOR.MYTHIC,
  ],
};

export function bestRarity(cards: ChestCard[]): Rarity {
  return cards.reduce<Rarity>(
    (best, card) => (rarityRank(card.rarity) > rarityRank(best) ? card.rarity : best),
    'COMMON',
  );
}

/**
 * Plan de cérémonie.
 *
 * `royal` est décidé par **l'origine du coffre**, pas par son contenu : un
 * coffre acheté garde sa mise en scène quel que soit le tirage. Lier
 * l'apparence au résultat reviendrait à annoncer la déception avant de
 * l'infliger.
 */
export function ceremonyPlan(
  cards: ChestCard[],
  { royal = false }: { royal?: boolean } = {},
): CeremonyPlan {
  const highlight = bestRarity(cards);
  const premium = rarityRank(highlight) >= rarityRank(PREMIUM_FROM);
  const base = royal ? ROYAL : premium ? PREMIUM : STANDARD;

  return {
    tier: royal ? 'ROYAL' : premium ? 'PREMIUM' : 'STANDARD',
    skin: royal ? 'ROYAL' : 'HARBOR',
    /*
     * La lévitation suit **l'origine du coffre**, comme l'apparence — jamais
     * le tirage. Un coffre royal qui retomberait sur un Épique doit quand même
     * léviter : lier la mise en scène au résultat annoncerait la déception
     * avant de l'infliger, ce que le reste de ce fichier s'applique à éviter.
     */
    motion: royal ? 'LEVITATE' : 'SHAKE',
    boltStyle: royal ? 'CONQUEROR' : 'RARITY',
    highlight,
    shakeSeconds: base.shakeSeconds,
    suspenseSeconds: base.suspenseSeconds,
    burstSeconds: base.burstSeconds,
    particles: base.particles,
    bolts: base.bolts,
    cardIntervalSeconds: base.cardIntervalSeconds,
    hakiColors: [...base.ramp, RARITY_COLOR[highlight]],
    totalSeconds:
      base.shakeSeconds + base.suspenseSeconds + base.burstSeconds,
  };
}

/**
 * Couleur des éclairs à un instant donné de la charge.
 *
 * Progression **discrète et non interpolée** : un éclair change de couleur
 * d'un coup, il ne fond pas dans le suivant. Un dégradé continu se lirait
 * comme un halo qui vire, pas comme une énergie qui monte d'un cran.
 *
 * `progress` est ramené dans [0, 1] : une boucle de rendu peut le dépasser
 * d'une image sans que la couleur disparaisse.
 */
export function hakiColorAt(plan: CeremonyPlan, progress: number): string {
  const colors = plan.hakiColors;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const index = Math.min(
    colors.length - 1,
    Math.floor(clamped * colors.length),
  );
  return colors[index];
}

/**
 * Plan dégradé pour `prefers-reduced-motion` (cahier §111).
 *
 * On ne supprime pas la révélation — le joueur doit voir ce qu'il a obtenu —
 * mais tremblement, éclairs, particules et attente disparaissent. Les
 * couleurs restent : ce sont des repères de lecture, pas du mouvement.
 */
export function reducedMotionPlan(
  cards: ChestCard[],
  options?: { royal?: boolean },
): CeremonyPlan {
  return {
    ...ceremonyPlan(cards, options),
    shakeSeconds: 0,
    suspenseSeconds: 0,
    burstSeconds: 0,
    particles: 0,
    bolts: 0,
    cardIntervalSeconds: 0,
    totalSeconds: 0.2,
  };
}

/**
 * Tours complets que fait le coffre royal avant de s'ouvrir.
 *
 * Six sur les six secondes de charge et de silence : la vitesse de pointe
 * approche deux tours par seconde, ce qui se lit comme une toupie et non
 * comme une plateforme tournante de vitrine.
 */
export const TOURS_LEVITATION = 6;

/**
 * Accélération et décélération douces, départ et arrivée à l'arrêt.
 *
 * `smootherstep` : sa dérivée est **nulle aux deux bouts**. Le coffre part
 * immobile, monte en régime, puis s'arrête — sans à-coup ni à l'un ni à
 * l'autre.
 */
function smootherstep(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return x * x * x * (x * (6 * x - 15) + 10);
}

/**
 * Angle du coffre en lévitation, en radians, à un instant donné.
 *
 * ## Pourquoi une loi, et non une correction
 *
 * La version précédente faisait tourner le coffre à vitesse constante, puis
 * **rattrapait** l'angle pendant le silence pour le remettre de face. Un
 * rattrapage se voit toujours : la rotation avançait tranquillement, puis
 * freinait d'un coup pour tomber juste. C'était brusque, et ça ne pouvait pas
 * ne pas l'être — on demandait à une correction de faire le travail d'une
 * chorégraphie.
 *
 * Ici l'angle total est choisi d'avance : un nombre **entier** de tours, sur
 * la durée exacte qui sépare le début de l'ouverture. Le coffre ne se remet
 * jamais de face, il n'a jamais cessé d'aller s'y poser. Rien à corriger,
 * donc rien à voir.
 *
 * Au-delà de l'ouverture, l'angle ne bouge plus : `u` est borné, et le coffre
 * reste exactement face au joueur pendant que le couvercle cède.
 */
export function angleLevitation(plan: CeremonyPlan, elapsed: number): number {
  const jusquAOuverture = plan.shakeSeconds + plan.suspenseSeconds;
  const u = jusquAOuverture > 0 ? elapsed / jusquAOuverture : 1;
  return TOURS_LEVITATION * Math.PI * 2 * smootherstep(u);
}
