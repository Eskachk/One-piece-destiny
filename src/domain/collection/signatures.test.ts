import { describe, expect, it } from 'vitest';
import { isCanon } from '../../data/non-canon';
import { ALL_CHARACTERS, CHARACTERS } from '../../data/characters';
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
    // le personnage a été renommé, et le portrait écrit pour lui ne sera
    // jamais rendu.
    //
    // La comparaison porte sur le référentiel **brut**, exclusions comprises.
    // Un personnage retiré du jeu — un mort, un doublon — garde sa signature
    // à dessein : elle attend qu'on le réintègre. Comparer aux seuls
    // personnages jouables ferait échouer ce test à chaque exclusion, pour
    // une donnée qu'on veut justement conserver.
    const connus = new Set(ALL_CHARACTERS.map((c) => c.id));
    const orphelines = Object.keys(SIGNATURES).filter((id) => !connus.has(id));
    expect(orphelines).toEqual([]);
  });

  it('décrit **tous** les Épiques, les Légendaires et les Mythiques', () => {
    // La règle a changé : ces trois raretés sont celles qui portent le jeu, et
    // ce sont les seules où l'on investit dans la ressemblance. Le repli
    // déterministe reste pour les Communs et les Rares.
    //
    // Ce n'est plus un cliquet mais une exigence : un personnage ajouté à l'une
    // de ces raretés sans signature sortirait un visage tiré de l'empreinte de
    // son identifiant, au milieu de cartes qui ont toutes la leur. L'écart se
    // verrait immédiatement, et rien ne l'aurait signalé.
    const manquants = CHARACTERS.filter(
      (c) =>
        isCanon(c.id) &&
        (c.rarity === 'EPIC' || c.rarity === 'LEGENDARY' || c.rarity === 'MYTHIC') &&
        signatureOf(c.id) === null,
    );
    expect(manquants.map((c) => `${c.rarity} ${c.id}`)).toEqual([]);
  });

  it('ne laisse aucune relation pendante', () => {
    // Retirer un personnage — doublon ou hors manga — laisse derrière lui les
    // liens que les autres pointaient vers lui. Ils ne faussent aucun score,
    // puisqu'une synergie ne compte que si l'autre apparaît réellement, mais
    // ils s'afficheraient sur une fiche en promettant un bonus impossible.
    //
    // `CHARACTERS` élague ces liens à l'export. Ce test vérifie que l'élagage
    // fonctionne, parce qu'il est facile de retirer un personnage en oubliant
    // qu'il en existe un.
    const connus = new Set(CHARACTERS.map((c) => c.id));
    const pendantes = CHARACTERS.flatMap((c) =>
      c.relations.filter((r) => !connus.has(r.to)).map((r) => `${c.id} → ${r.to}`),
    );
    expect(pendantes).toEqual([]);
  });

  it('ne dessine pas en humain ce que la description dit non humain', () => {
    /*
     * Neuf Épiques sur cent quarante-huit portaient un plan de corps déclaré.
     * Les quatre Homies de Big Mom — dont les fiches disent mot pour mot
     * « aucune anatomie humaine » — sortaient quatre petits bonshommes à
     * jambes ; Speed, « transformée en centaure », en avait deux ; Masira,
     * Hamburg et Nezumi, tous trois anthropomorphes, avaient un visage
     * d'homme.
     *
     * Ce test relit les fiches. Toute signature dont la description annonce
     * une race non humaine doit porter un `frame` qui n'est pas `human` — et
     * la faute est facile à refaire, puisque le patron humain reste le repli
     * de tout le monde.
     */
    const RACES = [
      'homie',
      'centaure',
      'anthropomorphe',
      'simiesque',
      'homme-poisson',
      'femme-poisson',
      'squelette',
      'renne',
    ];
    const sansAccent = (t: string) =>
      t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const fautifs: string[] = [];
    for (const [id, signature] of Object.entries(SIGNATURES)) {
      const note = sansAccent(signature.note);
      // Seule la mention de la **race** compte : « col de fourrure » ou
      // « manteau de fourrure » décrivent un vêtement, pas une espèce, et
      // c'est ce qui avait fait prendre Katakuri et Whitey Bay pour des ours.
      const race = note.slice(0, note.indexOf('. ') + 1 || note.length);
      if (RACES.some((r) => race.includes(r)) && (signature.frame ?? 'human') === 'human') {
        fautifs.push(id);
      }
    }
    expect(fautifs).toEqual([]);
  });

  it('marque les héros comme nommés, jamais comme repli', () => {
    for (const c of HEROS) {
      const t = spriteTraits({ id: c.id, rarity: c.rarity, attributes: [] });
      expect(t.named, c.id).toBe(true);
    }
  });
});
