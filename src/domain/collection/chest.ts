import type { Character, Rarity } from '../types';
import {
  DUPLICATE_SHARDS,
  isAtLeast,
  RARITY_WEIGHTS,
  rarityRank,
} from './rarity';

/**
 * Ouverture de coffre (cahier §26 à §31).
 *
 * Fonction **pure** : le hasard est injecté. Deux raisons.
 *
 *   1. Testabilité : on peut vérifier les garanties sans jouer aux dés.
 *   2. Sécurité (§97) : le tirage a lieu côté serveur, le client ne peut ni
 *      le rejouer ni l'influencer. Cette fonction ne touche jamais au réseau.
 */

/** Composition annoncée au joueur (cahier §30). */
export const CHEST_SIZE = 5;

/**
 * Chaque emplacement impose une rareté minimale. La composition est publique
 * et doit rester exactement celle affichée avant l'achat (§113).
 */
export const CHEST_SLOTS: readonly Rarity[] = [
  'COMMON',
  'COMMON',
  'COMMON',
  'RARE', // « 1 Rare+ » garanti
  'COMMON', // emplacement libre : peut sortir n'importe quelle rareté
] as const;

/**
 * Nombre de coffres sans Légendaire au bout duquel le suivant en garantit un
 * (cahier §31). La règle doit être annoncée avant l'achat.
 *
 * **Ramené de vingt à douze, sur mesure.** Un Légendaire ou mieux sort une
 * fois sur 12,8 coffres : la probabilité de n'en voir aucun en vingt
 * ouvertures n'est que de **19,7 %**. La garantie ne se déclenchait donc que
 * pour un joueur sur cinq, après vingt semaines de jeu gratuit — c'est une
 * curiosité statistique, pas un filet.
 *
 * À douze, elle concerne 38 % des joueurs et pose une vraie borne : au pire,
 * un Légendaire toutes les douze ouvertures. C'est ce qu'un compteur de pitié
 * est censé promettre — que la malchance a une fin datée.
 */
export const PITY_THRESHOLD = 12;

export interface ChestCard {
  characterId: string;
  rarity: Rarity;
  /** Le joueur possédait déjà ce personnage. */
  duplicate: boolean;
  /** Fragments accordés en cas de doublon (cahier §28). */
  shards: number;
}

/**
 * Catégories proposées au choix (cahier §32).
 *
 * Le joueur en garantit une, le reste du coffre reste aléatoire. Le cahier est
 * clair sur le dosage : « un peu de décision sans rendre les coffres trop
 * complexes ».
 */
export const CHEST_CATEGORIES = [
  'Haki',
  'Mugiwara',
  'Marine',
  'Cross Guild',
] as const;

export type ChestCategory = (typeof CHEST_CATEGORIES)[number];

/**
 * Un personnage appartient-il à la catégorie ? On regarde à la fois ses
 * affiliations et ses capacités, pour que « Haki » ait un sens.
 */
export function matchesCategory(
  character: Character,
  category: ChestCategory,
): boolean {
  return (
    character.affiliations.includes(category) ||
    character.abilities.some((ability) => ability.includes(category))
  );
}

export interface OpenChestInput {
  roster: Character[];
  /** Personnages déjà possédés avant ouverture. */
  owned: ReadonlySet<string>;
  /** Coffres ouverts depuis le dernier légendaire. */
  pityCounter: number;
  /** Générateur dans [0, 1). Fourni par l'appelant, jamais par le client. */
  random: () => number;
  /**
   * Interdit les doublons **à l'intérieur d'un même coffre**. Utilisé pour le
   * coffre d'inscription, afin d'éviter un démarrage frustrant (§27).
   */
  distinct?: boolean;
  /**
   * Catégorie garantie sur un emplacement (cahier §32). Le reste du coffre
   * demeure aléatoire : c'est une inflexion, pas un choix de personnage.
   */
  category?: ChestCategory;
  /**
   * Emplacements du coffre. Par défaut `CHEST_SLOTS` ; le coffre
   * d'inscription en utilise trois.
   */
  slots?: readonly Rarity[];
}

export interface ChestResult {
  cards: ChestCard[];
  /** Compteur de pitié après ouverture, à persister. */
  pityCounter: number;
  /** Vrai si la garantie de pitié s'est déclenchée sur ce coffre. */
  pityTriggered: boolean;
}

function pickWeighted(
  candidates: Character[],
  random: () => number,
): Character | null {
  if (candidates.length === 0) return null;

  const total = candidates.reduce(
    (sum, character) => sum + RARITY_WEIGHTS[character.rarity],
    0,
  );

  let threshold = random() * total;
  for (const character of candidates) {
    threshold -= RARITY_WEIGHTS[character.rarity];
    if (threshold < 0) return character;
  }
  // Sécurité numérique : un arrondi ne doit pas produire un coffre vide.
  return candidates[candidates.length - 1];
}

/**
 * Ouvre un coffre.
 *
 * L'ordre des garanties compte : la pitié écrase la rareté minimale de
 * l'emplacement, jamais l'inverse.
 */
export function openChest(input: OpenChestInput): ChestResult {
  const slots = input.slots ?? CHEST_SLOTS;
  const pityTriggered = input.pityCounter >= PITY_THRESHOLD;

  const cards: ChestCard[] = [];
  const drawnInThisChest = new Set<string>();
  let legendaryFound = false;

  // L'emplacement de catégorie est le second : le premier reste réservé à la
  // garantie de pitié, qui prime (§31).
  const categorySlot = pityTriggered ? 1 : 0;

  slots.forEach((minimum, index) => {
    // La garantie de pitié s'applique au premier emplacement, pour que le
    // joueur la voie immédiatement plutôt qu'en fin d'animation.
    const effectiveMinimum: Rarity =
      pityTriggered && index === 0 ? 'LEGENDARY' : minimum;

    let candidates = input.roster.filter((character) =>
      isAtLeast(character.rarity, effectiveMinimum),
    );

    // Emplacement garanti par catégorie. Si le référentiel n'offre aucun
    // candidat, on retombe sur le tirage normal plutôt que de rendre un
    // coffre incomplet.
    if (input.category && index === categorySlot) {
      const inCategory = candidates.filter((character) =>
        matchesCategory(character, input.category!),
      );
      if (inCategory.length > 0) candidates = inCategory;
    }

    if (input.distinct) {
      candidates = candidates.filter((c) => !drawnInThisChest.has(c.id));
    }

    // Aucun candidat au niveau exigé : on redescend plutôt que de rendre un
    // coffre incomplet. Un référentiel trop petit ne doit pas casser le jeu.
    if (candidates.length === 0) {
      candidates = input.roster.filter((c) => !drawnInThisChest.has(c.id));
    }

    const character = pickWeighted(candidates, input.random);
    if (!character) return;

    drawnInThisChest.add(character.id);
    if (rarityRank(character.rarity) >= rarityRank('LEGENDARY')) {
      legendaryFound = true;
    }

    // Un doublon dans le coffre courant compte comme doublon : sinon deux
    // exemplaires du même personnage donneraient deux cartes neuves.
    const duplicate =
      input.owned.has(character.id) ||
      cards.some((card) => card.characterId === character.id);

    cards.push({
      characterId: character.id,
      rarity: character.rarity,
      duplicate,
      shards: duplicate ? DUPLICATE_SHARDS[character.rarity] : 0,
    });
  });

  return {
    cards,
    // Un légendaire remet le compteur à zéro ; sinon il avance d'un cran.
    pityCounter: legendaryFound ? 0 : input.pityCounter + 1,
    pityTriggered,
  };
}

/**
 * Emplacements du coffre d'inscription (cahier §27).
 *
 * **Cinq** personnages, dont un Rare garanti — même composition qu'un coffre
 * ordinaire, à ceci près qu'ils sont tous distincts.
 *
 * Il en donnait trois, soit exactement la taille d'un équipage : le nouveau
 * joueur pouvait jouer sa première semaine, mais sans le moindre choix, sa
 * seule composition possible étant sa seule dotation. Cinq cartes lui laissent
 * une vraie décision dès le premier chapitre, ce qui est tout l'intérêt du jeu.
 */
export const STARTER_CHEST_SLOTS: readonly Rarity[] = [
  'COMMON',
  'COMMON',
  'RARE', // au moins une carte qui donne envie de continuer
  'COMMON',
  'COMMON',
] as const;

/**
 * Emplacements du coffre royal (boutique).
 *
 * Un Légendaire garanti, et le reste au-dessus du commun. C'est ce qui
 * justifie son prix : la garantie, pas un tirage secret. Les probabilités des
 * autres emplacements sont celles de tous les coffres du jeu (§113).
 */
export const ROYAL_CHEST_SLOTS: readonly Rarity[] = [
  'RARE',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'RARE',
] as const;


/**
 * Coffre d'inscription : personnages **distincts**, pour ne pas offrir un
 * démarrage frustrant fait de doublons.
 */
export function openStarterChest(
  roster: Character[],
  random: () => number,
): ChestResult {
  return openChest({
    roster,
    owned: new Set(),
    pityCounter: 0,
    random,
    distinct: true,
    slots: STARTER_CHEST_SLOTS,
  });
}
