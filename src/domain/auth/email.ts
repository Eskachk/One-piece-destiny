/**
 * Forme canonique d'une adresse e-mail (cahier §43, §71).
 *
 * ## Le défaut que ceci corrige
 *
 * L'unicité des comptes se jugeait sur l'adresse en minuscules. Or une seule
 * boîte Gmail répond à une infinité d'adresses : `luffy+1@gmail.com`,
 * `luffy+2@gmail.com`, `l.u.f.f.y@gmail.com` arrivent toutes chez `luffy`.
 * Chaque variante ouvrait un compte, recevait son lien de confirmation, et
 * passait donc pour une « adresse confirmée » distincte, c'est-à-dire pour
 * une personne de plus. Tout ce qui repose sur l'adresse confirmée (le
 * versement au parrain, l'accès au Marché) s'achetait ainsi gratuitement.
 *
 * ## Ce qui est canonique
 *
 * - la casse et les espaces autour ;
 * - le suffixe `+étiquette` de la partie locale, que la plupart des
 *   fournisseurs traitent comme un alias ;
 * - pour Gmail seulement, les points de la partie locale (Gmail les ignore,
 *   les autres fournisseurs non) et le domaine `googlemail.com`, qui est le
 *   même service.
 *
 * La forme canonique ne sert qu'à **l'unicité**. L'adresse telle que saisie
 * reste celle qu'on affiche, celle à laquelle on écrit, et celle avec
 * laquelle on se connecte : un joueur inscrit avec `luffy+opq@gmail.com` se
 * connecte avec cette adresse-là.
 */

const GMAIL = new Set(['gmail.com', 'googlemail.com']);

export function canonicalEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at <= 0) return email;

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);

  const plus = local.indexOf('+');
  if (plus > 0) local = local.slice(0, plus);

  if (GMAIL.has(domain)) {
    local = local.replace(/\./g, '');
    domain = 'gmail.com';
  }

  return `${local}@${domain}`;
}
