import 'server-only';

import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Journal d'un compte, pour le Poste de commandement (cahier §100, §101).
 *
 * ## Pourquoi cette lecture existe
 *
 * Le journal d'audit était écrit depuis le premier jour, et **jamais lu**.
 * Chaque connexion, chaque achat, chaque refus anti-abus y laissait une ligne
 * que rien dans l'application n'affichait : il fallait ouvrir la console
 * Supabase et écrire du SQL. Autrement dit, la trace existait mais ne servait
 * à personne — ce qui est la seule chose qu'un journal ne doit jamais être.
 *
 * ## Ce que la recherche accepte
 *
 * Un pseudo, une adresse, ou un identifiant de joueur. Les trois, parce que
 * les trois arrivent : un joueur écrit avec son pseudo, un message de support
 * arrive avec une adresse, une alerte anti-abus donne un identifiant.
 *
 * La recherche par pseudo est **insensible à la casse et partielle** : on
 * cherche un compte qu'on connaît mal, sinon on aurait son identifiant.
 *
 * ## Ce que la lecture ne montre pas
 *
 * Rien qui ne soit déjà en base sous une forme lisible. `audit.ts` retire à
 * l'écriture toute clé au nom suspect — mot de passe, jeton, secret — donc le
 * journal ne peut pas en contenir. Cette lecture ne fait qu'afficher ce qui a
 * survécu à ce filtre ; elle n'a pas à en ajouter un second.
 *
 * En revanche, elle **se journalise elle-même** : consulter l'activité d'un
 * joueur est une action d'administration comme une autre, et doit laisser une
 * trace au même titre qu'une restriction de compte.
 */

export interface JournalLine {
  at: string;
  action: string;
  status: string;
  metadata: Record<string, unknown> | null;
}

export interface LoginLine {
  at: string;
  ip: string | null;
  successful: boolean;
}

export interface AccountJournal {
  playerId: string;
  handle: string;
  email: string | null;
  createdAt: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  lines: JournalLine[];
  logins: LoginLine[];
  /** Le journal est-il tronqué ? Sert à le dire plutôt qu'à le laisser croire. */
  truncated: boolean;
}

/** Plafond de lignes ramenées. Au-delà, la page cesse d'être consultable. */
const MAX_LINES = 200;

interface Candidate {
  playerId: string;
  handle: string;
}

/**
 * Comptes correspondant à une recherche.
 *
 * Rend une liste, pas un compte : deux pseudos peuvent se ressembler, et
 * choisir d'autorité le premier trouvé ferait consulter le mauvais dossier.
 */
export async function findAccounts(query: string): Promise<Candidate[]> {
  if (!isDatabaseConfigured()) return [];

  const terme = query.trim();
  if (terme.length < 2) return [];

  // Un identifiant de joueur est un UUID : on le reconnaît à sa forme plutôt
  // que de demander à l'administrateur de préciser ce qu'il tape.
  const estUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(terme);

  if (estUuid) {
    const { data } = await db()
      .from('players')
      .select('id, handle')
      .eq('id', terme)
      .maybeSingle();
    return data ? [{ playerId: data.id, handle: data.handle }] : [];
  }

  if (terme.includes('@')) {
    const { data } = await db()
      .from('user_accounts')
      .select('player_id')
      .eq('email', terme.toLowerCase())
      .maybeSingle();
    if (!data?.player_id) return [];
    const { data: joueur } = await db()
      .from('players')
      .select('id, handle')
      .eq('id', data.player_id)
      .maybeSingle();
    return joueur ? [{ playerId: joueur.id, handle: joueur.handle }] : [];
  }

  // Pseudo : recherche partielle, insensible à la casse. `%` et `_` sont
  // échappés — sans quoi une recherche sur « _ » ramènerait tout le monde.
  const motif = terme.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data } = await db()
    .from('players')
    .select('id, handle')
    .ilike('handle', `%${motif}%`)
    .order('handle')
    .limit(20);

  return (data ?? []).map((row) => ({ playerId: row.id, handle: row.handle }));
}

/** Journal complet d'un compte, ou `null` s'il n'existe pas. */
export async function accountJournal(playerId: string): Promise<AccountJournal | null> {
  if (!isDatabaseConfigured()) return null;

  const { data: joueur } = await db()
    .from('players')
    .select('id, handle, created_at')
    .eq('id', playerId)
    .maybeSingle();

  if (!joueur) return null;

  const { data: compte } = await db()
    .from('user_accounts')
    .select('email, email_verified_at, mfa_enabled')
    .eq('player_id', playerId)
    .maybeSingle();

  // Les deux lectures sont indépendantes : les enchaîner ferait payer deux
  // allers-retours là où un seul suffit.
  const [journal, connexions] = await Promise.all([
    db()
      .from('audit_log')
      .select('created_at, action, status, metadata')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(MAX_LINES + 1),
    compte?.email
      ? db()
          .from('login_attempts')
          .select('at, ip, successful')
          .eq('email', compte.email)
          .order('at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as { at: string; ip: string | null; successful: boolean }[] }),
  ]);

  const brut = (journal.data ?? []) as {
    created_at: string;
    action: string;
    status: string;
    metadata: Record<string, unknown> | null;
  }[];

  return {
    playerId: joueur.id,
    handle: joueur.handle,
    email: compte?.email ?? null,
    createdAt: joueur.created_at ?? null,
    emailVerified: Boolean(compte?.email_verified_at),
    mfaEnabled: Boolean(compte?.mfa_enabled),
    lines: brut.slice(0, MAX_LINES).map((row) => ({
      at: row.created_at,
      action: row.action,
      status: row.status,
      metadata: row.metadata,
    })),
    logins: (connexions.data ?? []) as LoginLine[],
    truncated: brut.length > MAX_LINES,
  };
}

/**
 * Nombre de comptes inscrits.
 *
 * Sert de dénominateur au taux de participation du Poste de commandement :
 * « douze équipes » ne dit rien tant qu'on ignore s'il y a quinze inscrits ou
 * quinze cents.
 *
 * Compté par la base (`head: true`) plutôt qu'en ramenant les lignes : on ne
 * veut que le nombre, et rapatrier tous les joueurs pour les compter dans le
 * navigateur serait absurde dès la première centaine.
 */
export async function playerCount(): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  const { count } = await db()
    .from('players')
    .select('id', { count: 'exact', head: true });

  return count ?? 0;
}
