import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase à privilèges de service.
 *
 * ⚠️ Il contourne RLS par conception. Le `server-only` en tête de fichier fait
 * échouer le build si un composant client tente de l'importer.
 *
 * Tant que RLS n'est pas activé avec des policies (cahier §89), c'est le code
 * serveur qui porte seul le contrôle d'accès.
 */

let client: SupabaseClient | null = null;

/** Délai d'attente d'une requête vers la base, en millisecondes. */
const DELAI_BASE_MS = 10_000;

export function isDatabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function db(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis. ' +
        'Copier .env.example vers .env.local et renseigner la clé service_role.',
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    /*
     * Délai sur chaque appel à la base.
     *
     * Sans lui, une requête qui ne répond pas — base en pause, réseau qui
     * hoquette — retient la page jusqu'au délai de la plateforme, plusieurs
     * minutes, pendant lesquelles le joueur regarde un écran de chargement.
     * Dix secondes, c'est cent fois la latence normale : au-delà, on préfère
     * une erreur franche, que `error.tsx` sait afficher et que l'on peut
     * réessayer.
     */
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(DELAI_BASE_MS),
        }),
    },
  });
  return client;
}
