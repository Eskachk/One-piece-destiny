import { describe, expect, it } from 'vitest';
import { CREW_MAX, CREW_TAILLE, lireChapitre, lireEquipage } from './partage';

/**
 * Les bornes d'un lien de partage.
 *
 * `/share/<chapitre>/<équipage>` est un espace d'URL infini dont chaque
 * adresse coûte la génération d'une image. Ces tests défendent la seule chose
 * qu'on puisse garantir : que le travail par requête reste borné, quoi qu'on
 * demande.
 */
describe('lecture d’un lien de partage', () => {
  it('lit un équipage ordinaire', () => {
    expect(lireEquipage('luffy,zoro,nami')).toEqual(['luffy', 'zoro', 'nami']);
  });

  it('décode et nettoie les espaces', () => {
    expect(lireEquipage('luffy%2C%20zoro')).toEqual(['luffy', 'zoro']);
  });

  it('ne découpe jamais plus de trois identifiants', () => {
    expect(lireEquipage('a,b,c,d,e,f')).toHaveLength(CREW_TAILLE);
  });

  it('borne le travail avant de découper, pas après', () => {
    /*
     * **Le garde-fou.**
     *
     * `split(',')` puis `slice(0, 3)` alloue d'abord le tableau entier : une
     * chaîne d'un mégaoctet de virgules produisait un million d'entrées pour
     * n'en garder que trois, à chaque requête, sur le chemin le plus cher du
     * serveur.
     *
     * Le test ne vérifie pas le résultat — il vérifie qu'on n'a pas eu à
     * fabriquer un million d'entrées pour l'obtenir. La coupure est faite sur
     * la chaîne, avant tout découpage.
     */
    const enorme = 'x'.repeat(200_000) + ','.repeat(200_000);
    const debut = performance.now();
    const lu = lireEquipage(enorme);
    const duree = performance.now() - debut;

    expect(lu.length).toBeLessThanOrEqual(CREW_TAILLE);
    expect(lu[0]?.length ?? 0).toBeLessThanOrEqual(CREW_MAX);
    // Généreux à dessein : on cherche à exclure l'ordre de grandeur d'un
    // découpage complet, pas à mesurer une machine.
    expect(duree).toBeLessThan(50);
  });

  it('ne jette pas sur une URL malformée', () => {
    // Un « % » isolé fait échouer `decodeURIComponent`. Un lien tronqué par un
    // client de messagerie ne doit pas rendre 500.
    expect(() => lireEquipage('luffy%')).not.toThrow();
  });
});

describe('numéro de chapitre', () => {
  it('accepte un numéro', () => {
    expect(lireChapitre('1993')).toBe(1993);
  });

  it('refuse tout ce qui n’est pas un numéro', () => {
    /*
     * Il était réaffiché tel quel dans le titre de la page **et dans
     * l'image**, sous le nom du jeu et dans sa typographie : n'importe qui
     * pouvait fabriquer une carte officielle disant ce qu'il voulait.
     */
    expect(lireChapitre('1993 GRATUIT CLIQUEZ ICI')).toBeNull();
    expect(lireChapitre('0')).toBeNull();
    expect(lireChapitre('999999999')).toBeNull();
    expect(lireChapitre('<script>')).toBeNull();
  });
});
