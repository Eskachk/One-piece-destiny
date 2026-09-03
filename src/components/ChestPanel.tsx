'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import {
  buyChestAction,
  openOwnedChestAction,
  openStarterChestAction,
  type OpenStarterResult,
} from '@/app/actions/collection';
import { ChestOpening } from '@/components/chest3d/ChestOpening';
import { ChestOdds } from '@/components/ChestOdds';
import type { RarityOdds } from '@/domain/collection/odds';
import {
  PITY_THRESHOLD,
  STARTER_CHEST_SLOTS,
} from '@/domain/collection/chest';
import { CHEST_PRICE_BERRIES } from '@/domain/collection/rewards';

/**
 * Coffres : inscription, réserve et boutique (cahier §26, §27, §31, §36, §113).
 *
 * **Un seul composant pour le coffre d'inscription et les suivants**, et c'est
 * la condition pour que la cérémonie existe.
 *
 * Ils étaient séparés : la page rendait `StarterChest` tant que le coffre
 * d'inscription n'était pas ouvert, puis `ChestPanel`. Or toute action serveur
 * rafraîchit la route courante — c'est le comportement de Next, indépendamment
 * de `revalidatePath`. L'ouverture faisait donc basculer la page d'un composant
 * à l'autre, et le composant qui jouait l'animation était démonté à la seconde
 * même où elle commençait. Les cinq cartes étaient bien en base ; le joueur ne
 * voyait qu'un panneau changer.
 *
 * Un composant unique reste monté à travers le rafraîchissement : seules ses
 * données changent, son état — donc la révélation en cours — survit.
 *
 * La règle de pitié et les probabilités sont affichées en permanence, jamais
 * enfouies dans des conditions générales (§31, §113).
 */
export function ChestPanel({
  starterAvailable,
  unlimited,
  unopenedChests,
  pityCounter,
  berries,
  pendingBerries,
  royalChests,
  odds,
}: {
  /** Le coffre d'inscription n'a pas encore été ouvert (§27). */
  starterAvailable: boolean;
  /**
   * Ouverture illimitée (compte administrateur).
   *
   * Ce n'est qu'un affichage : le serveur revérifie le privilège à chaque
   * ouverture. Un joueur qui forcerait ce booléen dans son navigateur ne
   * gagnerait qu'un bouton actif et un refus.
   */
  unlimited: boolean;
  unopenedChests: number;
  pityCounter: number;
  berries: number;
  /** Dotation d'arrivée pas encore libérée (§43). */
  pendingBerries: number;
  /** Coffres royaux achetés en boutique, en attente d'ouverture. */
  royalChests: number;
  /** Calculées côté serveur depuis les constantes du tirage (§113). */
  odds: RarityOdds[];
}) {
  const [result, setResult] = useState<OpenStarterResult | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<OpenStarterResult>) => {
    startTransition(async () => {
      setShopError(null);
      setResult(await attempt(action()));
    });
  };

  const buy = () => {
    startTransition(async () => {
      setResult(null);
      const outcome = await attempt(buyChestAction());
      setShopError(outcome.ok ? null : outcome.error);
    });
  };

  const remainingToPity = Math.max(0, PITY_THRESHOLD - pityCounter);

  // Le coffre d'inscription reste affiché tant qu'il n'a pas été ouvert. Une
  // fois la cérémonie lancée, on passe au panneau ordinaire — mais sans
  // démonter quoi que ce soit, donc sans interrompre la révélation.
  const showStarter = starterAvailable && result === null;

  return (
    <section className="rounded-xl hb-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl hb-ink">
          {showStarter ? 'Coffre d’inscription' : 'Coffres'}
        </h2>
        <span className="font-mono text-sm hb-gold">🪙 {berries}</span>
      </div>

      {/* Dotation d'arrivée en attente.
          Elle est annoncée, jamais dissimulée : le joueur voit ce qu'il a, ce
          qu'il aura, et à quelle condition. La taire ferait passer un compte
          neuf pour un compte vide — et laisserait croire à une promesse non
          tenue au moment où l'on cherche justement à donner confiance. */}
      {pendingBerries > 0 && (
        <p className="mt-2 rounded-lg border hb-border hb-hi px-3 py-2 text-xs hb-ink">
          <strong className="hb-num">{pendingBerries} Berries</strong> t’attendent.
          Elles se débloquent dès que tu verrouilles ton premier équipage.
        </p>
      )}

      {showStarter ? (
        <>
          {/* Contenu annoncé **avant** ouverture (§113). Le nombre est dérivé
              des emplacements, pas écrit à la main : c'est la seule façon
              qu'il ne mente jamais. Il a déjà annoncé cinq personnages pour un
              coffre qui en donnait trois. */}
          <ul className="mt-3 space-y-1 text-sm hb-ink-soft">
            <li>• {STARTER_CHEST_SLOTS.length} personnages, tous différents</li>
            <li>• au moins un Rare ou mieux</li>
            <li>• un doublon rapporte toujours des fragments</li>
          </ul>

          <p className="mt-3 text-xs hb-ink-soft">
            La rareté détermine la valeur de collection, pas la puissance en
            jeu : un personnage commun peut être excellent pour une stratégie.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm hb-ink-soft">
            {unopenedChests > 0
              ? `${unopenedChests} coffre${unopenedChests > 1 ? 's' : ''} à ouvrir.`
              : unlimited
                ? 'Réserve illimitée — compte administrateur.'
                : 'Aucun coffre en réserve.'}
          </p>

          {/* §31 : la garantie est annoncée, jamais découverte après coup. */}
          <p className="mt-1 text-xs hb-ink-soft">
            {remainingToPity === 0
              ? '✨ Ton prochain coffre garantit un légendaire.'
              : `Légendaire garanti dans ${remainingToPity} coffre${remainingToPity > 1 ? 's' : ''} au plus tard.`}
          </p>
        </>
      )}

      {result?.ok && (
        <div className="mt-4">
          <ChestOpening cards={result.cards} royal={Boolean(result.royal)} />
        </div>
      )}

      {result && !result.ok && (
        <p role="alert" className="mt-3 text-sm hb-ko">
          {result.error}
        </p>
      )}
      {shopError && (
        <p role="alert" className="mt-3 text-sm hb-ko">
          {shopError}
        </p>
      )}

      <div className="mt-4 space-y-2">
        {showStarter ? (
          <button
            type="button"
            onClick={() => run(openStarterChestAction)}
            disabled={pending}
            aria-busy={pending}
            className="transition-quick w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50"
          >
            {pending ? 'Ouverture…' : 'Ouvrir le coffre'}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => run(() => openOwnedChestAction('WEEKLY'))}
              disabled={pending || (!unlimited && unopenedChests === 0)}
              aria-busy={pending}
              className="transition-quick w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50 disabled:hb-ink-soft"
            >
              {pending ? 'Un instant…' : 'Ouvrir un coffre'}
            </button>

            {/* Coffre royal : bouton distinct, et seulement s'il y en a un.
                Le fondre dans « Ouvrir un coffre » aurait fait consommer un
                coffre payé à la place d'un coffre hebdomadaire. */}
            {royalChests > 0 && (
              <button
                type="button"
                onClick={() => run(() => openOwnedChestAction('ROYAL'))}
                disabled={pending}
                aria-busy={pending}
                className="hb-royal-btn transition-quick w-full rounded-xl px-4 py-3 font-semibold disabled:opacity-50"
              >
                Ouvrir un coffre royal ({royalChests})
              </button>
            )}

            <button
              type="button"
              onClick={buy}
              disabled={pending || berries < CHEST_PRICE_BERRIES}
              aria-busy={pending}
              className="transition-quick w-full rounded-xl border hb-border px-4 py-2 text-sm hb-accent disabled:opacity-40"
            >
              Acheter un coffre — {CHEST_PRICE_BERRIES} 🪙
            </button>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] hb-ink-soft">
        Les Berries n&apos;achètent que de la collection : aucun bonus de score
        n&apos;est en vente.
      </p>

      {/* §113 : la composition et les taux sont annoncés avant l'achat. */}
      <ChestOdds odds={odds} />
    </section>
  );
}
