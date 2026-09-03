import { describe, expect, it } from 'vitest';
import { CHARACTERS, CHARACTER_INDEX } from '../../data/characters';
import { attributesOf } from './attributes';

/**
 * Im Sama et les Cinq Doyens ne sont pas des pirates.
 *
 * L'import les rangeait tous les six sous « Buggy's Delivery » — l'équipage du
 * clown. La faute vient de la source, et elle serait passée inaperçue
 * longtemps : sur une carte, elle n'aurait produit qu'un symbole d'équipage
 * légèrement surprenant.
 *
 * Le moteur de score l'a révélée. En cherchant pourquoi Perona, affiliée à
 * Cross Guild, gagnait des points d'attribut partagé dans un chapitre où ne
 * figuraient que Luffy, Loki, Zoro, Kinémon et Im Sama, on trouve la réponse :
 * Im Sama y était compté comme membre du même équipage qu'elle. Le calcul
 * était juste, la donnée était fausse.
 */
describe('gouvernement mondial', () => {
  it('ne range aucun dirigeant du monde dans un équipage de pirates', () => {
    const dirigeants = ['im-sama', '1er-doyen', '2e-doyen', '3e-doyen', '4e-doyen', '5e-doyen'];

    for (const id of dirigeants) {
      const c = CHARACTER_INDEX.get(id);
      expect(c, id).toBeDefined();
      expect(c!.affiliations.join(' '), id).not.toMatch(/delivery|baggy|buggy/i);

      const ids = attributesOf(c!).map((a) => a.id);
      expect(ids.some((a) => a.startsWith('crew-')), `${id} ne doit porter aucun équipage`).toBe(false);
    }
  });

  it('laisse l’équipage de Baggy à ceux qui en sont', () => {
    // La correction ne devait toucher que la graphie anglaise : les membres
    // réels de l'équipage sont rangés sous « Baggy's Delivery », et eux
    // gardent leur affiliation.
    for (const id of ['baggy-le-clown', 'alvida', 'galdino', 'cabaji']) {
      const c = CHARACTER_INDEX.get(id);
      expect(c, id).toBeDefined();
      expect(c!.affiliations.join(' '), id).toMatch(/delivery/i);
    }
  });

  it('ne laisse plus personne sous la graphie fautive', () => {
    const restants = CHARACTERS.filter((c) =>
      c.affiliations.some((a) => a.includes("Buggy's Delivery")),
    );
    expect(restants.map((c) => c.id)).toEqual([]);
  });
});
