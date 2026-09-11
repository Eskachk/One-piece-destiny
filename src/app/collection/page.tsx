import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { islandOf } from '@/domain/islands';
import { Nav } from '@/components/Nav';
import { Tutorial } from '@/components/Tutorial';
import { ChestPanel } from '@/components/ChestPanel';
import { chestOdds } from '@/domain/collection/odds';
import { CraftButton } from '@/components/CraftButton';
import { RarityCard } from '@/components/RarityCard';
import { OwnedCollection } from '@/components/OwnedCollection';
import {
  attributesOf,
  catalogueAttributs,
} from '@/domain/collection/attributes';
import { getCachedRecurrences } from '@/lib/cache';
import { CHARACTERS, CHARACTER_INDEX } from '@/data/characters';
import { allSetsProgress, collectionSummary } from '@/domain/collection/sets';
import { RARITY_COLOR, rarityRank } from '@/domain/collection/rarity';
import { CRAFT_COST } from '@/domain/collection/crafting';
import { isAllowedAdmin, requireSession } from '@/lib/auth/guards';
import { getRepository } from '@/lib/repository';
import { AdBanner } from '@/components/AdBanner';
import { traduire } from '@/lib/i18n';
import { libelleRarete, libelleSet, libelleSetRecompense } from '@/domain/i18n/libelles';

export const dynamic = 'force-dynamic';

/** Nombre d'avis de recherche affichés (§68). */
const MOST_WANTED_SHOWN = 24;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return { title: t('col.meta.title'), robots: { index: false, follow: false } };
}

/**
 * Collection (cahier §22, §67, §68).
 *
 * Le but est que le joueur pense « je veux CE personnage », pas « je veux
 * ouvrir plus de coffres ». D'où la place donnée aux manquants : la liste des
 * absents est la vraie source de motivation (§67).
 */
export default async function CollectionPage() {
  /*
   * La récurrence part **avec** la session, pas après.
   *
   * C'est un fait sur l'œuvre — qui est apparu dans les dix derniers
   * chapitres — donc il ne dépend ni du compte ni de rien d'autre. Il était
   * pourtant lu dans une troisième vague, après la collection : un
   * aller-retour complet, de cent millisecondes, ajouté à la page pour une
   * donnée qu'on pouvait demander tout de suite.
   *
   * `requireSession` peut rediriger ; c'est sans importance ici, la lecture
   * partie en parallèle est simplement abandonnée.
   */
  const [session, recurrence, { t, tn }] = await Promise.all([
    requireSession(),
    getCachedRecurrences(),
    traduire(),
  ]);
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

  /*
   * Les personnages possédés, pour le catalogue de filtres.
   *
   * Le catalogue ne se construit **que sur la collection du joueur** : offrir
   * « 🕯 Décédé » à quelqu'un qui n'en possède aucun, c'est offrir un filtre
   * dont le seul résultat possible est une grille vide.
   */
  const possedes = ownedIds.flatMap((id) => {
    const character = CHARACTER_INDEX.get(id);
    return character ? [character] : [];
  });
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
    <HarborScene variant="page" island={islandOf('/collection')}>
      <p className="hb-eyebrow">{t('brand')}</p>
      <h1 className="hb-title mt-1">{t('col.title')}</h1>

      <p className="hb-muted mt-3 font-mono text-sm">
        <span className="hb-num text-2xl">{summary.owned}</span> /{' '}
        {t('col.summary', { total: summary.total, percent: summary.percent })}
      </p>

      <div className="mt-6">
        <ChestPanel
          starterAvailable={!progress.starterChestOpened}
          unlimited={unlimited}
          unopenedChests={progress.unopenedChests}
          pityCounter={progress.pityCounter}
          berries={wallet.berries}
          pendingBerries={wallet.pendingBerries}
          royalChests={wallet.royalChests}
          odds={chestOdds(CHARACTERS)}
        />
      </div>

      {/* Possédés */}
      {ownedIds.length > 0 && (
        <section className="mt-8">
          {/* « Ton équipage » désignait ici les cartes possédées, alors que
              l'équipage est la sélection de trois qu'on compose sur l'accueil.
              Deux choses pour un seul mot : on ne savait plus laquelle on
              regardait. */}
          <h2 className="hb-legend">{t('col.owned')}</h2>
          {/* Les cartes sont dessinées ici, par le serveur, puis remises à
              `OwnedCollection` qui se contente de choisir lesquelles montrer.
              Les dessiner côté navigateur enverrait `CharacterArt` et la table
              des signatures physiques à chaque joueur, pour un travail déjà
              fait. Seuls le nom et la rareté traversent — c'est tout ce dont
              le tri a besoin. */}
          <OwnedCollection
            attributs={catalogueAttributs(possedes)}
            cartes={ownedIds.flatMap((id) => {
              const character = CHARACTER_INDEX.get(id);
              if (!character) return [];
              const identity = identities.get(id);
              const attributs = attributesOf(character);
              return [
                {
                  id: character.id,
                  name: character.name,
                  rarity: character.rarity,
                  // Les identifiants seuls traversent : le libellé et le
                  // pictogramme partent une fois, dans le catalogue.
                  attributs: attributs.map((attribut) => attribut.id),
                  vue: (
                    <RarityCard
                      characterId={character.id}
                      name={character.name}
                      rarity={character.rarity}
                      attributes={attributs}
                      recurrence={recurrence.get(character.id)}
                      serial={
                        /* Identité de l'exemplaire : ce code suit la carte, y
                           compris lorsqu'elle change de propriétaire au Market. */
                        identity?.serialCode ? (
                          <span className="hb-serial">
                            {identity.serialCode}
                            {identity.mintNumber !== null && (
                              <span className="hb-num">{t('col.serial.mint', { n: identity.mintNumber })}</span>
                            )}
                          </span>
                        ) : null
                      }
                    />
                  ),
                },
              ];
            })}
          />
        </section>
      )}

      {/*
        Fragments (§28, §29) : la réserve, et ce qu'elle ouvre.

        Elle était détaillée personnage par personnage — « ✨ 240 sur Nami » —
        ce qui décrivait exactement le défaut : ces fragments-là ne pouvaient
        rien acheter, puisque fabriquer un personnage exige de ne pas le
        posséder et qu'on ne gagne ses fragments qu'en le possédant. Un seul
        total, et la liste de ce qu'il permet.
      */}
      {shards > 0 && (
        <section className="mt-8">
          <h2 className="hb-legend">{t('col.shards')}</h2>
          <p className="hb-card mt-3">
            <span className="hb-num" style={{ fontSize: '1.8rem' }}>✨ {shards}</span>
            <span className="hb-muted ml-2 text-xs">{t('col.shards.hint')}</span>
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
            {(['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const).map(
              (rarity) => (
                <li key={rarity} className="hb-tile">
                  <span
                    className="hb-legend block"
                    style={{ color: RARITY_COLOR[rarity] }}
                  >
                    {libelleRarete(t, rarity)}
                  </span>
                  <span className="hb-num mt-0.5 block">
                    {CRAFT_COST[rarity]}
                  </span>
                  <span className="hb-muted block">
                    {shards >= CRAFT_COST[rarity]
                      ? t('col.shards.ready')
                      : t('col.shards.missing', { n: CRAFT_COST[rarity] - shards })}
                  </span>
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {/* Sets (§33) — récompenses cosmétiques uniquement. */}
      <section className="mt-8">
        <h2 className="hb-legend">{t('col.sets')}</h2>
        <p className="hb-muted mt-1 text-xs">{t('col.sets.note')}</p>
        <ul className="mt-3 space-y-2">
          {sets.map((entry) => (
            <li
              key={entry.set.id}
              className="hb-card"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">{libelleSet(t, entry.set.id)}</span>
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
                {entry.complete
                  ? `✅ ${libelleSetRecompense(t, entry.set.id)}`
                  : libelleSetRecompense(t, entry.set.id)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Manquants, présentés en avis de recherche (§68). */}
      {missing.length > 0 && (
        <section className="mt-8">
          <h2 className="hb-legend">{t('col.wanted')}</h2>
          <p className="hb-muted mt-1 text-xs">
            {tn('col.wanted.hint', missingAll.length, { shown: missing.length })}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {missing.map((character) => (
              <li
                key={character.id}
                className="hb-wanted"
              >
                <span className="hb-legend block">{t('col.wanted.tag')}</span>
                <span className="mt-1 block text-sm font-semibold">
                  {character.name}
                </span>
                <span
                  className="hb-legend mt-0.5 block"
                  style={{ color: RARITY_COLOR[character.rarity] }}
                >
                  {libelleRarete(t, character.rarity)}
                </span>
                <CraftButton
                  characterId={character.id}
                  shards={shards}
                  cost={CRAFT_COST[character.rarity]}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      <AdBanner />
      <Tutorial page="collection" />
      <Nav />
    </HarborScene>
  );
}
