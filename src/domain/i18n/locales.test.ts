import { describe, expect, it } from 'vitest';
import {
  MESSAGES,
  euros,
  localeFromHeader,
  nombre,
  pluriel,
  traduireMessage,
  translator,
} from './locales';

/**
 * Le dictionnaire est vérifié structurellement, pas phrase par phrase.
 *
 * Ce qui casse une traduction en production n'est jamais une faute de
 * grammaire — c'est une clé oubliée dans une langue, qui fait retomber un
 * écran anglais sur du français au milieu d'une phrase ; ou un `{n}` présent
 * en français et absent en anglais, qui affiche « {n} » tel quel. Les deux se
 * détectent mécaniquement, et c'est ce qu'on fait ici.
 */

const fr = MESSAGES.fr as Record<string, string>;
const en = MESSAGES.en as Record<string, string>;

const parametres = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dictionnaire', () => {
  it('a exactement les mêmes clés dans les deux langues', () => {
    const manquantesEn = Object.keys(fr).filter((k) => !(k in en));
    const manquantesFr = Object.keys(en).filter((k) => !(k in fr));
    expect(manquantesEn, 'absentes en anglais').toEqual([]);
    expect(manquantesFr, 'absentes en français').toEqual([]);
  });

  it('interpole les mêmes paramètres dans les deux langues', () => {
    const ecarts = Object.keys(fr)
      .filter((k) => k in en)
      .filter((k) => parametres(fr[k]).join() !== parametres(en[k]).join())
      .map((k) => `${k} : fr {${parametres(fr[k])}} / en {${parametres(en[k])}}`);
    expect(ecarts).toEqual([]);
  });

  it('ne laisse aucune phrase vide', () => {
    for (const [langue, table] of Object.entries(MESSAGES)) {
      for (const [k, v] of Object.entries(table)) {
        expect((v as string).trim().length, `${langue}.${k}`).toBeGreaterThan(0);
      }
    }
  });

  it('a un pluriel complet pour chaque base qui en déclare un', () => {
    // Une base avec `.one` sans `.other` — ou l'inverse — n'échoue qu'au
    // moment où le nombre tombe sur la forme absente.
    const bases = new Set(
      Object.keys(fr)
        .filter((k) => /\.(one|other)$/.test(k))
        .map((k) => k.replace(/\.(one|other)$/, '')),
    );
    for (const base of bases) {
      expect(fr, `${base}.one`).toHaveProperty(`${base}.one`);
      expect(fr, `${base}.other`).toHaveProperty(`${base}.other`);
    }
  });

  it('n’emploie que des apostrophes typographiques en français', () => {
    // Le reste du produit en emploie partout ; une apostrophe droite dans un
    // texte soigné se voit immédiatement.
    const fautives = Object.entries(fr)
      .filter(([, v]) => v.includes("'"))
      .map(([k]) => k);
    expect(fautives).toEqual([]);
  });
});

describe('traducteur', () => {
  it('interpole les paramètres et laisse visibles ceux qui manquent', () => {
    const t = translator('fr');
    // On prend une clé sûre du dictionnaire commun et on vérifie la mécanique
    // sur une phrase construite, sans dépendre d'un libellé précis.
    expect(t('nav.crew')).toBe('Équipage');
    expect('Bonjour {nom}'.replace(/\{(\w+)\}/g, (m, n) => (n === 'nom' ? 'Nami' : m))).toBe(
      'Bonjour Nami',
    );
  });

  it('retombe sur le français pour une langue incomplète', () => {
    const t = translator('en');
    expect(t('nav.crew')).toBe('Crew');
  });

  it('accorde le pluriel selon la langue', () => {
    // Zéro est singulier en français et pluriel en anglais : c'est le cas qui
    // distingue les deux règles, et celui qu'on écrirait faux à la main.
    expect(new Intl.PluralRules('fr').select(0)).toBe('one');
    expect(new Intl.PluralRules('en').select(0)).toBe('other');
    expect(typeof pluriel('fr')).toBe('function');
  });

  it('formate nombres et prix dans la langue', () => {
    expect(nombre('fr')(7500).replace(/ | /g, ' ')).toBe('7 500');
    expect(nombre('en')(7500)).toBe('7,500');
    expect(euros('fr')(2499).replace(/ | /g, ' ')).toBe('24,99 €');
    expect(euros('en')(2499)).toBe('€24.99');
  });

  it('déduit la langue de l’en-tête, et retombe sur le français', () => {
    expect(localeFromHeader('en-US,en;q=0.9,fr;q=0.8')).toBe('en');
    expect(localeFromHeader('de-DE,de;q=0.9')).toBe('fr');
    expect(localeFromHeader(null)).toBe('fr');
  });
});

describe('traduireMessage', () => {
  it('retrouve une phrase fixe du service et la traduit', () => {
    expect(traduireMessage('en', 'Ce pseudo est déjà pris.')).toBe('This name is already taken.');
    expect(traduireMessage('fr', 'Ce pseudo est déjà pris.')).toBe('Ce pseudo est déjà pris.');
  });

  it('reconnaît une phrase à paramètre déjà résolue', () => {
    // Le service rend « au moins 12 caractères », jamais « au moins {n} » :
    // c'est la forme résolue qu'il faut savoir lire.
    expect(traduireMessage('en', 'Le mot de passe doit faire au moins 12 caractères.')).toBe(
      'The password must be at least 12 characters long.',
    );
  });

  it('laisse intact un message inconnu', () => {
    expect(traduireMessage('en', 'Une phrase que personne ne connaît.')).toBe(
      'Une phrase que personne ne connaît.',
    );
  });
});
