#!/usr/bin/env node
/**
 * Crée ou promeut le compte administrateur du Chapter HQ (cahier §86).
 *
 *   node scripts/create-admin.mjs <email> [mot-de-passe]
 *
 * Sans mot de passe, un mot de passe fort est tiré au sort et affiché **une
 * seule fois** : il n'est stocké nulle part ailleurs que dans la tête de qui
 * lance la commande, puisque la base ne garde qu'une empreinte Argon2id.
 *
 * Le script fait trois choses, et la troisième est la plus importante :
 *
 *   1. crée le joueur et le compte s'ils n'existent pas ;
 *   2. accorde le rôle `ADMIN` à cette adresse ;
 *   3. **retire le rôle `ADMIN` à toutes les autres.** C'est la demande
 *      explicite : un seul compte administre le jeu. Le laisser à d'anciens
 *      comptes reviendrait à garder des clés en circulation.
 *
 * Les secrets Supabase sont lus dans .env.local et ne sont **jamais** affichés,
 * ni en clair ni tronqués, ni en cas d'erreur.
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';

const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

/** Charge .env.local sans écraser ce qui vient déjà de l'environnement. */
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
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}

/**
 * Mot de passe tiré au sort.
 *
 * Alphabet volontairement dépourvu de caractères ambigus (0/O, 1/l/I) : ce
 * mot de passe sera relu à l'écran puis retapé à la main au moins une fois.
 */
function generatePassword() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const symbols = '!@#$%&*+=?';
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;

  let out = '';
  while (out.length < 20) {
    for (const byte of randomBytes(32)) {
      if (byte >= limit) continue;
      out += alphabet[byte % alphabet.length];
      if (out.length === 20) break;
    }
  }
  // Un symbole et un chiffre garantis, quelle que soit la chance du tirage :
  // la politique de mot de passe de l'application les exige.
  const pick = (set) => set[randomBytes(1)[0] % set.length];
  return `${out.slice(0, 18)}${pick(symbols)}${pick('23456789')}`;
}

async function main() {
  loadEnv();

  const email = (process.argv[2] ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage : node scripts/create-admin.mjs <email> [mot-de-passe]');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // On nomme les variables manquantes, jamais leur contenu.
    console.error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente de .env.local.');
    process.exit(1);
  }

  const password = process.argv[3] ?? generatePassword();
  const generated = process.argv[3] === undefined;

  const db = createClient(url, key, { auth: { persistSession: false } });

  const existing = await db
    .from('user_accounts')
    .select('id, player_id, password_hash')
    .eq('email', email)
    .maybeSingle();

  let accountId = existing.data?.id ?? null;
  // Vrai seulement si un mot de passe a réellement été posé sur ce compte au
  // cours de cette exécution — c'est la condition pour l'afficher à la fin.
  let passwordSet = false;

  if (accountId) {
    // Compte existant. **On ne réécrit pas son mot de passe** : le promouvoir
    // ne doit pas déconnecter quelqu'un qui s'en sert déjà. Deux exceptions —
    // un mot de passe explicitement fourni en argument, et un compte ouvert
    // par Google, qui n'en a aucun et ne pourrait donc jamais se connecter au
    // HQ si Google venait à tomber.
    const update = { role: 'ADMIN', email_verified_at: new Date().toISOString() };

    if (process.argv[3] || existing.data.password_hash === null) {
      update.password_hash = await hash(password, ARGON2);
      passwordSet = true;
    }

    const { error } = await db.from('user_accounts').update(update).eq('id', accountId);
    if (error) throw new Error(`user_accounts.update : ${error.message}`);
    console.log(
      passwordSet
        ? 'Compte existant promu administrateur, mot de passe défini.'
        : 'Compte existant promu administrateur (mot de passe inchangé).',
    );
  } else {
    const player = await db
      .from('players')
      .insert({ handle: `hq-${Date.now().toString(36).slice(-6)}` })
      .select('id')
      .single();
    if (player.error) throw new Error(`players.insert : ${player.error.message}`);

    const account = await db
      .from('user_accounts')
      .insert({
        email,
        password_hash: await hash(password, ARGON2),
        player_id: player.data.id,
        role: 'ADMIN',
        email_verified_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (account.error) {
      await db.from('players').delete().eq('id', player.data.id);
      throw new Error(`user_accounts.insert : ${account.error.message}`);
    }

    accountId = account.data.id;
    passwordSet = true;
    console.log('Compte administrateur créé.');
  }

  // Toutes les autres administrations sont révoquées. C'est le cœur du script.
  const demoted = await db
    .from('user_accounts')
    .update({ role: 'PLAYER' })
    .eq('role', 'ADMIN')
    .neq('id', accountId)
    .select('email');

  if (demoted.error) throw new Error(`révocation : ${demoted.error.message}`);

  console.log(`Rôle ADMIN retiré à ${demoted.data?.length ?? 0} autre(s) compte(s).`);
  console.log('');
  console.log(`  Adresse      : ${email}`);
  if (passwordSet && generated) console.log(`  Mot de passe : ${password}`);
  else if (!passwordSet) console.log('  Mot de passe : inchangé (celui que tu utilises déjà)');
  console.log('');
  console.log('Ajoute maintenant cette variable à l’environnement de déploiement :');
  console.log(`  ADMIN_EMAIL=${email}`);
  console.log('');
  console.log(
    'Le Chapter HQ exige aussi la double authentification : la première\n' +
      'connexion à /admin redirige vers /admin/mfa pour l’activer.',
  );
}

main().catch((error) => {
  // Le message d'erreur d'un client Supabase ne contient pas la clé, mais on
  // n'affiche que le message — jamais l'objet complet, qui porte la requête.
  console.error(error.message);
  process.exit(1);
});
