import { describe, expect, it } from 'vitest';
import { ANCHOR, expectedChapterNumber, proposeChapter } from './schedule';

const WEEK = 7 * 24 * 60 * 60 * 1000;
const after = (weeks: number) => new Date(ANCHOR.weekOf.getTime() + weeks * WEEK);

describe('calendrier de parution', () => {
  it('rend le chapitre d’ancrage à la date d’ancrage', () => {
    expect(expectedChapterNumber(ANCHOR.weekOf)).toBe(ANCHOR.chapterNumber);
  });

  it('avance d’un chapitre par semaine', () => {
    expect(expectedChapterNumber(after(1))).toBe(ANCHOR.chapterNumber + 1);
    expect(expectedChapterNumber(after(5))).toBe(ANCHOR.chapterNumber + 5);
  });

  it('ne remonte jamais avant l’ancrage', () => {
    // Le calendrier sert à ouvrir les chapitres à venir. Le laisser calculer
    // des numéros passés permettrait de réouvrir un chapitre déjà jugé.
    const avant = new Date(ANCHOR.weekOf.getTime() - 40 * WEEK);
    expect(expectedChapterNumber(avant)).toBe(ANCHOR.chapterNumber);
  });

  it('progresse encore en milieu de semaine', () => {
    // Une seconde après le verrouillage, le chapitre suivant est ouvert.
    const justeApres = new Date(ANCHOR.weekOf.getTime() + 1_000);
    expect(expectedChapterNumber(justeApres)).toBe(ANCHOR.chapterNumber + 1);
  });
});

describe('confrontation à la source externe', () => {
  it('confirme quand les deux concordent', () => {
    const proposal = proposeChapter(after(2), ANCHOR.chapterNumber + 2);
    expect(proposal.confidence).toBe('CONFIRMED');
    expect(proposal.chapterNumber).toBe(ANCHOR.chapterNumber + 2);
  });

  it('garde le calendrier même quand la source est en avance', () => {
    // Le point décisif : une API tierce en avance ne doit pas ouvrir les
    // prédictions sur un chapitre que les joueurs peuvent déjà lire (§3).
    const proposal = proposeChapter(after(1), ANCHOR.chapterNumber + 6);

    expect(proposal.chapterNumber).toBe(ANCHOR.chapterNumber + 1);
    expect(proposal.confidence).toBe('AHEAD');
    expect(proposal.note).toContain('déjà lisible');
  });

  it('signale un calendrier en avance sur la source', () => {
    const proposal = proposeChapter(after(4), ANCHOR.chapterNumber + 1);
    expect(proposal.confidence).toBe('BEHIND');
    expect(proposal.note).toContain('pauses');
  });

  it('déclare la source figée quand elle décroche franchement', () => {
    // Cas réel : api-onepiece.com s'arrête au chapitre 1085 alors que la
    // parution en est à plus de 1180. Ce n'est pas une pause oubliée, c'est
    // un jeu de données mort — et le message doit le dire, sinon
    // l'administrateur cherche une erreur de calendrier qui n'existe pas.
    const proposal = proposeChapter(after(2), ANCHOR.chapterNumber - 90, 'Vieux titre');

    expect(proposal.confidence).toBe('STALE');
    expect(proposal.chapterNumber).toBe(ANCHOR.chapterNumber + 2);
    expect(proposal.note).toContain('figée');
    // Le titre d'un chapitre vieux de deux ans ne doit pas être proposé pour
    // celui de cette semaine.
    expect(proposal.title).toBeNull();
  });

  it('fonctionne sans la source', () => {
    // Réseau coupé : le calendrier suffit, et c'est tout l'intérêt de ne pas
    // dépendre d'un tiers pour décider.
    const proposal = proposeChapter(after(3), null);
    expect(proposal.confidence).toBe('UNKNOWN');
    expect(proposal.chapterNumber).toBe(ANCHOR.chapterNumber + 3);
  });

  it('transporte le titre quand la source en donne un', () => {
    const proposal = proposeChapter(after(1), ANCHOR.chapterNumber + 1, 'Lâchez-moi les baskets');
    expect(proposal.title).toBe('Lâchez-moi les baskets');
  });
});
