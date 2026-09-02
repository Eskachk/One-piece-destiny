import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../../data/characters';
import { SIGNATURES, signatureOf } from './signatures';
import { spriteTraits } from './portrait';

/**
 * Les cartes qui portent le jeu doivent avoir un visage.
 *
 * Légendaires et Mythiques sont les seules raretés dessinées en figurine, et
 * ce sont celles qu'un joueur veut reconnaître d'un coup d'œil. Une promotion
 * de rareté dans le référentiel — un personnage qui passe d'Épique à
 * Légendaire — le ferait basculer sur le repli générique sans que rien ne le
 * signale : deux bonshommes interchangeables reviendraient par la porte de
 * derrière.
 *
 * Ce test échoue alors, en nommant l'identifiant à décrire.
 */

const HEROS = CHARACTERS.filter(
  (c) => c.rarity === 'LEGENDARY' || c.rarity === 'MYTHIC',
);

describe('signatures physiques', () => {
  it('couvre toutes les cartes dessinées en figurine', () => {
    const sans = HEROS.filter((c) => signatureOf(c.id) === null).map((c) => c.id);
    expect(sans).toEqual([]);
  });

  it('donne à chacune une description en une phrase', () => {
    for (const [id, signature] of Object.entries(SIGNATURES)) {
      expect(signature.note.length, id).toBeGreaterThan(30);
      // Une couleur, pas un nom : le rendu les pose telles quelles en SVG.
      expect(signature.hair, id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(signature.skin, id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(signature.outfit, id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('produit des figurines distinctes pour deux héros différents', () => {
    // Le défaut d'origine : Shanks et Luffy sortaient identiques à la couleur
    // près. On compare la signature visuelle complète, colorations comprises.
    const empreinte = (id: string) => {
      const c = HEROS.find((h) => h.id === id)!;
      const t = spriteTraits({ id: c.id, rarity: c.rarity, attributes: [] });
      return [t.build, t.cut, t.head, t.mark, t.prop, t.hair, t.skin, t.outfit].join('|');
    };

    expect(empreinte('shanks')).not.toBe(empreinte('luffy'));
    expect(empreinte('zoro')).not.toBe(empreinte('sanji'));

    // Et à l'échelle : au moins les trois quarts des héros ont une empreinte
    // qui n'appartient qu'à eux. Un chiffre plus haut serait tenu par hasard,
    // un chiffre plus bas laisserait revenir la monotonie d'origine.
    const empreintes = HEROS.map((c) => empreinte(c.id));
    const uniques = new Set(empreintes).size;
    expect(uniques / empreintes.length).toBeGreaterThan(0.75);
  });

  it('ne décrit personne qui n’existe pas', () => {
    // Une signature orpheline est du travail perdu qui ne se voit nulle part :
    // le personnage a été renommé ou retiré du référentiel, et le portrait
    // écrit pour lui ne sera jamais rendu.
    const connus = new Set(CHARACTERS.map((c) => c.id));
    const orphelines = Object.keys(SIGNATURES).filter((id) => !connus.has(id));
    expect(orphelines).toEqual([]);
  });

  it('décrit une part substantielle des Épiques', () => {
    // Les cent quarante-neuf Épiques ne sont pas tous décrits, et c'est
    // assumé : je n'écris une signature que pour un personnage dont
    // l'apparence est établie. Les autres passent par le repli déterministe.
    //
    // Ce seuil n'est pas une cible à atteindre, c'est un cliquet : il empêche
    // qu'une refonte du référentiel fasse silencieusement retomber la
    // couverture à zéro.
    const epiques = CHARACTERS.filter((c) => c.rarity === 'EPIC');
    const decrits = epiques.filter((c) => signatureOf(c.id) !== null);
    expect(decrits.length / epiques.length).toBeGreaterThan(0.4);
  });

  it('marque les héros comme nommés, jamais comme repli', () => {
    for (const c of HEROS) {
      const t = spriteTraits({ id: c.id, rarity: c.rarity, attributes: [] });
      expect(t.named, c.id).toBe(true);
    }
  });
});
