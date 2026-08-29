import { describe, expect, it } from 'vitest';
import {
  levelFromXp,
  levelProgress,
  LEVEL_REWARDS,
  MAX_LEVEL,
  unlockedRewards,
  xpEarned,
  xpForLevel,
  XP_PER_APPEARANCE_IN_CREW,
  XP_PER_SCORING_CHAPTER,
} from './levels';
import {
  CHEST_CATEGORIES,
  matchesCategory,
  openChest,
  type ChestCategory,
} from './chest';
import { CHARACTERS, CHARACTER_INDEX } from '../../data/characters';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('niveaux de personnage (§34)', () => {
  it('commence au niveau 1 sans expérience', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(xpForLevel(1)).toBe(0);
  });

  it('progresse avec l\'expérience', () => {
    expect(levelFromXp(xpForLevel(2))).toBe(2);
    expect(levelFromXp(xpForLevel(5))).toBe(5);
  });

  it('plafonne au niveau maximal', () => {
    expect(levelFromXp(10_000_000)).toBe(MAX_LEVEL);
  });

  it('exige de plus en plus d\'expérience', () => {
    const paliers = [2, 3, 4, 5].map(
      (level) => xpForLevel(level) - xpForLevel(level - 1),
    );
    for (let i = 1; i < paliers.length; i += 1) {
      expect(paliers[i]).toBeGreaterThan(paliers[i - 1]);
    }
  });

  it('décrit la progression dans le niveau courant', () => {
    const milieu = Math.floor((xpForLevel(3) + xpForLevel(4)) / 2);
    const progress = levelProgress(milieu);
    expect(progress.level).toBe(3);
    expect(progress.ratio).toBeGreaterThan(0);
    expect(progress.ratio).toBeLessThan(1);
  });

  it('affiche une progression pleine au niveau maximal', () => {
    const progress = levelProgress(xpForLevel(MAX_LEVEL));
    expect(progress.nextThreshold).toBeNull();
    expect(progress.ratio).toBe(1);
  });

  it('ne donne aucune expérience hors équipage', () => {
    expect(xpEarned(false, true)).toBe(0);
  });

  it('récompense davantage un personnage qui a marqué', () => {
    expect(xpEarned(true, false)).toBe(XP_PER_APPEARANCE_IN_CREW);
    expect(xpEarned(true, true)).toBe(
      XP_PER_APPEARANCE_IN_CREW + XP_PER_SCORING_CHAPTER,
    );
  });

  it('ne débloque que des récompenses cosmétiques', () => {
    // §34 : tout avantage compétitif est proscrit. Aucun libellé ne doit
    // évoquer un bonus de score.
    for (const { reward } of LEVEL_REWARDS) {
      expect(reward.toLowerCase()).not.toMatch(/score|point|bonus|%/);
    }
  });

  it('débloque les récompenses au fil des niveaux', () => {
    expect(unlockedRewards(1)).toEqual([]);
    expect(unlockedRewards(10)).toHaveLength(2);
    expect(unlockedRewards(MAX_LEVEL)).toHaveLength(LEVEL_REWARDS.length);
  });
});

describe('coffre à choix de catégorie (§32)', () => {
  const owned = new Set<string>();

  it('garantit un personnage de la catégorie choisie', () => {
    for (const category of CHEST_CATEGORIES) {
      for (let seed = 1; seed <= 15; seed += 1) {
        const result = openChest({
          roster: CHARACTERS,
          owned,
          pityCounter: 0,
          random: seeded(seed),
          category,
        });

        const found = result.cards.some((card) => {
          const character = CHARACTER_INDEX.get(card.characterId);
          return character ? matchesCategory(character, category) : false;
        });
        expect(found).toBe(true);
      }
    }
  });

  it('laisse le reste du coffre aléatoire', () => {
    // Le choix est une inflexion, pas une sélection : les autres cartes
    // varient toujours d'un tirage à l'autre.
    const tirages = [1, 2, 3, 4, 5].map((seed) =>
      openChest({
        roster: CHARACTERS,
        owned,
        pityCounter: 0,
        random: seeded(seed),
        category: 'Marine',
      })
        .cards.map((c) => c.characterId)
        .join(','),
    );
    expect(new Set(tirages).size).toBeGreaterThan(1);
  });

  it('laisse la garantie de pitié primer sur la catégorie', () => {
    const result = openChest({
      roster: CHARACTERS,
      owned,
      pityCounter: 99,
      random: seeded(7),
      category: 'Marine',
    });

    // Premier emplacement : légendaire garanti (§31), quelle que soit la
    // catégorie demandée.
    expect(['LEGENDARY', 'MYTHIC']).toContain(result.cards[0].rarity);
    // La catégorie reste honorée sur un autre emplacement.
    const marines = result.cards.filter((card) => {
      const character = CHARACTER_INDEX.get(card.characterId);
      return character ? matchesCategory(character, 'Marine') : false;
    });
    expect(marines.length).toBeGreaterThan(0);
  });

  it('rend un coffre complet même sans candidat dans la catégorie', () => {
    const sansMarine = CHARACTERS.filter(
      (c) => !matchesCategory(c, 'Marine' as ChestCategory),
    );
    const result = openChest({
      roster: sansMarine,
      owned,
      pityCounter: 0,
      random: seeded(3),
      category: 'Marine',
    });
    expect(result.cards).toHaveLength(5);
  });
});
