import 'server-only';

import { cookies } from 'next/headers';
import {
  SIGNUP_BERRIES,
  SIGNUP_BERRIES_REFERRED,
} from '@/domain/social/referral';
import { MAX_ACCOUNTS_PER_PERSON } from '@/domain/antiabuse/config';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { recordEvent } from '@/lib/antiabuse/events';
import { REFERRAL_COOKIE } from './referral-cookie';
import {
  findPlayerByReferralCode,
  isSocialAvailable,
  recordReferral,
} from './repository';

/**
 * Dotation d'arrivée (cahier §71, §43).
 *
 * **Rien n'est crédité à l'inscription.** C'est le point central de la lutte
 * contre le fermage de comptes, et il repose sur une idée simple : créer un
 * compte ne doit produire aucune monnaie dépensable.
 *
 * Les Berries sont posées **en attente** et libérées au premier équipage
 * verrouillé. Un joueur ne perd rien — il les touche dès sa première semaine,
 * ce qu'il allait faire de toute façon. Un compte fabriqué, lui, ne franchit
 * jamais cette étape : la dotation reste bloquée pour toujours.
 *
 * Deux verrous se complètent :
 *
 *   1. **la qualification** — jouer une fois ;
 *   2. **le plafond de contexte** — au-delà de deux comptes ouverts depuis le
 *      même réseau, la dotation est nulle. C'est la règle des deux comptes,
 *      appliquée là où elle a un effet réel : sur la monnaie, pas sur le droit
 *      d'exister. Le troisième compte peut jouer, il ne rapporte simplement
 *      rien.
 *
 * Rien ici ne fait échouer l'inscription. Un parrainage qui ne se conclut pas
 * coûte au pire le bonus ; refuser le compte pour autant serait hors de
 * proportion.
 */
export async function grantSignupBonus(playerId: string): Promise<void> {
  const store = await cookies();
  const code = store.get(REFERRAL_COOKIE)?.value ?? null;

  // Le cookie a fait son office : on le retire tout de suite, qu'il ait servi
  // ou non. Le laisser traîner ferait re-parrainer le compte suivant créé
  // depuis le même navigateur.
  if (code) store.delete(REFERRAL_COOKIE);

  if (!isDatabaseConfigured()) return;

  const referrerId =
    code && isSocialAvailable() ? await findPlayerByReferralCode(code) : null;

  // Un joueur ne peut pas être son propre parrain. Le cas n'est pas atteignable
  // ici — le compte vient d'être créé — mais la contrainte est aussi posée en
  // base, et il vaut mieux que les deux disent la même chose.
  const referred = referrerId !== null && referrerId !== playerId;

  const base = referred ? SIGNUP_BERRIES_REFERRED : SIGNUP_BERRIES;
  const capped = await beyondAccountCap(playerId);
  const amount = capped ? 0 : base;

  // `pending_berries`, jamais `berries` : la dotation existe, elle n'est pas
  // encore dépensable.
  const { error } = await db()
    .from('wallets')
    .upsert(
      { player_id: playerId, pending_berries: amount },
      { onConflict: 'player_id' },
    );

  if (error) {
    console.warn('[signup] dotation non posée', error.message);
  }

  await recordEvent(playerId, 'ACCOUNT_CREATED');
  await recordEvent(playerId, 'WELCOME_BALANCE_GRANTED', {
    source: referred ? 'REFERRAL' : 'DIRECT',
    pending: amount,
    capped,
  });

  if (referred) {
    await recordReferral(referrerId!, playerId, false);
    await recordEvent(playerId, 'REFERRAL_SIGNUP', { referrerId });
  }
}

/**
 * Ce compte dépasse-t-il le nombre autorisé pour un même contexte réseau ?
 *
 * Compte **strictement** : le troisième compte ouvert depuis la même
 * connexion est au-delà du plafond. Deux frères sur la même box gardent donc
 * leur dotation ; une ferme de vingt comptes n'en touche aucune à partir du
 * troisième.
 *
 * En cas de doute — pas d'adresse enregistrée, lecture impossible — on
 * **accorde**. Refuser une dotation à un joueur légitime sur une incertitude
 * technique coûterait plus cher que d'en laisser passer une.
 */
async function beyondAccountCap(playerId: string): Promise<boolean> {
  try {
    const { data } = await db().rpc('accounts_sharing_signup_ip', {
      p_player_id: playerId,
    });
    return typeof data === 'number' && data > MAX_ACCOUNTS_PER_PERSON;
  } catch (error) {
    console.warn('[signup] plafond non vérifié', (error as Error).message);
    return false;
  }
}
