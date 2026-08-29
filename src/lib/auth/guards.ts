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
export async function requireAdmin(): Promise<AuthenticatedSession> {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== 'ADMIN') notFound();
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
  return session;
}
