import { describe, expect, it } from 'vitest';
import {
  MAX_MEMBRES,
  NOM_MAX,
  NOM_MIN,
  classer,
  genererCodeLigue,
  normaliserCodeLigue,
  validerNomLigue,
} from './league';

describe('ligues privées', () => {
  describe('code d’invitation', () => {
    it('n’emploie aucun caractère qui se confonde avec un autre', () => {
      /*
       * Le code se dit à voix haute et se recopie d'un écran à l'autre. `I` et
       * `1`, `O` et `0` s'y confondent — et le joueur qui s'y trompe conclut
       * que la ligue n'existe pas, pas qu'il a mal lu.
       *
       * Ce test a d'abord exigé l'absence de **voyelles**, sur la foi d'un
       * commentaire du parrainage qui l'affirmait depuis toujours. L'alphabet
       * en contient : le commentaire était faux, pas le code. Les deux ont été
       * corrigés.
       */
      for (let i = 0; i < 200; i += 1) {
        const code = genererCodeLigue();
        expect(code).toMatch(/^[0-9A-Z]{6}$/);
        expect(code).not.toMatch(/[IO01]/);
      }
    });

    it('ne rend jamais deux fois le même code sur un petit tirage', () => {
      // Trente-deux caractères à la puissance six : une collision reste
      // possible, et le dépôt la rattrape. Ce test ne vérifie que l'entropie
      // du générateur, pas l'unicité — qui est une garantie de la base.
      const codes = new Set(Array.from({ length: 500 }, genererCodeLigue));
      expect(codes.size).toBeGreaterThan(495);
    });

    it('accepte un code recopié avec des espaces, des tirets ou en minuscules', () => {
      // Le code voyage dans un message : il peut être coupé par un retour à la
      // ligne, embelli d'un tiret, ou collé tel qu'un clavier l'a écrit.
      expect(normaliserCodeLigue(' a7k-2m9 ')).toBe('A7K2M9');
      expect(normaliserCodeLigue('A7K 2M9')).toBe('A7K2M9');
    });
  });

  describe('nom', () => {
    it('réduit les espaces intérieurs', () => {
      // « Les   Chapeaux » et « Les Chapeaux » sont le même nom. Laisser
      // passer les deux permet de fabriquer deux ligues visuellement
      // identiques.
      const verdict = validerNomLigue('  Les   Chapeaux  de Paille ');
      expect(verdict).toEqual({ valide: true, nom: 'Les Chapeaux de Paille' });
    });

    it('refuse trop court et trop long', () => {
      expect(validerNomLigue('ab').valide).toBe(false);
      expect(validerNomLigue('x'.repeat(NOM_MAX + 1)).valide).toBe(false);
      expect(validerNomLigue('x'.repeat(NOM_MIN)).valide).toBe(true);
      expect(validerNomLigue('x'.repeat(NOM_MAX)).valide).toBe(true);
    });

    it('laisse passer accents et emoji', () => {
      /*
       * On n'interdit pas les caractères spéciaux : le nom est affiché par
       * React, qui échappe tout. Les proscrire priverait les joueurs d'un nom
       * qui leur ressemble pour se protéger d'un risque qui n'existe pas.
       */
      expect(validerNomLigue('Les Pirates 🏴‍☠️').valide).toBe(true);
      expect(validerNomLigue('Équipage du Rêve').valide).toBe(true);
    });
  });

  describe('classement', () => {
    it('donne le même rang à deux ex æquo, et fait sauter le suivant', () => {
      // Classement sportif, comme au mondial. Départager sur autre chose que
      // les points — l'ordre de la base, l'ancienneté — inventerait une
      // hiérarchie que rien ne justifie.
      const out = classer([
        { playerId: 'a', handle: 'Anne', total: 40 },
        { playerId: 'b', handle: 'Bran', total: 90 },
        { playerId: 'c', handle: 'Cleo', total: 70 },
        { playerId: 'd', handle: 'Dino', total: 70 },
      ]);

      expect(out.map((l) => [l.handle, l.rang])).toEqual([
        ['Bran', 1],
        ['Cleo', 2],
        ['Dino', 2],
        ['Anne', 4],
      ]);
    });

    it('ordonne les ex æquo par pseudo, pour que le rang ne bouge pas', () => {
      // À score égal, l'ordre d'affichage doit être stable d'une semaine à
      // l'autre : sinon deux joueurs se croisent dans la liste sans qu'aucun
      // n'ait rien changé.
      const lignes = [
        { playerId: 'z', handle: 'Zoro', total: 10 },
        { playerId: 'a', handle: 'Ace', total: 10 },
      ];
      expect(classer(lignes).map((l) => l.handle)).toEqual(['Ace', 'Zoro']);
      expect(classer([...lignes].reverse()).map((l) => l.handle)).toEqual([
        'Ace',
        'Zoro',
      ]);
    });

    it('rend une liste vide sans se plaindre', () => {
      expect(classer([])).toEqual([]);
    });
  });

  it('plafonne une ligue à une taille où l’on se reconnaît', () => {
    // Une ligue de trois cents redevient un classement mondial en plus petit :
    // on y cherche son nom dans une liste, ce à quoi les ligues servent
    // justement à échapper. C'est aussi ce qui garantit que leur classement
    // tient en une requête sans pagination.
    expect(MAX_MEMBRES).toBeLessThanOrEqual(50);
  });
});
