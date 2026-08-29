import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { MainNav } from '@/components/MainNav';
import { ChestPanel } from '@/components/ChestPanel';
import { chestOdds } from '@/domain/collection/odds';
import { CraftButton } from '@/components/CraftButton';
import { RarityCard } from '@/components/RarityCard';
import { attributesOf } from '@/domain/collection/attributes';
import { CHARACTERS, CHARACTER_INDEX } from '@/data/characters';
import { allSetsProgress, collectionSummary } from '@/domain/collection/sets';
import { RARITY_COLOR, RARITY_LABEL, rarityRank } from '@/domain/collection/rarity';
import { CRAFT_COST } from '@/domain/collection/crafting';
import { isAllowedAdmin, requireSession } from '@/lib/auth/guards';
import { getRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

/** Nombre d'avis de recherche affichés (§68). */
const MOST_WANTED_SHOWN = 24;

export const metadata: Metadata = {
  title: 'Collection',
  robots: { index: false, follow: false },
};

/**
 * Collection (cahier §22, §67, §68).
 *
 * Le but est que le joueur pense « je veux CE personnage », pas « je veux
 * ouvrir plus de coffres ». D'où la place donnée aux manquants : la liste des
 * absents est la vraie source de motivation (§67).
 */
export default async function CollectionPage() {
  const session = await requireSession();
  const repository = getRepository();

  // Quatre requêtes **en parallèle**. Enchaînées, elles cumulaient leurs
  // allers-retours : chacune attendait la précédente sans en avoir besoin.
  //
  // `getCardIdentities` porte déjà l'identifiant de chaque carte : on en dérive
  // la liste des personnages possédés au lieu d'interroger `inventory` une
  // seconde fois pour la même information.
  const [cards, shards, progress, wallet, unlimited] = await Promise.all([
    repository.getCardIdentities(session.playerId),
    repository.getShards(session.playerId),
    repository.getProgress(session.playerId),
    repository.getWallet(session.playerId),
    isAllowedAdmin(),
  ]);

  const ownedIds = cards.map((card) => card.characterId);
  const owned = new Set(ownedIds);
  const identities = new Map(cards.map((card) => [card.characterId, card]));

  const summary = collectionSummary(CHARACTERS, owned);
  const sets = allSetsProgress(CHARACTERS, owned);

  // Manquants (§68). Le référentiel compte des centaines de personnages : tout
  // afficher produirait une page interminable et illisible. On montre les plus
  // rares d'abord — ce sont eux qui donnent envie — et on annonce le reste.
  const missingAll = CHARACTERS.filter((character) => !owned.has(character.id));
  const missing = [...missingAll]
    .sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity))
    .slice(0, MOST_WANTED_SHOWN);

  return (
    <HarborScene variant="page">
      <p className="hb-eyebrow">
        Captain&apos;s log
      </p>
      <h1 className="hb-title mt-1">Collection</h1>

      <p className="hb-muted mt-3 font-mono text-sm">
        <span className="hb-num text-2xl">{summary.owned}</span> /{' '}
        {summary.total} personnages · {summary.percent}%
      </p>

      <div className="mt-6">
        <ChestPanel
          starterAvailable={!progress.starterChestOpened}
          unlimited={unlimited}
          unopenedChests={progress.unopenedChests}
          pityCounter={progress.pityCounter}
          berries={wallet.berries}
          odds={chestOdds(CHARACTERS)}
        />
      </div>

      {/* Possédés */}
      {ownedIds.length > 0 && (
        <section className="mt-8">
          <h2 className="hb-legend">
            Ton équipage
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {ownedIds.map((id) => {
              const character = CHARACTER_INDEX.get(id);
              if (!character) return null;
              const identity = identities.get(id);
              return (
                <li key={id}>
                  <RarityCard
                    name={character.name}
                    rarity={character.rarity}
                    attributes={attributesOf(character)}
                    serial={
                      /* Identité de l'exemplaire : ce code suit la carte, y
                         compris lorsqu'elle change de propriétaire au Market. */
                      identity?.serialCode ? (
                        <span className="hb-serial">
                          {identity.serialCode}
                          {identity.mintNumber !== null && (
                            <span className="hb-num"> · n°{identity.mintNumber}</span>
                          )}
                        </span>
                      ) : null
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Fragments (§29) : un doublon n'est jamais perdu. */}
      {shards.size > 0 && (
        <section className="mt-8">
          <h2 className="hb-legend">
            Fragments
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            {[...shards.entries()].map(([id, amount]) => (
              <li key={id} className="flex justify-between">
                <span>{CHARACTER_INDEX.get(id)?.name ?? id}</span>
                <span className="hb-num">✨ {amount}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sets (§33) — récompenses cosmétiques uniquement. */}
      <section className="mt-8">
        <h2 className="hb-legend">
          Sets
        </h2>
        <ul className="mt-3 space-y-2">
          {sets.map((entry) => (
            <li
              key={entry.set.id}
              className="hb-card"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{entry.set.name}</span>
                <span className="hb-muted font-mono text-xs">
                  {entry.owned.length}/{entry.total}
                </span>
              </div>
              <div className="hb-gauge mt-2" style={{ height: '0.4rem' }}>
                <div
                  className={`h-full rounded-full ${
                    entry.complete ? 'bg-[#f5c542]' : 'bg-[#2f8f8b]'
                  }`}
                  style={{
                    width: `${entry.total ? (entry.owned.length / entry.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="hb-muted mt-2 text-[11px]">
                {entry.complete ? `✅ ${entry.set.reward}` : entry.set.reward}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Manquants, présentés en avis de recherche (§68). */}
      {missing.length > 0 && (
        <section className="mt-8">
          <h2 className="hb-legend">
            Most wanted
          </h2>
          <p className="hb-muted mt-1 text-xs">
            {missingAll.length} personnage{missingAll.length > 1 ? 's' : ''} à
            trouver — les {missing.length} plus rares ci-dessous.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {missing.map((character) => (
              <li
                key={character.id}
                className="hb-wanted"
              >
                <span className="hb-legend block">
                  Wanted
                </span>
                <span className="mt-1 block text-sm font-semibold">
                  {character.name}
                </span>
                <span
                  className="hb-legend mt-0.5 block"
                  style={{ color: RARITY_COLOR[character.rarity] }}
                >
                  {RARITY_LABEL[character.rarity]}
                </span>
                <CraftButton
                  characterId={character.id}
                  shards={shards.get(character.id) ?? 0}
                  cost={CRAFT_COST[character.rarity]}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <MainNav />
    </HarborScene>
  );
}
