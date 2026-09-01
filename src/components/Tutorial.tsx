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
 * Sept étapes, dans l'ordre où le joueur va réellement les rencontrer : il
 * ouvre son coffre, il compose, il attend, il découvre, il recommence. Un
 * tutoriel qui suit l'ordre des menus plutôt que celui du jeu se retient moins
 * bien.
 *
 * ## Ce que les deux étapes ajoutées viennent réparer
 *
 * L'ancienne version disait « un Commun peut rapporter plus qu'un Légendaire »
 * et s'arrêtait là. C'est vrai, mais ça se lit comme une formule
 * d'encouragement — et personne ne change sa façon de jouer sur une promesse
 * qu'on ne lui explique pas.
 *
 * Le jeu a exactement deux leviers, et ce sont les seuls endroits où un joueur
 * peut être meilleur qu'un autre :
 *
 *   — **le risque.** Un personnage attendu partout rapporte un bonus proche de
 *     zéro ; un personnage que presque personne ne choisit et qui apparaît
 *     quand même vaut jusqu'à 25 points de plus. Ce bonus ne regarde ni la
 *     rareté ni le niveau — seulement l'improbabilité du pari ;
 *   — **la synergie.** Un lien ne rapporte que si les **deux** personnages
 *     figurent au chapitre. Trois personnages sans rapport entre eux valent
 *     trois fois la base et rien d'autre.
 *
 * Les chiffres cités dans les étapes sont ceux du moteur (`scoring/v2.ts`) :
 *   base 40 · synergie jusqu'à 35 · risque jusqu'à 25.
 * S'ils changent là-bas, ils doivent changer ici — un tutoriel qui ment sur
 * les points est pire qu'un tutoriel absent.
 */
const STEPS: Step[] = [
  {
    title: 'Le chapitre est le spectacle',
    body:
      'Un nouveau chapitre paraît chaque semaine. Ton jeu : deviner qui y apparaîtra, avant qu’il sorte.',
    hint: 'Personne ne l’a lu. Aucun spoiler ne peut t’aider.',
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
      'Trois personnages parmi ceux que tu possèdes. Chacun rapporte 40 points s’il apparaît dans le chapitre, et zéro sinon. Un absent ne rapporte rien, même très bien entouré.',
    hint: 'Onglet Équipage. Modifiable jusqu’au dimanche 23:59:59.',
  },
  {
    title: 'Le pari improbable rapporte gros',
    body:
      'Au-dessus des 40 points de présence, un personnage peu attendu et peu choisi rapporte jusqu’à 25 points de plus. Un personnage que tout le monde aligne n’en rapporte presque aucun : il est déjà dans l’équipage de tes adversaires.',
    hint: 'Un pari raté ne coûte rien de plus qu’un choix sûr absent : zéro dans les deux cas.',
  },
  {
    title: 'Les liens ne comptent qu’à deux',
    body:
      'Un équipage, une rivalité, une famille : jusqu’à 35 points de plus par personnage. Mais un lien ne se déclenche que si les deux apparaissent dans le même chapitre. Trois personnages sans rapport entre eux, c’est trois fois la base et rien d’autre.',
    hint: 'Vise une scène plausible, pas trois noms connus.',
  },
  {
    title: 'La rareté ne donne aucun point',
    body:
      'Le moteur de score ne regarde jamais la rareté d’une carte. Un Commun peu choisi qui apparaît aux côtés de son capitaine bat un Mythique aligné par tout le monde. La rareté dit ce qu’une carte vaut en collection, jamais ce qu’elle vaut au classement.',
    hint: 'C’est aussi pour ça qu’aucun achat ne peut te faire gagner.',
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
