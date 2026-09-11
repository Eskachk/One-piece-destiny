import { describe, expect, it } from 'vitest';
import { traduireDetailScore } from './detail-score';
import { translator } from './locales';
import { scoreCharacter } from '../scoring/v6';
import { CHARACTERS } from '@/data/characters';

const en = translator('en');
const fr = translator('fr');

describe('détail du score, retraduit', () => {
  it('reconnaît chaque forme que le moteur v6 écrit', () => {
    const lignes = [
      'Présent dans le chapitre → +34',
      'Absent du chapitre → pas de base.',
      'Équipage avec Zoro → +9',
      'Affiliation Straw Hat Pirates (2 présents) → +8',
      'Épéiste partagé → +6',
      'Pari réussi — plus improbable que 62 % du référentiel (présence 40, rareté 70, attributs 12) → +20',
      'Pari manqué mais bien vu — 62 % d’improbabilité, payée à 30 % pour ses liens avec le chapitre → +6',
      'Pari manqué et sans lien avec le chapitre → +0 (l’improbabilité seule ne rapporte rien)',
      'Choisi par 85 % des joueurs → × 0.62 (un choix que tout le monde fait ne départage personne)',
    ];
    for (const ligne of lignes) {
      const traduit = traduireDetailScore(en, ligne);
      expect(traduit, ligne).not.toBe(ligne);
      expect(traduit).not.toMatch(/[éèà]/);
    }
    expect(traduireDetailScore(en, 'Équipage avec Zoro → +9')).toBe('Crew with Zoro → +9');
    expect(traduireDetailScore(en, 'Épéiste partagé → +6')).toBe('Swordsman shared → +6');
  });

  it('rend le français inchangé', () => {
    expect(traduireDetailScore(fr, 'Équipage avec Zoro → +9')).toBe('Équipage avec Zoro → +9');
  });

  it('laisse passer une ligne inconnue', () => {
    expect(traduireDetailScore(en, 'Ligne d’un moteur oublié')).toBe('Ligne d’un moteur oublié');
  });

  it('couvre ce que le moteur écrit vraiment', () => {
    // Un chapitre où tout le monde apparaît, avec un taux de sélection : cela
    // fait sortir la base, la synergie, le risque et l'escompte.
    const roster = new Map(CHARACTERS.map((c) => [c.id, c]));
    const presents = CHARACTERS.slice(0, 12);
    const ctx = {
      roster,
      picked: presents.slice(0, 3),
      appearances: presents.map((c) => ({ characterId: c.id, appearances: 1 })),
      pickRates: new Map(presents.map((c) => [c.id, 0.5])),
    };
    for (const c of presents) {
      for (const ligne of scoreCharacter(c, ctx).breakdown) {
        expect(traduireDetailScore(en, ligne), ligne).not.toBe(ligne);
      }
    }
  });
});
