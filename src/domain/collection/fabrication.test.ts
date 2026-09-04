import { beforeEach, describe, expect, it } from 'vitest';
import { CHARACTERS } from '../../data/characters';
import { openChest } from './chest';
import { CRAFT_COST, evaluateCraft } from './crafting';
import { memoryRepository } from '../../lib/repository/memory';

/**
 * La boucle de fabrication, de bout en bout.
 *
 * ## Pourquoi ce fichier existe
 *
 * La fabrication (§29) n'a **jamais pu s'exécuter**. Les fragments étaient
 * rangés par personnage et n'étaient crédités que sur un doublon — donc
 * uniquement pour un personnage possédé — alors que `evaluateCraft` refuse de
 * fabriquer ce qu'on possède déjà. Les deux conditions s'excluaient.
 *
 * Rien ne l'avait signalé, et pour une raison précise : les tests existants
 * vérifiaient `evaluateCraft` **en lui passant des fragments à la main**. La
 * fonction était juste ; c'est le chemin qui y menait qui n'existait pas.
 *
 * D'où la forme de ces tests : ils partent d'un coffre réellement ouvert et
 * suivent les fragments jusqu'à la carte. Un test qui fabrique son état
 * d'entrée ne peut pas voir une contradiction entre deux morceaux du produit.
 */

const JOUEUR = 'joueur-fabrication';

/** Générateur reproductible : un test d'économie ne doit pas clignoter. */
function graine(depart: number) {
  let s = depart;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

describe('boucle de fabrication', () => {
  beforeEach(async () => {
    const owned = new Set<string>();
    const random = graine(4242);
    let pity = 0;

    // Trente coffres : de quoi accumuler des doublons sans viser un résultat
    // particulier.
    for (let n = 0; n < 30; n += 1) {
      const tirage = openChest({
        roster: CHARACTERS,
        owned,
        pityCounter: pity,
        random,
      });
      pity = tirage.pityCounter;

      await memoryRepository.applyChestOpening({
        playerId: JOUEUR,
        kind: 'WEEKLY',
        cards: tirage.cards,
        pityTriggered: false,
        pityCounter: tirage.pityCounter,
        clientRequestId: `coffre-${n}`,
      });

      for (const carte of tirage.cards) {
        if (!carte.duplicate) owned.add(carte.characterId);
      }
    }
  });

  it('les doublons remplissent une réserve dépensable', async () => {
    // Le cœur du défaut : les fragments existaient, mais sur des personnages
    // que le joueur possédait — donc sur rien de fabricable.
    const reserve = await memoryRepository.getShards(JOUEUR);
    expect(reserve).toBeGreaterThan(0);
  });

  it('un personnage manquant devient fabricable', async () => {
    const reserve = await memoryRepository.getShards(JOUEUR);
    const possedes = new Set(await memoryRepository.getOwnedCharacterIds(JOUEUR));

    // Le moins cher des manquants : c'est celui que la réserve atteint en
    // premier, et il doit être atteignable après trente coffres.
    const manquant = CHARACTERS.filter((c) => !possedes.has(c.id)).sort(
      (a, b) => CRAFT_COST[a.rarity] - CRAFT_COST[b.rarity],
    )[0];
    expect(manquant).toBeDefined();

    const decision = evaluateCraft({
      rarity: manquant.rarity,
      owned: false,
      shards: reserve,
    });

    expect(decision.allowed, `réserve ${reserve}, coût ${CRAFT_COST[manquant.rarity]}`).toBe(true);
  });

  it('la fabrication débite la réserve et livre la carte', async () => {
    const avant = await memoryRepository.getShards(JOUEUR);
    const possedes = new Set(await memoryRepository.getOwnedCharacterIds(JOUEUR));
    const cible = CHARACTERS.filter((c) => !possedes.has(c.id)).sort(
      (a, b) => CRAFT_COST[a.rarity] - CRAFT_COST[b.rarity],
    )[0];
    const cout = CRAFT_COST[cible.rarity];

    const fait = await memoryRepository.craftCharacter(JOUEUR, cible.id, cout);
    expect(fait).toBe(true);

    expect(await memoryRepository.getShards(JOUEUR)).toBe(avant - cout);
    expect(await memoryRepository.getOwnedCharacterIds(JOUEUR)).toContain(cible.id);
  });

  it('refuse quand la réserve ne suffit pas, et ne débite rien', async () => {
    const avant = await memoryRepository.getShards(JOUEUR);
    const possedes = new Set(await memoryRepository.getOwnedCharacterIds(JOUEUR));
    const cible = CHARACTERS.find((c) => !possedes.has(c.id))!;

    const fait = await memoryRepository.craftCharacter(JOUEUR, cible.id, avant + 1);

    expect(fait).toBe(false);
    expect(await memoryRepository.getShards(JOUEUR)).toBe(avant);
  });

  it('ne fabrique pas ce qui est déjà possédé', async () => {
    const possede = (await memoryRepository.getOwnedCharacterIds(JOUEUR))[0];
    const personnage = CHARACTERS.find((c) => c.id === possede)!;

    const decision = evaluateCraft({
      rarity: personnage.rarity,
      owned: true,
      shards: 999_999,
    });

    expect(decision.allowed).toBe(false);
  });
});
