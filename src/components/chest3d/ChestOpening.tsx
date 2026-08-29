'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import type { RevealedCard } from '@/app/actions/collection';
import {
  ceremonyPlan,
  reducedMotionPlan,
} from '@/domain/collection/chest-ceremony';
import { RARITY_LABEL } from '@/domain/collection/rarity';

/**
 * Enveloppe de l'ouverture 3D (cahier §56, §57, §111).
 *
 * Le module 3D est chargé **dynamiquement et sans rendu serveur**. C'est ce
 * qui permet de tenir le §57 : les pages courantes ne portent pas le poids de
 * Three.js, il n'arrive que si un coffre s'ouvre vraiment.
 *
 * Trois raisons de sauter la 3D, toutes traitées : la préférence
 * « mouvement réduit » (§111), l'absence de WebGL, et l'échec de chargement du
 * module. Dans les trois cas le joueur voit quand même ses cartes — la
 * révélation lui est due.
 */

const ChestScene = dynamic(() => import('./ChestScene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-parchment/40">
      Préparation du coffre…
    </div>
  ),
});

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
    );
  } catch {
    return false;
  }
}

export function ChestOpening({
  cards,
  onDone,
}: {
  cards: RevealedCard[];
  onDone?: () => void;
}) {
  // Décidé après montage : `matchMedia` et WebGL n'existent pas côté serveur,
  // et les interroger au premier rendu casserait l'hydratation.
  const [mode, setMode] = useState<'pending' | 'scene' | 'plain'>('pending');
  const [revealed, setRevealed] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    setMode(reduced || !supportsWebGL() ? 'plain' : 'scene');
    if (reduced) setRevealed(true);
  }, []);

  const plan = useMemo(
    () => (mode === 'plain' ? reducedMotionPlan(cards) : ceremonyPlan(cards)),
    [cards, mode],
  );

  // Filet de sécurité : la révélation est due au joueur, quoi qu'il arrive à
  // la 3D.
  //
  // `sceneReady` vient du premier `useFrame`. Si la boucle de rendu ne démarre
  // pas, elle n'arrive jamais — et le joueur reste devant un cadre vide, sans
  // ses cartes, alors que le coffre a bien été consommé côté serveur. Le cas a
  // été observé : dans un environnement où `ResizeObserver` ne se déclenche
  // pas, le canvas garde sa taille par défaut et la scène ne tourne jamais.
  // Le contexte WebGL perdu et une machine très lente produisent le même
  // symptôme.
  //
  // Au bout de quelques secondes sans première image, on abandonne la 3D et on
  // montre les cartes : perdre l'animation est acceptable, perdre la
  // récompense ne l'est pas.
  useEffect(() => {
    if (mode !== 'scene' || sceneReady || revealed) return;
    const timer = setTimeout(() => setMode('plain'), 4000);
    return () => clearTimeout(timer);
  }, [mode, sceneReady, revealed]);

  useEffect(() => {
    // En mode dégradé il n'y a pas de scène à attendre.
    if (mode === 'pending' || revealed) return;
    if (mode === 'scene' && !sceneReady) return;

    const timer = setTimeout(
      () => {
        setRevealed(true);
        onDone?.();
      },
      plan.totalSeconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [mode, plan.totalSeconds, revealed, sceneReady, onDone]);

  return (
    <div>
      {mode === 'scene' && !revealed && (
        <div className="h-64 w-full overflow-hidden rounded-xl bg-abyss/60">
          <ChestScene plan={plan} onReady={() => setSceneReady(true)} />
        </div>
      )}

      {revealed && (
        <>
          {plan.tier === 'PREMIUM' && (
            <p className="mb-3 text-center text-xs uppercase tracking-[0.3em] text-treasure">
              Character found
            </p>
          )}

          <ul className="space-y-2">
            {cards.map((card, index) => (
              <li
                key={`${card.characterId}-${index}`}
                className="flex items-baseline justify-between rounded-lg bg-abyss/50 px-3 py-2"
              >
                <span className="text-sm text-parchment">
                  {card.name}
                </span>
                <span className="font-mono text-xs">
                  {card.duplicate ? (
                    <span className="text-turquoise">+{card.shards} ✨</span>
                  ) : (
                    <span className="uppercase tracking-wider text-treasure">
                      {RARITY_LABEL[card.rarity]}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
