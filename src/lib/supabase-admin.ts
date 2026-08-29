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
  });
  return client;
}
