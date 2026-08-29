import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { normalizeReferralCode } from '@/domain/social/referral';
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_OPTIONS,
} from '@/lib/social/referral-cookie';

/**
 * Lien d'invitation (cahier §71).
 *
 * Le parrainage ne se saisit plus : le filleul **clique**, et tout est joué.
 * Cette route ne fait donc qu'une chose — déposer le code dans un cookie —
 * puis envoie l'invité vers l'inscription. Le crédit lui-même a lieu à la
 * création du compte, côté serveur, où il est vérifiable.
 *
 * Deux points méritent l'attention :
 *
 *   — le cookie est `httpOnly`. Un cookie lisible en JavaScript pourrait être
 *     réécrit par n'importe quel script de la page pour s'auto-parrainer ;
 *   — `SameSite=Lax` est indispensable **ici précisément** : le lien arrive
 *     d'ailleurs — d'une conversation, d'un réseau social. En `Strict`, le
 *     cookie ne serait pas envoyé lors de cette toute première navigation, et
 *     le parrainage se perdrait systématiquement. C'est le seul cas du produit
 *     où la valeur doit survivre à une arrivée externe.
 *
 * Le code n'est pas vérifié en base ici : cette route est publique et non
 * authentifiée, l'interroger offrirait un moyen d'énumérer les codes valides.
 * La résolution a lieu à l'inscription ; un code inconnu y est simplement
 * ignoré, et l'invité reçoit la dotation ordinaire.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const normalized = normalizeReferralCode(code);

  const store = await cookies();

  // Format seulement : longueur et alphabet. Refuser silencieusement le reste
  // évite de transformer le cookie en champ de texte libre.
  if (/^[0-9A-Z]{4,32}$/.test(normalized)) {
    store.set(REFERRAL_COOKIE, normalized, REFERRAL_COOKIE_OPTIONS);
  }

  return NextResponse.redirect(new URL('/register', _request.url));
}
