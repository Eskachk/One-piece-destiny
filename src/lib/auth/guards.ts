import 'server-only';

import { notFound, redirect } from 'next/navigation';
import {
  getAuthenticatedSession,
  type AuthenticatedSession,
} from './session-store';

/**
 * Contrôle d'accès (cahier §89).
 *
 * Toujours dans cet ordre : identité, puis ressource, puis permission.
 * Aucune page ni action sensible ne doit lire un identifiant fourni par le
 * client — il vient de la session.
 *
 * Toutes les gardes passent par `getAuthenticatedSession`, qui écarte les
 * sessions encore en attente du second facteur : ainsi aucun appelant ne peut
 * oublier ce test.
 */

/** Exige une session pleinement authentifiée. */
export async function requireSession(): Promise<AuthenticatedSession> {
  const session = await getAuthenticatedSession();
  if (!session) redirect('/login');
  return session;
}

/**
 * Exige un compte administrateur **avec double authentification active**
 * (cahier §86).
 *
 * Répond 404 plutôt que 403 : un 403 confirmerait l'existence du Chapter HQ
 * à quelqu'un qui n'y a pas accès.
 *
 * Un administrateur sans MFA n'est pas refusé mais redirigé vers l'inscription
 * au second facteur : le refuser sèchement le laisserait sans aucun moyen de
 * se mettre en conformité.
 */
/**
 * Adresse du **seul** compte autorisé au Chapter HQ.
 *
 * Deuxième verrou, indépendant de la base. Le rôle `ADMIN` reste la condition
 * principale, mais il vit dans une colonne : une injection, une restauration
 * d'ancienne sauvegarde, un `update` maladroit en console Supabase suffisent à
 * en accorder un. `ADMIN_EMAIL` vit dans l'environnement de déploiement, hors
 * d'atteinte de tout ce qui passe par l'application — il faut donc compromettre
 * les deux, et par deux chemins différents.
 *
 * Non renseignée, la variable ne bloque rien : le rôle décide seul. C'est
 * délibéré — un développement local sans variables d'environnement doit rester
 * utilisable — mais `assertEnvironment` le signale en production.
 */
function allowedAdminEmail(): string | null {
  const value = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return value ? value : null;
}

export function isAdminAllowlistEnforced(): boolean {
  return allowedAdminEmail() !== null;
}

/**
 * L'utilisateur courant est-il **l'**administrateur ?
 *
 * Variante non bloquante de `requireAdmin` : elle rend un booléen au lieu de
 * répondre 404. Utile là où le privilège modifie un comportement sans
 * conditionner l'accès — coffres illimités, outils de développement — et où
 * un `notFound()` serait absurde.
 *
 * Elle applique **exactement** les mêmes contrôles : rôle en base *et* liste
 * d'autorisation. Deux règles différentes pour la même question finiraient par
 * diverger, et la plus permissive gagnerait.
 */
export async function isAllowedAdmin(): Promise<boolean> {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== 'ADMIN') return false;

  const allowed = allowedAdminEmail();
  return !allowed || session.email.trim().toLowerCase() === allowed;
}

export async function requireAdmin(): Promise<AuthenticatedSession> {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== 'ADMIN') notFound();

  // Même réponse qu'un compte sans rôle : un 404 pour les uns et un 403 pour
  // les autres indiquerait à un administrateur déchu que la page existe encore.
  const allowed = allowedAdminEmail();
  if (allowed && session.email.trim().toLowerCase() !== allowed) notFound();

  if (!session.mfaEnabled) redirect('/admin/mfa');
  return session;
}

/**
 * Variante pour la page d'inscription à la MFA elle-même, qui doit rester
 * accessible à un administrateur qui n'a pas encore de second facteur —
 * sinon la redirection tournerait en boucle.
 */
export async function requireAdminForEnrollment(): Promise<AuthenticatedSession> {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== 'ADMIN') notFound();

  // La liste d'autorisation s'applique aussi ici : sans cela, un compte au
  // rôle `ADMIN` mais hors liste pourrait quand même s'inscrire à la double
  // authentification, et cette page deviendrait le trou dans le filet.
  const allowed = allowedAdminEmail();
  if (allowed && session.email.trim().toLowerCase() !== allowed) notFound();

  return session;
}
