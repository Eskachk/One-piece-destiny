import { describe, expect, it } from 'vitest';
import {
  CRITERES_PAR_DEFAUT,
  comparable,
  comptesParAttribut,
  compterParRarete,
  correspond,
  trier,
  type Carte,
} from './tri';
import { attributesOf, catalogueAttributs } from './attributes';
import { CHARACTERS, CHARACTER_INDEX } from '../../data/characters';
import { isCanon } from '../../data/non-canon';

const c = (id: string, name: string, rarity: Carte['rarity']): Carte => ({
  id,
  name,
  rarity,
});

const LOT: Carte[] = [
  c('luffy', 'Monkey D. Luffy', 'MYTHIC'),
  c('zoro', 'Roronoa Zoro', 'MYTHIC'),
  c('kinemon', 'Kinémon', 'COMMON'),
  c('robin', 'Nico Robin', 'MYTHIC'),
  c('koby', 'Koby', 'LEGENDARY'),
  c('bonney', 'Jewelry Bonney', 'LEGENDARY'),
  c('helmeppo', 'Helmeppo', 'COMMON'),
];

describe('recherche et tri des cartes', () => {
  describe('forme comparable', () => {
    it('ignore les accents', () => {
      // Un joueur tape « kinemon ». Sans cette normalisation, il conclut que
      // le personnage n'est pas dans le jeu.
      expect(comparable('Kinémon')).toBe(comparable('kinemon'));
      expect(comparable('Portgas D. Ace')).toBe('portgas d ace');
    });

    it('ignore la ponctuation et la casse', () => {
      expect(comparable('Monkey D. Luffy')).toBe('monkey d luffy');
      expect(comparable('  NICO   ROBIN  ')).toBe('nico robin');
    });
  });

  describe('correspondance', () => {
    it('trouve un mot au milieu du nom', () => {
      expect(correspond('Monkey D. Luffy', 'luffy')).toBe(true);
      expect(correspond('Roronoa Zoro', 'zoro')).toBe(true);
    });

    it('accepte les mots dans le désordre', () => {
      // L'ordre prénom/nom n'est jamais sûr avec des noms propres étrangers.
      expect(correspond('Nico Robin', 'robin nico')).toBe(true);
    });

    it('exige que tous les mots soient présents', () => {
      expect(correspond('Nico Robin', 'nico luffy')).toBe(false);
    });

    it('une recherche vide laisse tout passer', () => {
      expect(correspond('Koby', '')).toBe(true);
      expect(correspond('Koby', '   ')).toBe(true);
    });

    it('trouve un personnage accentué sans taper l’accent', () => {
      const kinemon = CHARACTER_INDEX.get('kinemon');
      expect(kinemon?.name).toContain('é');
      expect(correspond(kinemon!.name, 'kinemon')).toBe(true);
    });
  });

  describe('tri', () => {
    it('classe du plus rare au plus commun par défaut', () => {
      const out = trier(LOT, CRITERES_PAR_DEFAUT);
      expect(out[0].rarity).toBe('MYTHIC');
      expect(out[out.length - 1].rarity).toBe('COMMON');
    });

    it('range les ex æquo par ordre alphabétique', () => {
      // Sans cela, deux ouvertures de coffre ne rangeraient pas la collection
      // pareil, et le joueur ne retrouverait pas une carte où il l'a laissée.
      const mythiques = trier(LOT, CRITERES_PAR_DEFAUT).filter(
        (x) => x.rarity === 'MYTHIC',
      );
      expect(mythiques.map((x) => x.name)).toEqual([
        'Monkey D. Luffy',
        'Nico Robin',
        'Roronoa Zoro',
      ]);
    });

    it('sait inverser', () => {
      const out = trier(LOT, { ...CRITERES_PAR_DEFAUT, tri: 'RARETE_ASC' });
      expect(out[0].rarity).toBe('COMMON');
      expect(out[out.length - 1].rarity).toBe('MYTHIC');
    });

    it('sait classer par nom, accents compris', () => {
      const out = trier(LOT, { ...CRITERES_PAR_DEFAUT, tri: 'NOM' });
      // `localeCompare` en français place « Kinémon » entre Jewelry et Koby ;
      // une comparaison brute de chaînes le renverrait après « Zoro ».
      expect(out.map((x) => x.name)).toEqual([
        'Helmeppo',
        'Jewelry Bonney',
        'Kinémon',
        'Koby',
        'Monkey D. Luffy',
        'Nico Robin',
        'Roronoa Zoro',
      ]);
    });

    it('ne perd ni ne duplique personne', () => {
      const out = trier(LOT, CRITERES_PAR_DEFAUT);
      expect(out).toHaveLength(LOT.length);
      expect(new Set(out.map((x) => x.id)).size).toBe(LOT.length);
    });

    it('ne modifie pas la liste reçue', () => {
      // `Array.sort` trie en place : trier sans copier réordonnerait la liste
      // du serveur, et le composant appelant verrait son état changer sous lui.
      const copie = [...LOT];
      trier(LOT, { ...CRITERES_PAR_DEFAUT, tri: 'NOM' });
      expect(LOT).toEqual(copie);
    });
  });

  describe('filtre de rareté', () => {
    it('ne garde que la rareté demandée', () => {
      const out = trier(LOT, { ...CRITERES_PAR_DEFAUT, rarete: 'LEGENDARY' });
      expect(out.map((x) => x.name).sort()).toEqual(['Jewelry Bonney', 'Koby']);
    });

    it('se combine avec la recherche', () => {
      const out = trier(LOT, {
        ...CRITERES_PAR_DEFAUT,
        rarete: 'MYTHIC',
        recherche: 'ro',
      });
      expect(out.map((x) => x.name)).toEqual(['Nico Robin', 'Roronoa Zoro']);
    });
  });

  describe('comptes', () => {
    it('compte chaque rareté, y compris celles à zéro', () => {
      // Une rareté absente doit valoir 0 et non `undefined` : le libellé du
      // filtre affiche ce nombre, et « Mythique (undefined) » serait pire que
      // pas de nombre du tout.
      const n = compterParRarete(LOT);
      expect(n.MYTHIC).toBe(3);
      expect(n.LEGENDARY).toBe(2);
      expect(n.COMMON).toBe(2);
      expect(n.EPIC).toBe(0);
      expect(n.RARE).toBe(0);
    });
  });

  describe('sur le vrai référentiel', () => {
    const jouables = CHARACTERS.filter((ch) => isCanon(ch.id));

    it('trouve les personnages usuels par un fragment de leur nom', () => {
      const cas: [string, string][] = [
        ['luffy', 'luffy'],
        ['zoro', 'zoro'],
        ['kinemon', 'kinemon'],
        ['chopper', 'chopper'],
        // Barbe Blanche est mort : il ne fait plus partie du jeu. On vérifie
        // la recherche en plusieurs mots sur un personnage encore jouable.
        ['monkey luffy', 'luffy'],
      ];
      for (const [saisie, attendu] of cas) {
        const out = trier(jouables, { ...CRITERES_PAR_DEFAUT, recherche: saisie });
        expect(
          out.some((x) => x.id === attendu),
          `« ${saisie} » ne trouve pas ${attendu}`,
        ).toBe(true);
      }
    });

    it('une recherche sans résultat rend une liste vide, pas une erreur', () => {
      const out = trier(jouables, {
        ...CRITERES_PAR_DEFAUT,
        recherche: 'zzzzz introuvable',
      });
      expect(out).toEqual([]);
    });

    it('les Doyens se trouvent par leur nom', () => {
      // Ils s'appelaient « 1er Doyen » à « 5e Doyen » : des étiquettes
      // d'import, que personne n'aurait songé à taper.
      for (const nom of ['saturn', 'mars', 'warcury', 'nusjuro', 'ju peter']) {
        const out = trier(jouables, { ...CRITERES_PAR_DEFAUT, recherche: nom });
        expect(out.length, `« ${nom} » ne trouve personne`).toBeGreaterThan(0);
      }
    });
  });
});

describe('filtre par attributs, cumulable', () => {
  /*
   * Un jeu de cartes minimal, écrit à la main : on veut vérifier la règle du
   * cumul, pas la table des attributs du référentiel.
   */
  const cartes: Carte[] = [
    { id: 'a', name: 'Alpha', rarity: 'EPIC', attributs: ['sword', 'marine'] },
    { id: 'b', name: 'Beta', rarity: 'EPIC', attributs: ['sword', 'conqueror'] },
    { id: 'c', name: 'Gamma', rarity: 'RARE', attributs: ['marine'] },
    { id: 'd', name: 'Delta', rarity: 'RARE', attributs: [] },
  ];

  const avec = (...attributs: string[]) => ({
    ...CRITERES_PAR_DEFAUT,
    attributs,
  });

  it('sans attribut demandé, ne retire personne', () => {
    expect(trier(cartes, CRITERES_PAR_DEFAUT)).toHaveLength(4);
  });

  it('un attribut ne garde que ceux qui le portent', () => {
    expect(trier(cartes, avec('sword')).map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('deux attributs se cumulent en ET, jamais en OU', () => {
    /*
     * C'est **la** règle de la fonctionnalité. En OU, cocher un second
     * attribut élargirait la liste — l'inverse de ce qu'on attend d'un filtre,
     * où chaque critère ajouté doit restreindre. Ici « épéiste » et « Marine »
     * ensemble ne laissent qu'Alpha, pas Alpha, Beta et Gamma.
     */
    expect(trier(cartes, avec('sword', 'marine')).map((c) => c.id)).toEqual(['a']);
  });

  it('une combinaison sans porteur ne rend rien', () => {
    expect(trier(cartes, avec('conqueror', 'marine'))).toHaveLength(0);
  });

  it('se combine avec la rareté et la recherche', () => {
    const out = trier(cartes, {
      ...CRITERES_PAR_DEFAUT,
      attributs: ['sword'],
      rarete: 'EPIC',
      recherche: 'beta',
    });
    expect(out.map((c) => c.id)).toEqual(['b']);
  });

  it('une carte sans attribut est écartée dès qu’on en demande un', () => {
    expect(trier(cartes, avec('sword')).some((c) => c.id === 'd')).toBe(false);
  });
});

describe('comptes annoncés sur les pastilles', () => {
  const cartes: Carte[] = [
    { id: 'a', name: 'Alpha', rarity: 'EPIC', attributs: ['sword', 'marine'] },
    { id: 'b', name: 'Beta', rarity: 'EPIC', attributs: ['sword', 'conqueror'] },
    { id: 'c', name: 'Gamma', rarity: 'RARE', attributs: ['marine'] },
  ];

  it('annonce ce qu’un clic donnerait, pas un total figé', () => {
    /*
     * Le défaut qu'on évite : afficher le compte global. « ⚔️ Épéiste (2) »
     * resterait à 2 après avoir coché « Haki des Rois », et le joueur
     * cliquerait sur une combinaison vide en croyant l'inverse.
     */
    const comptes = comptesParAttribut(cartes, {
      ...CRITERES_PAR_DEFAUT,
      attributs: ['conqueror'],
    });

    // Avec « Haki des Rois » déjà coché, « épéiste » ne rendrait que Beta.
    expect(comptes.get('sword')).toBe(1);
    // Et « Marine » ne rendrait plus rien : la pastille doit s'éteindre.
    expect(comptes.get('marine')).toBe(0);
  });

  it('compte un attribut déjà coché sur les critères sans lui', () => {
    // Sa pastille annonce alors ce qu'on garderait en la laissant cochée,
    // seule lecture utile d'un critère actif.
    const comptes = comptesParAttribut(cartes, {
      ...CRITERES_PAR_DEFAUT,
      attributs: ['sword'],
    });
    expect(comptes.get('sword')).toBe(2);
  });

  it('ne propose aucun attribut que personne ne porte', () => {
    const comptes = comptesParAttribut(cartes, CRITERES_PAR_DEFAUT);
    expect(comptes.has('fruit')).toBe(false);
  });
});

describe('catalogue des pastilles', () => {
  it('groupe par famille et ne retient que ce qui est présent', () => {
    const zoro = CHARACTER_INDEX.get('zoro')!;
    const groupes = catalogueAttributs([zoro]);

    const proposes = groupes.flatMap((g) => g.attributs.map((a) => a.id)).sort();
    const reels = attributesOf(zoro).map((a) => a.id).sort();
    expect(proposes).toEqual(reels);

    // Chaque groupe porte un intitulé lisible et au moins une pastille : un
    // titre de famille suivi du vide serait du bruit.
    for (const groupe of groupes) {
      expect(groupe.titre.length).toBeGreaterThan(0);
      expect(groupe.attributs.length).toBeGreaterThan(0);
    }
  });

  it('ne répète jamais un attribut porté par plusieurs personnages', () => {
    const groupes = catalogueAttributs(CHARACTERS.slice(0, 120));
    const ids = groupes.flatMap((g) => g.attributs.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('compte par rareté, contextuel', () => {
  const cartes: Carte[] = [
    { id: 'a', name: 'Alpha', rarity: 'EPIC', attributs: ['sword'] },
    { id: 'b', name: 'Beta', rarity: 'EPIC', attributs: [] },
    { id: 'c', name: 'Gamma', rarity: 'RARE', attributs: ['sword'] },
  ];

  it('sans critères, compte tout', () => {
    const out = compterParRarete(cartes);
    expect(out.EPIC).toBe(2);
    expect(out.RARE).toBe(1);
  });

  it('avec un attribut coché, dit ce que la rareté donnerait', () => {
    /*
     * Les deux contrôles se contrediraient sinon. Les pastilles annoncent
     * déjà ce qu'un clic donnerait ; laisser « Épique (2) » à côté d'un
     * attribut qui n'en laisse qu'un produirait le défaut que le compte par
     * rareté avait été écrit pour éviter — une grille plus vide qu'annoncé.
     */
    const out = compterParRarete(cartes, {
      ...CRITERES_PAR_DEFAUT,
      attributs: ['sword'],
    });
    expect(out.EPIC).toBe(1);
    expect(out.RARE).toBe(1);
  });

  it('ignore la rareté déjà choisie : la liste est à choix unique', () => {
    // Chaque option remplace la précédente ; compter « Épique » sous le
    // filtre « Rare » donnerait zéro partout sauf sur l'option active.
    const out = compterParRarete(cartes, {
      ...CRITERES_PAR_DEFAUT,
      rarete: 'RARE',
    });
    expect(out.EPIC).toBe(2);
  });
});


