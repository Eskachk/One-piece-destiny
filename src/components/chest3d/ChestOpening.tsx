'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RevealedCard } from '@/app/actions/collection';
import {
  ceremonyPlan,
  reducedMotionPlan,
} from '@/domain/collection/chest-ceremony';
import { RARITY_LABEL } from '@/domain/collection/rarity';
import { RarityCard } from '@/components/RarityCard';

/**
 * Enveloppe de l'ouverture 3D (cahier §56, §57, §61, §111).
 *
 * Le module 3D est chargé **dynamiquement et sans rendu serveur**. C'est ce
 * qui permet de tenir le §57 : les pages courantes ne portent pas le poids de
 * Three.js, il n'arrive que si un coffre s'ouvre vraiment.
 *
 * Trois raisons de sauter la 3D, toutes traitées : la préférence
 * « mouvement réduit » (§111), l'absence de WebGL, et l'échec de chargement du
 * module. Dans les trois cas le joueur voit quand même ses cartes — la
 * révélation lui est due.
 *
 * Les cartes tombent **une par une** (§61), de la moins bonne à la meilleure.
 * Les afficher toutes d'un coup laissait l'œil se poser d'abord sur la
 * première ligne, qui est rarement la plus intéressante : le meilleur tirage
 * de la semaine passait inaperçu.
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
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
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
  /** Nombre de cartes déjà retournées. */
  const [shown, setShown] = useState(0);

  // `onDone` passé en ref, et non lu directement dans l'effet.
  //
  // L'appelant écrit presque toujours `onDone={() => …}` : une fonction neuve
  // à chaque rendu. Placée dans les dépendances de l'effet de cadence, elle le
  // relançait à chaque carte révélée — les minuteries étaient annulées puis
  // recréées depuis la première, et la révélation repartait indéfiniment de
  // zéro. La ref garde la dernière version sans jamais réveiller l'effet.
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    setMode(reduced || !supportsWebGL() ? 'plain' : 'scene');
    if (reduced) setRevealed(true);
  }, []);

  const plan = useMemo(
    () => (mode === 'plain' ? reducedMotionPlan(cards) : ceremonyPlan(cards)),
    [cards, mode],
  );

  // Ordre de révélation : du moins bon au meilleur. La dernière carte
  // retournée est celle qui vaut le détour, et c'est aussi la couleur
  // qu'annonçaient les éclairs.
  const ordered = useMemo(() => {
    const rank = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
    return [...cards].sort(
      (a, b) => rank.indexOf(a.rarity) - rank.indexOf(b.rarity),
    );
  }, [cards]);

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
      () => setRevealed(true),
      plan.totalSeconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [mode, plan.totalSeconds, revealed, sceneReady]);

  // Cadence des cartes. Un `setTimeout` par carte plutôt qu'un intervalle :
  // chaque minuterie est annulée à part, et démonter le composant en pleine
  // révélation ne laisse rien tourner derrière.
  useEffect(() => {
    if (!revealed) return;

    if (plan.cardIntervalSeconds === 0) {
      setShown(ordered.length);
      done.current?.();
      return;
    }

    const timers = ordered.map((_, index) =>
      setTimeout(() => {
        setShown(index + 1);
        // `onDone` signale la fin de **toute** la révélation, dernière carte
        // comprise. Il le signalait à l'ouverture du couvercle : l'appelant
        // rafraîchissait alors la page au moment précis où les cartes
        // commençaient à tomber, et les effaçait.
        if (index === ordered.length - 1) done.current?.();
      }, index * plan.cardIntervalSeconds * 1000),
    );
    return () => timers.forEach(clearTimeout);
  }, [revealed, ordered, plan.cardIntervalSeconds]);

  return (
    <div>
      {/* La scène reste montée jusqu'à ce que la **première carte** se pose,
          et non jusqu'à la fin de l'animation. Entre les deux, le coffre
          disparaissait et la liste était encore vide : le cadre se refermait
          sur du vide pendant une image, ce qui se voyait comme un clignotement
          au moment précis où il fallait regarder. */}
      {mode === 'scene' && shown === 0 && (
        <div className="hb-chest-stage">
          <ChestScene plan={plan} onReady={() => setSceneReady(true)} />
        </div>
      )}

      {revealed && (
        <>
          {plan.tier === 'PREMIUM' && shown >= ordered.length && (
            <p className="hb-legend mb-3 text-center">
              {RARITY_LABEL[plan.highlight]} — la prise de la semaine
            </p>
          )}

          <ul className="space-y-2">
            {ordered.slice(0, shown).map((card, index) => (
              <li key={`${card.characterId}-${index}`} className="hb-card-drop">
                <RarityCard
                  name={card.name}
                  rarity={card.rarity}
                  attributes={card.attributes}
                  footer={
                    card.duplicate ? (
                      <span className="hb-shards">+{card.shards} ✨ fragments</span>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
