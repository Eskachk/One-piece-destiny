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

export interface CeremonyPlan {
  tier: CeremonyTier;
  /** Apparence du coffre à afficher. */
  skin: ChestSkin;
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
  bolts: 18,
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
