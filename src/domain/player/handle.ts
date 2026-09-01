/**
 * Pseudonyme de joueur.
 *
 * Jusqu'ici le pseudo était fabriqué à partir de l'adresse e-mail :
 * `capitaine@exemple.fr` devenait `capitaine-k3f9`. Deux défauts, et le second
 * est grave :
 *
 *   — le joueur ne choisissait rien, et se retrouvait avec un suffixe
 *     technique affiché au classement et sur le Market ;
 *   — **la partie locale de l'adresse fuitait.** Le pseudo est public : il
 *     apparaît sur chaque annonce du Market et sur chaque ligne du classement.
 *     Publier `prenom.nom` parce que c'est l'adresse de quelqu'un n'est pas
 *     une décision que le produit doit prendre à sa place.
 *
 * Le pseudo est donc saisi à l'inscription, validé ici, et jamais dérivé de
 * l'adresse.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;

export type HandleIssue =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'CHARACTERS'
  | 'EDGES'
  | 'RESERVED';

/**
 * Mots réservés.
 *
 * Un joueur nommé « Admin » ou « Modérateur » sur une annonce du Market est
 * une usurpation à coût nul. La liste couvre les formes qu'un joueur lirait
 * comme une autorité du produit, pas les noms de l'œuvre — se nommer « Luffy »
 * ne trompe personne.
 */
const RESERVED = new Set([
  'admin',
  'administrateur',
  'administrator',
  'moderateur',
  'moderator',
  'modo',
  'staff',
  'support',
  'systeme',
  'system',
  'officiel',
  'official',
  'grandlineweekly',
  'onepiecequest',
  'root',
  'null',
  'undefined',
  'anonyme',
]);

/**
 * Caractères acceptés : lettres, chiffres, tiret, souligné, point.
 *
 * Les lettres accentuées sont acceptées — refuser « Océane » serait absurde
 * pour un produit francophone. En revanche l'espace est refusé : il rend deux
 * pseudos visuellement identiques (« Ace » et « Ace ») et complique chaque
 * affichage en ligne.
 */
const ALLOWED = /^[\p{L}\p{N}][\p{L}\p{N}._-]*[\p{L}\p{N}]$/u;

/**
 * Forme de comparaison.
 *
 * L'unicité doit tenir sur ce que l'œil lit, pas sur les octets : sans cette
 * normalisation, `Shanks`, `shanks` et `S_h_a_n_k_s` seraient trois joueurs
 * différents, et le troisième pourrait se faire passer pour le premier.
 */
export function canonicalHandle(handle: string): string {
  return handle
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[._-]/g, '');
}

export function normalizeHandle(input: string): string {
  // Espaces internes compressés puis retirés : coller les mots vaut mieux que
  // refuser une saisie que le joueur croit valide.
  return input.trim().replace(/\s+/g, '');
}

export function checkHandle(input: string): { valid: boolean; issue?: HandleIssue } {
  const handle = normalizeHandle(input);

  if ([...handle].length < HANDLE_MIN_LENGTH) return { valid: false, issue: 'TOO_SHORT' };
  if ([...handle].length > HANDLE_MAX_LENGTH) return { valid: false, issue: 'TOO_LONG' };
  if (/^[._-]|[._-]$/.test(handle)) return { valid: false, issue: 'EDGES' };
  if (!ALLOWED.test(handle)) return { valid: false, issue: 'CHARACTERS' };
  if (RESERVED.has(canonicalHandle(handle))) return { valid: false, issue: 'RESERVED' };

  return { valid: true };
}

export function describeHandleIssue(issue: HandleIssue): string {
  switch (issue) {
    case 'TOO_SHORT':
      return `Le pseudo fait au moins ${HANDLE_MIN_LENGTH} caractères.`;
    case 'TOO_LONG':
      return `Le pseudo fait au plus ${HANDLE_MAX_LENGTH} caractères.`;
    case 'CHARACTERS':
      return 'Lettres, chiffres, tiret, point et souligné seulement.';
    case 'EDGES':
      return 'Le pseudo commence et finit par une lettre ou un chiffre.';
    case 'RESERVED':
      return 'Ce pseudo est réservé. Choisis-en un autre.';
  }
}

/**
 * Pseudo de repli, pour les comptes créés sans saisie — connexion Google.
 *
 * Il ne reprend **rien** de l'adresse : ni la partie locale, ni le domaine.
 * Un nom de la mer plus quatre chiffres se lit comme un pseudo et ne publie
 * l'identité de personne. Le joueur le change ensuite dans ses paramètres.
 */
const FALLBACK_WORDS = [
  'Moussaillon', 'Vigie', 'Timonier', 'Corsaire', 'Navigateur',
  'Gabier', 'Cartographe', 'Boucanier', 'Matelot', 'Capitaine',
  'Sextant', 'Alizé', 'Cabestan', 'Hunier', 'Beaupré',
];

export function fallbackHandle(random: () => number = Math.random): string {
  const word = FALLBACK_WORDS[Math.floor(random() * FALLBACK_WORDS.length)];
  const digits = String(Math.floor(random() * 10_000)).padStart(4, '0');
  return `${word}-${digits}`;
}
