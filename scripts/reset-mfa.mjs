#!/usr/bin/env node
/**
 * Réinitialise le second facteur d'un compte (cahier §86).
 *
 *   node scripts/reset-mfa.mjs <email>
 *
 * Sert au seul cas où la double authentification est perdue : téléphone
 * changé, application désinstallée, codes de secours égarés. Le compte peut
 * alors se réinscrire depuis /admin/mfa.
 *
 * **C'est délibérément un script, pas un bouton.** Réinitialiser un second
 * facteur depuis l'interface reviendrait à en faire une simple case à cocher :
 * quiconque prend la main sur une session ouverte le désactiverait. Ici il
 * faut un accès à la base — c'est-à-dire un niveau de compromission où la MFA
 * n'était de toute façon plus la dernière ligne de défense.
 *
 * Les secrets Supabase sont lus dans .env.local et ne sont jamais affichés.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  let content;
  try {
    content = readFileSync('.env.local', 'utf8');
  } catch {
    return;
  }
  for (const line of content.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    if (!(match[1] in process.env)) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

async function main() {
  loadEnv();

  const email = (process.argv[2] ?? '').trim().toLowerCase();
  if (!email) {
    console.error('Usage : node scripts/reset-mfa.mjs <email>');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente de .env.local.');
    process.exit(1);
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from('user_accounts')
    .update({ mfa_enabled: false, mfa_secret: null, mfa_last_step: null })
    .eq('email', email)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    console.error('Aucun compte pour cette adresse.');
    process.exit(1);
  }

  // Les sessions restent valides : la MFA protège l'entrée, pas la session en
  // cours. Les révoquer ici déconnecterait quelqu'un qui n'a rien demandé.
  console.log(`Second facteur réinitialisé pour ${email}.`);
  console.log('Prochaine visite de /admin : réinscription proposée.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
