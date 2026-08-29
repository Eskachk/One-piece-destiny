'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import {
  openStarterChestAction,
  type OpenStarterResult,
} from '@/app/actions/collection';
import { ChestOpening } from '@/components/chest3d/ChestOpening';
import { STARTER_CHEST_SLOTS } from '@/domain/collection/chest';

/**
 * Coffre d'inscription (cahier §26, §27, §113).
 *
 * La composition est annoncée **avant** l'ouverture, et le nombre est dérivé
 * de `STARTER_CHEST_SLOTS` — pas écrit à la main. Le texte annonçait « 5
 * personnages » alors que le coffre en donnait 3 : un écart entre ce qu'on
 * promet et ce qu'on donne est exactement ce que le §113 interdit.
 *
 * Le cahier l'exige pour les coffres payants,
 * autant l'appliquer partout — un joueur ne devrait jamais découvrir les
 * règles après coup.
 *
 * Le tirage lui-même est fait par le serveur ; ce composant ne fait
 * qu'afficher ce qu'il reçoit.
 */
export function StarterChest() {
  const [result, setResult] = useState<OpenStarterResult | null>(null);
  const [pending, startTransition] = useTransition();

  const open = () => {
    startTransition(async () => {
      setResult(await attempt(openStarterChestAction()));
    });
  };

  if (result?.ok) {
    return (
      <section className="rounded-xl border hb-border hb-hi p-5">
        <h2 className="font-display text-xl hb-ink">
          Ton équipage de départ
        </h2>
        <div className="mt-4">
          <ChestOpening cards={result.cards} />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl hb-surface p-5">
      <h2 className="font-display text-xl hb-ink">
        Coffre d&apos;inscription
      </h2>

      {/* Contenu annoncé avant ouverture (§113). */}
      <ul className="mt-3 space-y-1 text-sm hb-ink-soft">
        <li>• {STARTER_CHEST_SLOTS.length} personnages, tous différents</li>
        <li>• au moins un Rare ou mieux</li>
        <li>• un doublon rapporte toujours des fragments</li>
      </ul>

      <p className="mt-3 text-xs hb-ink-soft">
        La rareté détermine la valeur de collection, pas la puissance en jeu :
        un personnage commun peut être excellent pour une stratégie.
      </p>

      {result && !result.ok && (
        <p role="alert" className="mt-3 text-sm hb-ko">
          {result.error}
        </p>
      )}

      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="transition-quick mt-4 w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50"
      >
        {pending ? 'Ouverture…' : 'Ouvrir le coffre'}
      </button>
    </section>
  );
}
