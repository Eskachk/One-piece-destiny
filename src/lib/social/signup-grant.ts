import 'server-only';

import { cookies } from 'next/headers';
import {
  SIGNUP_BERRIES,
  SIGNUP_BERRIES_REFERRED,
} from '@/domain/social/referral';
import { getRepository } from '@/lib/repository';
import { REFERRAL_COOKIE } from './referral-cookie';
import {
  findPlayerByReferralCode,
  isSocialAvailable,
  recordReferral,
} from './repository';

/**
 * Dotation d'arrivée (cahier §71).
 *
 * Appelé une seule fois, à la création du compte. Deux choses s'y jouent :
 *
 *   1. le nouveau joueur reçoit ses Berries — davantage s'il vient d'un lien
 *      d'invitation ;
 *   2. le lien de parrainage est enregistré, **sans rien verser au parrain**.
 *      Celui-ci n'est crédité que lorsque son filleul verrouille un premier
 *      équipage (voir `confirmReferral`) : payer à l'inscription reviendrait à
 *      payer la création de comptes, pas l'arrivée de joueurs.
 *
 * Rien ici ne fait échouer l'inscription. Un parrainage qui ne se conclut pas
 * — code inconnu, base sociale indisponible, auto-parrainage — coûte au pire
 * le bonus : refuser le compte pour autant serait hors de proportion.
 */
export async function grantSignupBonus(playerId: string): Promise<void> {
  const store = await cookies();
  const code = store.get(REFERRAL_COOKIE)?.value ?? null;

  // Le cookie a fait son office : on le retire tout de suite, qu'il ait servi
  // ou non. Le laisser traîner ferait re-parrainer le compte suivant créé
  // depuis le même navigateur.
  if (code) store.delete(REFERRAL_COOKIE);

  const referrerId =
    code && isSocialAvailable() ? await findPlayerByReferralCode(code) : null;

  // Un joueur ne peut pas être son propre parrain — le cas n'est pas
  // atteignable ici (le compte vient d'être créé), mais la contrainte est
  // aussi posée en base et il vaut mieux que les deux disent la même chose.
  const referred = referrerId !== null && referrerId !== playerId;

  await getRepository().grantBerriesAndChests(
    playerId,
    referred ? SIGNUP_BERRIES_REFERRED : SIGNUP_BERRIES,
    0,
  );

  if (referred) {
    await recordReferral(referrerId!, playerId, false);
  }
}
