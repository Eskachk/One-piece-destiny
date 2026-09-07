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
function allowedAdminEmails(): Set<string> | null {
  const raw = process.env.ADMIN_EMAIL?.trim();
  if (!raw) return null;

  // Plusieurs adresses séparées par des virgules. Une seule adresse reste le
  // cas courant et se comporte exactement comme avant : la séparation d'une
  // chaîne sans virgule rend un tableau d'un élément.
  const liste = raw
    .split(',')
    .map((adresse) => adresse.trim().toLowerCase())
    .filter(Boolean);

  // Une variable qui ne contiendrait que des virgules et des espaces désarme
  // la liste plutôt que de n'autoriser personne : bloquer tout le monde
  // enfermerait dehors, sans message, l'administrateur légitime.
  return liste.length > 0 ? new Set(liste) : null;
}

export function isAdminAllowlistEnforced(): boolean {
  return allowedAdminEmails() !== null;
}

/**
 * L'adresse est-elle sur la liste d'autorisation ?
 *
 * **Un seul point de décision, volontairement.** La comparaison était
 * auparavant recopiée à trois endroits (`isAllowedAdmin`, `requireAdmin`,
 * `requireAdminForEnrollment`). Trois copies d'une règle de sécurité finissent
 * par diverger à la première modification, et c'est **la plus permissive qui
 * gagne** : il suffit qu'une seule oublie la normalisation pour ouvrir le
 * passage.
 *
 * Liste absente : la règle ne bloque rien, le rôle en base décide seul. C'est
 * le comportement d'origine, pour qu'un développement local sans variables
 * d'environnement reste utilisable ; `assertEnvironment` le signale en
 * production.
 */
function emailAutorise(email: string): boolean {
  const autorisees = allowedAdminEmails();
  if (!autorisees) return true;
  return autorisees.has(email.trim().toLowerCase());
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

  return emailAutorise(session.email);
}

export async function requireAdmin(): Promise<AuthenticatedSession> {
  const session = await getAuthenticatedSession();
  if (!session || session.role !== 'ADMIN') notFound();

  // Même réponse qu'un compte sans rôle : un 404 pour les uns et un 403 pour
  // les autres indiquerait à un administrateur déchu que la page existe encore.
  if (!emailAutorise(session.email)) notFound();

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
  if (!emailAutorise(session.email)) notFound();

  return session;
}
