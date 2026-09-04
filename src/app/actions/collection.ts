'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CHARACTERS, CHARACTER_INDEX } from '@/data/characters';
import { attributesOf, type Attribute } from '@/domain/collection/attributes';
import {
  openChest,
  openStarterChest,
  ROYAL_CHEST_SLOTS,
  type ChestCard,
} from '@/domain/collection/chest';
import {
  describeCraftRefusal,
  evaluateCraft,
} from '@/domain/collection/crafting';
import { CHEST_PRICE_BERRIES } from '@/domain/collection/rewards';
import { isAllowedAdmin, requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import {
  consumeQuotaByPlayer,
  throttleMessage,
} from '@/lib/auth/action-throttle';
import { getRepository } from '@/lib/repository';
import { recordEvent } from '@/lib/antiabuse/events';

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
  /**
   * Symboles d'attributs, calculés **côté serveur**.
   *
   * Pour les dériver, le navigateur aurait dû connaître les capacités et les
   * affiliations de chaque personnage — donc embarquer le référentiel entier.
   * Quatre pictogrammes ne valent pas 235 Ko de bundle.
   */
  attributes: Attribute[];
}

export type OpenStarterResult =
  | { ok: true; cards: RevealedCard[]; royal?: boolean }
  | { ok: false; error: string };

/** Joint le nom de chaque carte, côté serveur. */
function reveal(cards: ChestCard[]): RevealedCard[] {
  return cards.map((card) => {
    const character = CHARACTER_INDEX.get(card.characterId);
    return {
      ...card,
      name: character?.name ?? card.characterId,
      attributes: character ? attributesOf(character) : [],
    };
  });
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

  // Le frein de cadence. L'idempotence en base reste le garde-fou réel — elle
  // interdit d'ouvrir deux fois le même coffre ; celui-ci interdit d'essayer
  // mille fois par seconde, ce qui est un coût serveur même quand ça échoue.
  const cadence = await consumeQuotaByPlayer('coffre', session.playerId);
  if (!cadence.autorise) return { ok: false, error: throttleMessage(cadence) };

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

  // **Aucune revalidation ici**, et c'est le point important.
  //
  // Elle recalculait la page dans la foulée du tirage. Le nouvel arbre serveur
  // remplaçait alors le composant qui joue la cérémonie — un coffre ouvert
  // n'est plus « à ouvrir », donc la page rendait un autre panneau — et
  // l'animation disparaissait avant d'avoir commencé. Les cartes étaient bien
  // en base ; le joueur, lui, n'avait rien vu.
  //
  // Le rafraîchissement est demandé par le client, à la fin de la révélation.
  await recordEvent(session.playerId, 'WELCOME_CHEST_OPENED', {
    cards: result.cards.length,
  });

  return { ok: true, cards: reveal(result.cards) };
}

/**
 * Ouvre un coffre déjà possédé (récompense hebdomadaire ou achat).
 *
 * Le coffre est consommé **avant** le tirage : si la consommation échoue,
 * aucun tirage n'a lieu. L'inverse laisserait la porte ouverte à l'obtention
 * de cartes sans coffre.
 */
/**
 * Ouvre un coffre possédé — ordinaire ou royal.
 *
 * Le type est un **paramètre validé**, pas une confiance : le client demande,
 * le serveur vérifie que la réserve correspondante existe. Sans cela,
 * réclamer `ROYAL` suffirait à obtenir un Légendaire garanti sans l'avoir
 * acheté.
 */
export async function openOwnedChestAction(
  kind: unknown = 'WEEKLY',
): Promise<OpenStarterResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsedKind = z.enum(['WEEKLY', 'ROYAL']).safeParse(kind);
  if (!parsedKind.success) return { ok: false, error: 'Coffre inconnu.' };
  const royal = parsedKind.data === 'ROYAL';

  const cadence = await consumeQuotaByPlayer('coffre', session.playerId);
  if (!cadence.autorise) return { ok: false, error: throttleMessage(cadence) };

  const repository = getRepository();

  // Ouverture illimitée pour l'administrateur.
  //
  // Le privilège est décidé **côté serveur**, à partir de la session et de la
  // liste d'autorisation — jamais d'un paramètre de requête. Sans cela, un
  // joueur pourrait se déclarer administrateur et ouvrir des coffres à
  // volonté. C'est aussi pour cela qu'on ne se contente pas du rôle en base :
  // `isAllowedAdmin` exige en plus l'adresse déclarée dans l'environnement.
  //
  // Le privilège ne s'étend **pas** aux coffres royaux : ils sont payés, et
  // les distribuer gratuitement fausserait le rapprochement comptable.
  const unlimited = (await isAllowedAdmin()) && !royal;

  const consumed = royal
    ? await repository.consumeRoyalChest(session.playerId)
    : unlimited || (await repository.consumeChest(session.playerId));

  if (!consumed) {
    return {
      ok: false,
      error: royal
        ? 'Tu n\'as aucun coffre royal à ouvrir.'
        : 'Tu n\'as aucun coffre à ouvrir.',
    };
  }

  const owned = new Set(await repository.getOwnedCharacterIds(session.playerId));
  const progress = await repository.getProgress(session.playerId);

  const result = openChest({
    roster: CHARACTERS,
    owned,
    pityCounter: progress.pityCounter,
    random: secureRandom,
    ...(royal ? { slots: ROYAL_CHEST_SLOTS } : {}),
  });

  await repository.applyChestOpening({
    playerId: session.playerId,
    kind: royal ? 'ROYAL' : 'WEEKLY',
    cards: result.cards,
    pityCounter: result.pityCounter,
    pityTriggered: result.pityTriggered,
    // Le coffre est déjà consommé : la clé sert à tracer, pas à dédoublonner.
    clientRequestId: `chest:${session.playerId}:${randomUUID()}`,
  });

  // **Aucune revalidation ici**, et c'est le point important.
  //
  // Elle recalculait la page dans la foulée du tirage. Le nouvel arbre serveur
  // remplaçait alors le composant qui joue la cérémonie — un coffre ouvert
  // n'est plus « à ouvrir », donc la page rendait un autre panneau — et
  // l'animation disparaissait avant d'avoir commencé. Les cartes étaient bien
  // en base ; le joueur, lui, n'avait rien vu.
  //
  // Le rafraîchissement est demandé par le client, à la fin de la révélation.
  await recordEvent(session.playerId, 'CHEST_OPENED', {
    cards: result.cards.length,
    royal,
  });

  return { ok: true, cards: reveal(result.cards), royal };
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

  const cadence = await consumeQuotaByPlayer('fabrication', session.playerId);
  if (!cadence.autorise) return { ok: false, error: throttleMessage(cadence) };

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
