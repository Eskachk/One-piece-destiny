import type { Rarity } from '../types';
import { RARITY_COLOR, rarityRank } from './rarity';
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

export type CeremonyTier = 'STANDARD' | 'PREMIUM';

export interface CeremonyPlan {
  tier: CeremonyTier;
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
 * Elle monte en énergie — violet, magenta, braise, or — ce qui donne au
 * dégradé une raison d'être autre que décorative. La couleur de la rareté est
 * ajoutée par `ceremonyPlan`.
 *
 * **Toutes les teintes sont vives, et ce n'est pas un choix esthétique.** Les
 * éclairs sont rendus en fusion additive : à l'écran, leur couleur s'ajoute à
 * celle du fond. Une première version partait d'un violet presque noir
 * (#180f2e) pour figurer le Haki de l'armement — et n'ajoutait donc
 * rigoureusement rien à un fond sombre. Les éclairs existaient, tournaient,
 * changeaient de couleur, et restaient parfaitement invisibles.
 */
const HAKI_RAMP_STANDARD = ['#3f57e0', '#2fd2c8'];
const HAKI_RAMP_PREMIUM = ['#4b2ee0', '#a02ee0', '#ff3a2f', '#ffd23f'];

const STANDARD = {
  shakeSeconds: 1.1,
  suspenseSeconds: 0.45,
  burstSeconds: 0.6,
  particles: 0,
  bolts: 5,
  cardIntervalSeconds: 0.26,
  ramp: HAKI_RAMP_STANDARD,
};

const PREMIUM = {
  shakeSeconds: 1.9,
  suspenseSeconds: 1.2,
  burstSeconds: 0.8,
  particles: 180,
  bolts: 11,
  cardIntervalSeconds: 0.42,
  ramp: HAKI_RAMP_PREMIUM,
};

export function bestRarity(cards: ChestCard[]): Rarity {
  return cards.reduce<Rarity>(
    (best, card) => (rarityRank(card.rarity) > rarityRank(best) ? card.rarity : best),
    'COMMON',
  );
}

export function ceremonyPlan(cards: ChestCard[]): CeremonyPlan {
  const highlight = bestRarity(cards);
  const premium = rarityRank(highlight) >= rarityRank(PREMIUM_FROM);
  const base = premium ? PREMIUM : STANDARD;

  return {
    tier: premium ? 'PREMIUM' : 'STANDARD',
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
export function reducedMotionPlan(cards: ChestCard[]): CeremonyPlan {
  return {
    ...ceremonyPlan(cards),
    shakeSeconds: 0,
    suspenseSeconds: 0,
    burstSeconds: 0,
    particles: 0,
    bolts: 0,
    cardIntervalSeconds: 0,
    totalSeconds: 0.2,
  };
}
