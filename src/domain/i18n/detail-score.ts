import { attributIdDeLibelle } from '../collection/attributes';
import type { MessageKey, Traducteur } from './locales';
import { libelleAttribut } from './libelles';

/**
 * Retraduit une ligne du détail du score.
 *
 * Les lignes sont écrites en français par le moteur de scoring au moment du
 * calcul, et stockées telles quelles avec le résultat (§75 : on relit, on ne
 * recalcule pas). Pour les montrer dans une autre langue, on les reconnaît
 * — chaque forme est fixe — et on les recompose depuis le dictionnaire.
 *
 * Une ligne inconnue — un moteur plus ancien, une forme oubliée — est rendue
 * telle quelle : mieux vaut une ligne en français qu'une ligne vide.
 */

const RELATIONS: Record<string, MessageKey> = {
  Équipage: 'relation.CREW',
  Alliance: 'relation.ALLIANCE',
  Faction: 'relation.FACTION',
  Rivalité: 'relation.RIVALRY',
  Mentor: 'relation.MENTOR',
  Famille: 'relation.FAMILY',
};

type Regle = { motif: RegExp; rendre: (t: Traducteur, m: RegExpExecArray) => string };

const REGLES: readonly Regle[] = [
  { motif: /^Présent dans le chapitre → \+(\d+)$/, rendre: (t, m) => t('score.present', { n: m[1] }) },
  { motif: /^Absent du chapitre → pas de base\.$/, rendre: (t) => t('score.absent') },
  { motif: /^Absent du chapitre → aucun point\.$/, rendre: (t) => t('score.absentOld') },
  {
    motif: /^(Équipage|Alliance|Faction|Rivalité|Mentor|Famille) avec (.+) → \+(\d+)$/,
    rendre: (t, m) => t('score.relation', { relation: t(RELATIONS[m[1]]), name: m[2], n: m[3] }),
  },
  {
    motif: /^Affiliation (.+) \((\d+) présents\) → \+(\d+)$/,
    rendre: (t, m) => t('score.affiliation', { name: m[1], present: m[2], n: m[3] }),
  },
  {
    motif: /^(.+) partagé → \+(\d+)$/,
    rendre: (t, m) => {
      const id = attributIdDeLibelle(m[1]);
      return t('score.shared', { attribute: id ? libelleAttribut(t, id) : m[1], n: m[2] });
    },
  },
  {
    motif:
      /^Pari réussi — plus improbable que (\d+) % du référentiel \(présence (\d+), rareté (\d+), attributs (\d+)\) → \+(\d+)$/,
    rendre: (t, m) =>
      t('score.riskHit', { rank: m[1], presence: m[2], rarity: m[3], attributes: m[4], n: m[5] }),
  },
  {
    motif:
      /^Pari manqué mais bien vu — (\d+) % d['’]improbabilité, payée à (\d+) % pour ses liens avec le chapitre → \+(\d+)$/,
    rendre: (t, m) => t('score.riskNear', { rank: m[1], paid: m[2], n: m[3] }),
  },
  {
    motif: /^Pari manqué et sans lien avec le chapitre → \+0 \(l['’]improbabilité seule ne rapporte rien\)$/,
    rendre: (t) => t('score.riskMiss'),
  },
  {
    motif: /^Choisi par (\d+) % des joueurs → × ([\d.,]+) \(un choix que tout le monde fait ne départage personne\)$/,
    rendre: (t, m) => t('score.consensus', { rate: m[1], factor: m[2] }),
  },
];

export function traduireDetailScore(t: Traducteur, ligne: string): string {
  for (const { motif, rendre } of REGLES) {
    const m = motif.exec(ligne);
    if (m) return rendre(t, m);
  }
  return ligne;
}
