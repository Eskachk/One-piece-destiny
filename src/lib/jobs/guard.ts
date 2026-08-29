import 'server-only';

import { timingSafeEqual } from 'node:crypto';

/**
 * Authentification des routes de tâches planifiées.
 *
 * Ces routes ne sont pas publiques : `/api/jobs/email` vide la file d'envoi,
 * `/api/jobs/weekly` notifie tous les joueurs. Sans jeton, n'importe qui
 * pourrait déclencher un envoi en boucle et brûler la réputation du domaine.
 *
 * **Deux secrets acceptés**, et ce n'est pas de la complaisance :
 *
 *   — `CRON_SECRET` est le nom imposé par Vercel. La plateforme l'envoie
 *     elle-même en `Authorization: Bearer …` ; on ne choisit ni le nom ni
 *     l'en-tête ;
 *   — `JOB_SECRET` reste pour un déclencheur externe (GitHub Actions, cron
 *     système, appel manuel), et pour ne pas enfermer le projet sur un
 *     hébergeur.
 *
 * Comparaison en temps constant : une comparaison naïve laisse deviner le
 * préfixe correct par la durée de la réponse.
 */

export type JobAuth = { ok: true } | { ok: false; status: number; error: string };

/** Longueur minimale ; Vercel recommande 16 caractères, on exige davantage. */
const MIN_SECRET_LENGTH = 24;

function matches(presented: string, expected: string | undefined): boolean {
  if (!expected || expected.length < MIN_SECRET_LENGTH) return false;

  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // `timingSafeEqual` exige des longueurs égales ; la comparer d'abord ne
  // révèle que la longueur, pas le contenu.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function authorizeJob(request: Request): JobAuth {
  const cronSecret = process.env.CRON_SECRET;
  const jobSecret = process.env.JOB_SECRET;

  // Refuser plutôt qu'ouvrir : une route de tâche sans secret configuré est
  // une route ouverte.
  if (
    (!cronSecret || cronSecret.length < MIN_SECRET_LENGTH) &&
    (!jobSecret || jobSecret.length < MIN_SECRET_LENGTH)
  ) {
    return {
      ok: false,
      status: 503,
      error: `Aucun secret de tâche configuré (CRON_SECRET ou JOB_SECRET, ${MIN_SECRET_LENGTH} caractères minimum).`,
    };
  }

  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';

  // Les deux sont toujours évalués : sortir dès la première correspondance
  // rendrait la durée de réponse dépendante du secret utilisé.
  const okCron = matches(presented, cronSecret);
  const okJob = matches(presented, jobSecret);

  if (!okCron && !okJob) {
    return { ok: false, status: 401, error: 'Jeton invalide.' };
  }

  return { ok: true };
}
