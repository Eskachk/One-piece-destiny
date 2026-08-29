'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CHARACTERS, CHARACTER_INDEX } from '@/data/characters';
import {
  openChest,
  openStarterChest,
  type ChestCard,
} from '@/domain/collection/chest';
import {
  describeCraftRefusal,
  evaluateCraft,
} from '@/domain/collection/crafting';
import { CHEST_PRICE_BERRIES } from '@/domain/collection/rewards';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { getRepository } from '@/lib/repository';

/**
 * Ouverture du coffre d'inscription (cahier §27).
 *
 * Le tirage a lieu **entièrement côté serveur** (§97). Le client ne peut ni
 * demander un personnage précis, ni annoncer ce que contient son coffre, ni
 * rejouer un tirage qui lui déplaît : il envoie une requête et reçoit un
 * résultat déjà enregistré.
 */

/**
 * Carte telle qu'elle est envoyée au navigateur.
 *
 * On y joint le **nom**, que le client n'a donc plus à chercher. Sans cela, la
 * cérémonie d'ouverture devait importer `CHARACTER_INDEX` et embarquait les
 * 790 personnages dans le bundle — pour afficher trois à cinq noms.
 */
export interface RevealedCard extends ChestCard {
  name: string;
}

export type OpenStarterResult =
  | { ok: true; cards: RevealedCard[] }
  | { ok: false; error: string };

/** Joint le nom de chaque carte, côté serveur. */
function reveal(cards: ChestCard[]): RevealedCard[] {
  return cards.map((card) => ({
    ...card,
    name: CHARACTER_INDEX.get(card.characterId)?.name ?? card.characterId,
  }));
}

/**
 * Générateur cryptographique. `Math.random` conviendrait mal ici : sa
 * séquence est prédictible à partir de quelques tirages observés, ce qui
 * ouvrirait la porte à l'anticipation des coffres.
 */
function secureRandom(): number {
  // 6 octets = 48 bits d'entropie, divisés par 2^48 : le résultat est
  // toujours dans [0, 1).
  //
  // `randomInt` serait plus lisible mais sa borne haute est plafonnée à
  // 2^48 - 1 : passer 2^48 lève une RangeError et fait échouer chaque
  // ouverture de coffre.
  return randomBytes(6).readUIntBE(0, 6) / 2 ** 48;
}

export async function openStarterChestAction(): Promise<OpenStarterResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const repository = getRepository();
  const progress = await repository.getProgress(session.playerId);

  // Le coffre d'inscription ne s'ouvre qu'une fois. Cette vérification est
  // une commodité : l'idempotence en base reste le garde-fou réel.
  if (progress.starterChestOpened) {
    return { ok: false, error: 'Ton coffre d\'inscription est déjà ouvert.' };
  }

  const result = openStarterChest(CHARACTERS, secureRandom);

  const application = await repository.applyChestOpening({
    playerId: session.playerId,
    kind: 'STARTER',
    cards: result.cards,
    pityCounter: result.pityCounter,
    pityTriggered: result.pityTriggered,
    // §92 : clé **stable**, pas aléatoire. C'est ce qui rend l'opération
    // réellement idempotente : deux requêtes simultanées portent la même clé,
    // la contrainte d'unicité en base n'en laisse aboutir qu'une.
    clientRequestId: `starter:${session.playerId}`,
  });

  if (application === 'already-applied') {
    return { ok: false, error: 'Ce coffre a déjà été ouvert.' };
  }

  revalidatePath('/collection');
  return { ok: true, cards: reveal(result.cards) };
}

/**
 * Ouvre un coffre déjà possédé (récompense hebdomadaire ou achat).
 *
 * Le coffre est consommé **avant** le tirage : si la consommation échoue,
 * aucun tirage n'a lieu. L'inverse laisserait la porte ouverte à l'obtention
 * de cartes sans coffre.
 */
export async function openOwnedChestAction(): Promise<OpenStarterResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const repository = getRepository();

  if (!(await repository.consumeChest(session.playerId))) {
    return { ok: false, error: 'Tu n\'as aucun coffre à ouvrir.' };
  }

  const owned = new Set(await repository.getOwnedCharacterIds(session.playerId));
  const progress = await repository.getProgress(session.playerId);

  const result = openChest({
    roster: CHARACTERS,
    owned,
    pityCounter: progress.pityCounter,
    random: secureRandom,
  });

  await repository.applyChestOpening({
    playerId: session.playerId,
    kind: 'WEEKLY',
    cards: result.cards,
    pityCounter: result.pityCounter,
    pityTriggered: result.pityTriggered,
    // Le coffre est déjà consommé : la clé sert à tracer, pas à dédoublonner.
    clientRequestId: `chest:${session.playerId}:${randomUUID()}`,
  });

  revalidatePath('/collection');
  return { ok: true, cards: reveal(result.cards) };
}

export type ShopResult = { ok: true } | { ok: false; error: string };

/**
 * Achat d'un coffre à la boutique (cahier §36), en Berries uniquement.
 *
 * Le cahier §48 est net : la monnaie donne accès à de la collection, jamais à
 * un avantage de score. Un coffre entre exactement dans ce cadre.
 */
export async function buyChestAction(): Promise<ShopResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const repository = getRepository();
  const wallet = await repository.getWallet(session.playerId);

  if (wallet.berries < CHEST_PRICE_BERRIES) {
    return { ok: false, error: 'Berries insuffisantes.' };
  }

  // §93 : la version lue est repassée telle quelle. Si une autre requête a
  // dépensé entre-temps, le débit est refusé plutôt que d'être appliqué deux
  // fois sur le même solde.
  const debited = await repository.spendBerries(
    session.playerId,
    CHEST_PRICE_BERRIES,
    wallet.version,
  );

  if (!debited) {
    return {
      ok: false,
      error: 'Ton solde vient de changer. Réessaie.',
    };
  }

  await repository.grantBerriesAndChests(session.playerId, 0, 1);

  revalidatePath('/collection');
  return { ok: true };
}

export type CraftResult = { ok: true } | { ok: false; error: string };

/** Fabrication d'un personnage avec des fragments (cahier §29). */
export async function craftCharacterAction(
  characterId: unknown,
): Promise<CraftResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsed = z.string().min(1).max(64).safeParse(characterId);
  if (!parsed.success) return { ok: false, error: 'Personnage inconnu.' };

  const character = CHARACTER_INDEX.get(parsed.data);
  const repository = getRepository();

  const owned = new Set(await repository.getOwnedCharacterIds(session.playerId));
  const shards = await repository.getShards(session.playerId);

  const decision = evaluateCraft({
    rarity: character?.rarity ?? null,
    owned: owned.has(parsed.data),
    shards: shards.get(parsed.data) ?? 0,
  });

  if (!decision.allowed) {
    return { ok: false, error: describeCraftRefusal(decision.reason) };
  }

  const crafted = await repository.craftCharacter(
    session.playerId,
    parsed.data,
    decision.cost,
  );

  if (!crafted) {
    return { ok: false, error: 'Tes fragments viennent de changer. Réessaie.' };
  }

  revalidatePath('/collection');
  return { ok: true };
}
