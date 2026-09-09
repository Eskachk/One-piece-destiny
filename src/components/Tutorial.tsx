'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TUTORIELS, type PageTutoriel } from '@/domain/tutoriel';

/**
 * Visite guidée d'une page (cahier §55, §111, §113).
 *
 * Une par onglet, ouverte la première fois que le joueur arrive sur la page,
 * jamais ensuite. Le contenu vit dans `domain/tutoriel.ts` ; ce fichier ne
 * s'occupe que de la mécanique — quand montrer, comment sortir, comment ne
 * plus jamais revoir.
 *
 * ## Trois façons de sortir, dont deux définitives
 *
 * « Passer » clôt la visite **de cette page** : le joueur veut lire son
 * classement maintenant, pas qu'on lui explique le classement. Les autres
 * pages garderont la leur.
 *
 * « Ne plus afficher » coupe **toutes** les visites, d'un geste. C'est la
 * demande explicite du produit, et c'est aussi la seule réponse honnête à
 * quelqu'un qui connaît déjà le jeu : lui faire refuser six fois la même chose
 * serait un péage déguisé.
 *
 * Échap fait comme « Passer ». Une boîte modale sans sortie au clavier est
 * un piège pour qui ne se sert pas d'une souris (§111).
 *
 * ## Pourquoi l'état est dans le navigateur et pas en base
 *
 *   — on n'écrit rien en base à la simple ouverture d'une page ;
 *   — rien n'est ajouté au chemin critique du rendu ;
 *   — revoir une visite sur un autre navigateur est sans conséquence, alors
 *     qu'une écriture ratée pourrait la faire réapparaître en boucle.
 *
 * Chaque accès au stockage est gardé : en navigation privée, avec les cookies
 * bloqués ou pendant une capture de vignette, il **lève**. Non gardé, il
 * ferait planter la page pour tout le monde.
 */

const PREFIXE = 'opq_tuto:';
const CLE_GLOBALE = 'opq_tuto_off';

/**
 * L'ancienne clé, du temps où il n'y avait qu'une visite pour tout le jeu.
 *
 * Elle n'est **pas** honorée : ce tutoriel-ci n'est pas l'autre, et l'autre
 * annonçait des points faux. Un joueur qui avait vu le précédent a donc appris
 * des chiffres qui n'ont jamais été ceux du moteur en service — raison de plus
 * pour lui montrer celui-ci. On se contente d'effacer la clé morte.
 */
const CLE_ANCIENNE = 'opq_tutorial_done';

function dejaVue(page: PageTutoriel): boolean {
  try {
    if (window.localStorage.getItem(CLE_GLOBALE) === 'true') return true;
    return window.localStorage.getItem(PREFIXE + page) === 'true';
  } catch {
    // Stockage inaccessible : on n'affiche rien plutôt que de risquer de
    // remontrer la visite à chaque navigation.
    return true;
  }
}

function noter(cle: string): void {
  try {
    window.localStorage.setItem(cle, 'true');
  } catch {
    // Sans stockage, la visite réapparaîtra. C'est désagréable, jamais
    // bloquant.
  }
}

export function Tutorial({ page }: { page: PageTutoriel }) {
  const etapes = TUTORIELS[page];
  const [index, setIndex] = useState<number | null>(null);
  const carte = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.localStorage.removeItem(CLE_ANCIENNE);
    } catch {
      // Sans importance : c'est du ménage, pas une condition.
    }
    if (!dejaVue(page)) setIndex(0);
  }, [page]);

  const fermer = useCallback(
    (partout: boolean) => {
      setIndex(null);
      noter(PREFIXE + page);
      if (partout) noter(CLE_GLOBALE);
    },
    [page],
  );

  // Le focus entre dans la boîte à l'ouverture, et Échap en sort. Sans le
  // premier, un lecteur d'écran continue d'annoncer la page derrière ; sans le
  // second, seule la souris permet de sortir.
  useEffect(() => {
    if (index !== 0) return;
    carte.current?.focus();
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer(false);
    };
    window.addEventListener('keydown', auClavier);
    return () => window.removeEventListener('keydown', auClavier);
  }, [index, fermer]);

  if (index === null) return null;

  const etape = etapes[index];
  const derniere = index === etapes.length - 1;

  return (
    <div className="hb-tuto" role="dialog" aria-modal="true" aria-labelledby="tuto-title">
      <div className="hb-tuto__card" ref={carte} tabIndex={-1}>
        <div className="hb-tuto__dots" aria-hidden="true">
          {etapes.map((_, i) => (
            <span key={i} className={i === index ? 'is-current' : undefined} />
          ))}
        </div>

        {/* `aria-live` : au changement d'étape, le focus reste sur « Suivant »
            et rien ne serait annoncé sans cela — la visite deviendrait muette
            dès le deuxième écran. */}
        <div aria-live="polite">
          <p className="hb-legend">
            Étape {index + 1} sur {etapes.length}
          </p>
          <h2 id="tuto-title" className="hb-title mt-1" style={{ fontSize: '1.7rem' }}>
            {etape.titre}
          </h2>
          <p className="mt-3 text-sm">{etape.corps}</p>
          {etape.repere && <p className="hb-muted mt-2 text-xs">{etape.repere}</p>}
        </div>

        <div className="mt-5 flex items-center gap-2">
          {/* « Passer » visible dès la première étape : enterrer la sortie au
              bout de cinq écrans transforme une aide en péage. */}
          <button type="button" onClick={() => fermer(false)} className="hb-btn--ghost hb-tuto__skip">
            Passer
          </button>

          <button
            type="button"
            onClick={() => (derniere ? fermer(false) : setIndex(index + 1))}
            className="hb-btn flex-1"
          >
            {derniere ? 'J’ai compris' : 'Suivant'}
          </button>
        </div>

        <button type="button" onClick={() => fermer(true)} className="hb-tuto__jamais">
          Ne plus afficher les visites guidées
        </button>
      </div>
    </div>
  );
}
