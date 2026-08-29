'use client';

import { useEffect, useState } from 'react';

/**
 * Compte à rebours du verrouillage (cahier §63).
 *
 * L'échéance vient du serveur en UTC ; le client ne fait que l'afficher.
 * Il ne décide jamais du verrouillage — cette autorité reste au serveur
 * (cahier §2.2, §76), sinon changer l'heure de son téléphone suffirait.
 *
 * `initialRemainingMs` est calculé côté serveur et sert au premier rendu des
 * deux côtés : sans lui, serveur et client liraient leur horloge à des
 * instants différents et l'hydratation échouerait.
 */
export function Countdown({
  deadlineIso,
  initialRemainingMs,
}: {
  deadlineIso: string;
  initialRemainingMs: number;
}) {
  const deadline = new Date(deadlineIso).getTime();
  const [remaining, setRemaining] = useState(initialRemainingMs);

  useEffect(() => {
    // Après hydratation, on bascule sur l'horloge locale pour l'affichage.
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (remaining === 0) {
    return (
      <p className="font-mono text-2xl tracking-[0.2em] hb-ko">
        🔒 CREW LOCKED
      </p>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <p
      className="font-mono text-3xl tracking-[0.12em] hb-gold tabular-nums"
      // Le décompte change chaque seconde : ne pas le faire relire en boucle
      // par un lecteur d'écran.
      aria-live="off"
    >
      {pad(days)}
      <span className="text-base hb-ink-soft">J </span>
      {pad(hours)}
      <span className="text-base hb-ink-soft">H </span>
      {pad(minutes)}
      <span className="text-base hb-ink-soft">M </span>
      {pad(seconds)}
      <span className="text-base hb-ink-soft">S</span>
    </p>
  );
}
