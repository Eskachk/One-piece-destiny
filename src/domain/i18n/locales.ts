import { COMMUN } from './messages/commun';
import { ENTREE } from './messages/entree';
import { TUTORIEL } from './messages/tutoriel';
import { EQUIPAGE } from './messages/equipage';
import { CLASSEMENT } from './messages/classement';
import { COLLECTION } from './messages/collection';
import { MARCHE } from './messages/marche';
import { BOUTIQUE } from './messages/boutique';
import { PROFIL } from './messages/profil';

/**
 * Langues de l'interface.
 *
 * ## Où en est la traduction, et pourquoi c'est écrit ici
 *
 * Le français est la langue d'écriture du produit ; l'anglais couvre
 * désormais tout ce qu'un joueur traverse — entrée, visites guidées, les six
 * onglets, les messages des actions et les titres d'onglet. Restent en
 * français le Poste de commandement, réservé à l'administration, et les
 * courriels : la langue y est choisie par appareil, dans un cookie, et un
 * courriel part vers un compte, pas vers un appareil.
 *
 * Cette limite est **affichée au joueur** dans les paramètres. Une langue
 * proposée sans dire ce qu'elle couvre est un piège : on la choisit, et on
 * découvre au troisième écran que rien n'a changé.
 *
 * ## Un dictionnaire par zone
 *
 * Un seul objet aurait dépassé les mille lignes. Chaque zone du produit a le
 * sien dans `messages/`, et ils sont fusionnés ici. Une clé absente d'une
 * langue se voit : `tests` compare les deux tables et refuse tout écart, y
 * compris un `{paramètre}` présent d'un côté et pas de l'autre.
 *
 * Les clés sont préfixées par zone (`nav.`, `shop.`) : même regroupement à la
 * lecture qu'un arbre, sans la traversée à l'écriture.
 */

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export const LOCALE_LABEL: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

/** Ce que chaque langue couvre réellement, en une phrase, dans sa langue. */
export const COVERAGE: Record<Locale, string | null> = {
  fr: null,
  en: 'The whole game is translated. Emails and the admin area are still in French.',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Langue déduite de l'en-tête `Accept-Language`.
 *
 * Sert uniquement au **premier** affichage, avant que le joueur n'ait choisi.
 * Une fois le choix fait, il l'emporte toujours : un réglage explicite ne doit
 * jamais être écrasé par une détection.
 *
 * L'analyse est volontairement grossière — on cherche le premier code de
 * langue reconnu, sans traiter les pondérations `q=`. Trier par poids ne
 * changerait le résultat que pour des configurations rares, et le coût en
 * complexité serait sans rapport avec le gain.
 */
export function localeFromHeader(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  for (const part of header.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(tag)) return tag;
  }

  return DEFAULT_LOCALE;
}

export const MESSAGES = {
  fr: {
    ...COMMUN.fr,
    ...ENTREE.fr,
    ...TUTORIEL.fr,
    ...EQUIPAGE.fr,
    ...CLASSEMENT.fr,
    ...COLLECTION.fr,
    ...MARCHE.fr,
    ...BOUTIQUE.fr,
    ...PROFIL.fr,
  },
  en: {
    ...COMMUN.en,
    ...ENTREE.en,
    ...TUTORIEL.en,
    ...EQUIPAGE.en,
    ...CLASSEMENT.en,
    ...COLLECTION.en,
    ...MARCHE.en,
    ...BOUTIQUE.en,
    ...PROFIL.en,
  },
} as const;

export type MessageKey = keyof (typeof MESSAGES)['fr'];

/** Valeurs qu'une phrase peut interpoler : `{n}`, `{name}`… */
export type Params = Record<string, string | number>;

export type Traducteur = (key: MessageKey, params?: Params) => string;

/**
 * Traducteur pour une langue donnée.
 *
 * Repli sur le français plutôt que sur la clé brute : voir « settings.motion »
 * dans une page serait pire que de la voir en français, qui reste du texte
 * qu'un humain a écrit pour être lu.
 *
 * Les paramètres s'écrivent `{nom}` dans la phrase. Un paramètre non fourni
 * reste visible tel quel — c'est un défaut qu'on veut voir, pas cacher.
 */
export function translator(locale: Locale): Traducteur {
  const table: Record<string, string> = MESSAGES[locale];
  const repli: Record<string, string> = MESSAGES.fr;

  return (key, params) => {
    const phrase = table[key] ?? repli[key] ?? key;
    if (!params) return phrase;
    return phrase.replace(/\{(\w+)\}/g, (tout, nom: string) =>
      nom in params ? String(params[nom]) : tout,
    );
  };
}

/**
 * Pluriel : choisit `<clé>.one` ou `<clé>.other` selon `n`, et interpole `n`.
 *
 * Deux formes suffisent au français et à l'anglais. Le français met au
 * singulier zéro et un ; l'anglais, un seulement — `Intl.PluralRules` connaît
 * ces règles, inutile de les réécrire.
 */
export function pluriel(locale: Locale): (base: string, n: number, params?: Params) => string {
  const t = translator(locale);
  const regles = new Intl.PluralRules(locale);
  return (base, n, params) => {
    const forme = regles.select(n) === 'one' ? 'one' : 'other';
    return t(`${base}.${forme}` as MessageKey, { n, ...params });
  };
}

/** Formatage des nombres dans la langue courante — « 7 500 » ou « 7,500 ». */
export function nombre(locale: Locale): (n: number) => string {
  const f = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB');
  return (n) => f.format(n);
}

/** Formatage d'un prix en euros dans la langue courante. */
export function euros(locale: Locale): (cents: number) => string {
  const f = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
  });
  return (cents) => f.format(cents / 100);
}

/**
 * Traduit un message que le serveur a rendu **en français**.
 *
 * Les services d'authentification, de boutique ou de marché renvoient des
 * phrases françaises : c'est la langue d'écriture du produit, et leur faire
 * porter la langue de l'appelant aurait dispersé la traduction dans vingt
 * fichiers. Le dictionnaire reprend ces phrases mot pour mot ; on retrouve la
 * clé par la phrase, puis on traduit.
 *
 * Deux tables, construites une fois à la première demande :
 *
 *   — les phrases **fixes**, retrouvées à l'identique ;
 *   — les phrases à **paramètres** — « au moins {n} caractères » — dont le
 *     serveur ne rend jamais que la forme résolue, « au moins 12 caractères ».
 *     Chaque gabarit devient une expression régulière à groupes nommés, et
 *     les valeurs capturées sont réinjectées dans la traduction.
 *
 * Un message inconnu est rendu tel quel — en français, donc, ce qui reste
 * lisible.
 */
let fixes: Map<string, MessageKey> | null = null;
let gabarits: { cle: MessageKey; motif: RegExp }[] = [];

function preparerInverse(): void {
  fixes = new Map();
  gabarits = [];
  // Sans expression régulière : les métacaractères sont listés un à un. Une
  // classe `[.*+?^${}()|[\]\\]` est correcte, mais elle a été mutilée deux
  // fois par les outils qui l'ont écrite — la liste, elle, ne l'est pas.
  const SPECIAUX = new Set(['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']);
  const echapper = (t: string) =>
    [...t].map((c) => (SPECIAUX.has(c) ? '\\' + c : c)).join('');

  for (const [cle, phrase] of Object.entries(MESSAGES.fr) as [MessageKey, string][]) {
    if (!/\{\w+\}/.test(phrase)) {
      fixes.set(phrase, cle);
      continue;
    }
    const source = phrase
      .split(/(\{\w+\})/)
      .map((morceau) => {
        const param = morceau.match(/^\{(\w+)\}$/);
        return param ? `(?<${param[1]}>.+?)` : echapper(morceau);
      })
      .join('');
    gabarits.push({ cle, motif: new RegExp(`^${source}$`) });
  }
}

export function traduireMessage(locale: Locale, message: string): string {
  if (locale === DEFAULT_LOCALE) return message;
  if (!fixes) preparerInverse();

  const fixe = fixes!.get(message);
  if (fixe) return translator(locale)(fixe);

  for (const { cle, motif } of gabarits) {
    const m = motif.exec(message);
    if (m) return translator(locale)(cle, (m.groups ?? {}) as Params);
  }

  return message;
}
