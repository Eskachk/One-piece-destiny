import 'server-only';

import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Journal des incidents (migration 0036).
 *
 * ## Pourquoi il existe
 *
 * Le produit journalisait proprement, mais vers `console` seulement. Sur
 * Vercel, ces lignes vivent une heure, sans recherche ni alerte : une panne du
 * dimanche soir était invisible le lundi matin. On l'aurait apprise par un
 * joueur, ou jamais.
 *
 * Ce module donne la rétention et la recherche. Il ne remplace pas un service
 * d'observation dédié — Sentry reste la marche suivante, pour l'alerte et le
 * regroupement — mais il comble le trou avec ce qu'on a déjà.
 *
 * ## Ce qu'il ne fait jamais
 *
 * **Il ne jette pas.** Un journal d'incidents qui provoque un incident est une
 * plaisanterie coûteuse : toute erreur d'écriture est avalée, et la trace
 * `console` reste, elle, systématique. Le journal est un supplément, jamais un
 * passage obligé.
 *
 * **Il n'écrit rien de nominatif.** Ni mot de passe, ni jeton, ni adresse. Le
 * message est tronqué, et l'appelant reste responsable de ce qu'il y met.
 */

/** Longueur retenue d'un message. Au-delà, c'est une pile, pas un message. */
const MESSAGE_MAX = 500;

export interface Incident {
  /** D'où il vient : `rendu`, `action:coffre`, `job:hebdo`… */
  scope: string;
  message: string;
  /** Le condensat que Next montre au joueur, s'il y en a un. */
  digest?: string | null;
  metadata?: Record<string, unknown>;
  playerId?: string | null;
}

/**
 * Enregistre un incident.
 *
 * Toujours `await`-able mais jamais bloquant pour l'appelant en cas de panne :
 * la promesse aboutit quoi qu'il arrive.
 */
export async function signalerIncident(incident: Incident): Promise<void> {
  // La trace console d'abord, et sans condition. Si la base est ce qui est
  // tombé, c'est la seule qui restera.
  console.error(`[${incident.scope}]`, incident.message, incident.digest ?? '');

  if (!isDatabaseConfigured()) return;

  try {
    await db().from('error_log').insert({
      scope: incident.scope.slice(0, 80),
      message: incident.message.slice(0, MESSAGE_MAX),
      digest: incident.digest ?? null,
      metadata: incident.metadata ?? {},
      player_id: incident.playerId ?? null,
    });
  } catch {
    // Volontairement muet : voir l'en-tête.
  }
}

/** Message lisible d'une valeur jetée, quelle qu'elle soit. */
export function messageDe(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

export interface IncidentLu {
  id: number;
  at: string;
  scope: string;
  message: string;
  digest: string | null;
}

/** Les incidents récents, pour l'écran d'administration. */
export async function incidentsRecents(limite = 50): Promise<IncidentLu[]> {
  if (!isDatabaseConfigured()) return [];

  const { data, error } = await db()
    .from('error_log')
    .select('id, at, scope, message, digest')
    .order('at', { ascending: false })
    .limit(limite);

  if (error) return [];
  return (data ?? []) as IncidentLu[];
}

/** Combien d'incidents sur les dernières 24 h, par origine. */
export async function incidentsParOrigine(): Promise<
  { scope: string; n: number }[]
> {
  if (!isDatabaseConfigured()) return [];

  const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await db()
    .from('error_log')
    .select('scope')
    .gte('at', depuis)
    // Borné : l'écran affiche un ordre de grandeur, pas un décompte exact, et
    // une journée catastrophique ne doit pas rapatrier cent mille lignes.
    .limit(1000);

  if (error) return [];

  const compte = new Map<string, number>();
  for (const ligne of data ?? []) {
    compte.set(ligne.scope, (compte.get(ligne.scope) ?? 0) + 1);
  }
  return [...compte.entries()]
    .map(([scope, n]) => ({ scope, n }))
    .sort((a, b) => b.n - a.n);
}
