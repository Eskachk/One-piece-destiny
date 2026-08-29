'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Visite guidée d'arrivée (cahier §55, §113).
 *
 * Elle s'ouvre une seule fois, à la première visite de l'accueil, et se saute
 * en un geste — le bouton « Passer » est visible **dès le premier écran**, pas
 * caché au bout de six étapes.
 *
 * L'état tient dans `localStorage`, pas en base, et c'est un choix :
 *
 *   — ne rien écrire en base à la simple ouverture d'une page ;
 *   — ne rien ajouter au chemin critique de l'accueil ;
 *   — revoir le tutoriel sur un autre navigateur est sans conséquence, alors
 *     qu'une écriture ratée pourrait le faire réapparaître en boucle.
 *
 * Chaque lecture est protégée : en navigation privée, avec les cookies
 * bloqués, ou pendant une capture de vignette, l'accès au stockage **lève**.
 * Non gardé, il ferait planter l'accueil pour tout le monde.
 */

const STORAGE_KEY = 'opq_tutorial_done';

interface Step {
  title: string;
  body: string;
  hint: string;
}

/**
 * Cinq étapes, dans l'ordre où le joueur va réellement les rencontrer :
 * il ouvre son coffre, il compose, il attend, il découvre, il recommence.
 * Un tutoriel qui suit l'ordre des menus plutôt que celui du jeu se retient
 * moins bien.
 */
const STEPS: Step[] = [
  {
    title: 'Le chapitre est le spectacle',
    body:
      'Chaque semaine, un nouveau chapitre de l’œuvre paraît. Ton jeu, c’est de deviner qui y apparaîtra le plus — avant qu’il sorte.',
    hint: 'Aucune connaissance de spoiler n’aide : personne ne l’a lu.',
  },
  {
    title: 'Ouvre ton coffre d’arrivée',
    body:
      'Cinq personnages t’attendent dans la Collection, tous différents, dont au moins un Rare. C’est ton point de départ.',
    hint: 'Onglet Collection.',
  },
  {
    title: 'Compose ton équipage',
    body:
      'Trois personnages, choisis parmi ceux que tu possèdes. Tu marques des points selon leurs apparitions réelles dans le chapitre — et selon les liens qui les unissent.',
    hint: 'Onglet Équipage. Modifiable jusqu’au dimanche 23:59:59.',
  },
  {
    title: 'La rareté n’est pas la puissance',
    body:
      'Un Commun peut rapporter plus qu’un Légendaire. La rareté dit la valeur de collection, jamais la valeur en jeu. C’est ce qui rend les paris intéressants.',
    hint: 'Un personnage peu choisi qui apparaît beaucoup rapporte gros.',
  },
  {
    title: 'Puis on recommence',
    body:
      'Dimanche soir, tout se verrouille. Le chapitre sort, les résultats tombent, tu gagnes des Berries et un coffre — que tu sois premier ou dernier.',
    hint: 'Onglet Classement.',
  },
];

export function Tutorial() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== 'true') setStep(0);
    } catch {
      // Stockage inaccessible : on n'affiche rien plutôt que de risquer de
      // remontrer le tutoriel à chaque navigation.
    }
  }, []);

  const close = () => {
    setStep(null);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Sans stockage, le tutoriel réapparaîtra à la prochaine visite. C'est
      // désagréable, jamais bloquant.
    }
  };

  if (step === null) return null;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      className="hb-tuto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tuto-title"
    >
      <div className="hb-tuto__card">
        <div className="hb-tuto__dots" aria-hidden="true">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={index === step ? 'is-current' : undefined}
            />
          ))}
        </div>

        <p className="hb-legend">
          Étape {step + 1} sur {STEPS.length}
        </p>
        <h2 id="tuto-title" className="hb-title mt-1" style={{ fontSize: '1.7rem' }}>
          {current.title}
        </h2>
        <p className="mt-3 text-sm">{current.body}</p>
        <p className="hb-muted mt-2 text-xs">{current.hint}</p>

        <div className="mt-5 flex items-center gap-2">
          {/* « Passer » d'abord, et visible dès la première étape : enterrer la
              sortie au bout de cinq écrans transforme une aide en péage. */}
          <button type="button" onClick={close} className="hb-btn--ghost hb-tuto__skip">
            Passer
          </button>

          {last ? (
            <Link href="/collection" onClick={close} className="hb-btn flex-1">
              Ouvrir mon coffre
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="hb-btn flex-1"
            >
              Suivant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
