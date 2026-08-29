/**
 * Cookie de parrainage (cahier §71).
 *
 * Isolé dans son propre module : il est écrit par une route publique
 * (`/r/[code]`) et lu par le service d'authentification. Redéfinir les options
 * des deux côtés finirait par produire deux cookies différents — dont un
 * illisible par l'autre.
 */
export const REFERRAL_COOKIE = 'opq_ref';

/**
 * Trente jours : assez long pour qu'une invitation partagée un soir serve
 * encore le week-end suivant, assez court pour qu'un lien oublié dans un
 * navigateur ne finisse pas par créditer un parrain des mois plus tard.
 */
export const REFERRAL_TTL_SECONDS = 30 * 24 * 60 * 60;

export const REFERRAL_COOKIE_OPTIONS = {
  httpOnly: true,
  // `Lax`, et non `Strict` : le lien arrive d'une conversation ou d'un réseau
  // social. En `Strict`, le cookie ne serait pas envoyé sur cette première
  // navigation et le parrainage serait perdu à chaque fois.
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: REFERRAL_TTL_SECONDS,
} as const;
