import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { queueEmail } from '@/lib/email/outbox';
import { baseUrl, verifyEmailAddressEmail } from '@/lib/email/templates';
import { db } from '@/lib/supabase-admin';

/**
 * Vérification de l'adresse e-mail (cahier §86).
 *
 * Sans elle, n'importe qui peut créer un compte avec l'adresse d'autrui — et
 * cette adresse recevra ensuite les liens de réinitialisation. La vérification
 * est ce qui relie un compte à une boîte réellement contrôlée.
 *
 * Choix assumé : **elle ne bloque pas l'accès au jeu.** Le cahier construit un
 * rendez-vous hebdomadaire ; refuser l'entrée à quelqu'un dont le message est
 * en spam le ferait partir. Ce qu'elle conditionne, ce sont les opérations
 * sensibles — c'est là qu'une adresse non maîtrisée devient dangereuse.
 *
 * Comme pour la réinitialisation, seule l'**empreinte** du jeton est stockée :
 * une fuite de la base ne permet pas de valider des adresses.
 */

const VALIDITY_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Crée un jeton et met le message en file. Silencieuse en cas d'échec.
 *
 * L'origine de la requête n'est plus un paramètre : la base du lien est
 * décidée par le serveur (`baseUrl()`). Voir `password-reset.ts` pour le
 * détail — c'est le même défaut, et il avait ici une conséquence de plus :
 * l'appelant ne postait le message que **si** l'en-tête `Origin` était
 * présent, si bien qu'une inscription sans cet en-tête ne recevait aucune
 * confirmation — donc aucun parrainage payé.
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
): Promise<void> {
  const token = randomBytes(32).toString('base64url');

  const { error } = await db().from('email_verification_tokens').insert({
    token_hash: hashToken(token),
    user_id: userId,
    email,
    expires_at: new Date(Date.now() + VALIDITY_MS).toISOString(),
  });

  // Un échec ici ne doit pas faire échouer l'inscription : le compte existe,
  // le joueur peut redemander un lien.
  if (error) {
    console.error('[auth] VERIFICATION_TOKEN_FAILED');
    return;
  }

  const link = `${baseUrl()}/verify?token=${token}`;
  await queueEmail(verifyEmailAddressEmail(email, link), `verify:${hashToken(token)}`, {
    // L'utilisateur vient de s'inscrire et attend le message : le lui faire
    // attendre un jour reviendrait a ne pas l'envoyer.
    urgent: true,
  });
}

export type VerifyOutcome = { ok: true; email: string } | { ok: false; error: string };

/** Message unique pour tout jeton inutilisable : ne pas renseigner l'attaquant. */
const INVALID = 'Ce lien est invalide ou a expiré. Demande-en un nouveau depuis ton profil.';

export async function confirmEmail(token: string): Promise<VerifyOutcome> {
  const tokenHash = hashToken(token);

  const { data: row } = await db()
    .from('email_verification_tokens')
    .select('user_id, email, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!row) return { ok: false, error: INVALID };
  if (row.used_at) return { ok: false, error: INVALID };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: INVALID };
  }

  // Consommation d'abord, et seulement si le jeton est encore libre : deux
  // requêtes simultanées avec le même lien ne peuvent pas aboutir toutes deux.
  const consumed = await db()
    .from('email_verification_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .select('token_hash')
    .maybeSingle();

  if (!consumed.data) return { ok: false, error: INVALID };

  // L'adresse est comparée à celle du jeton : si le compte a changé d'adresse
  // entre-temps, un vieux lien ne doit pas valider la nouvelle.
  const { error } = await db()
    .from('user_accounts')
    .update({ email_verified_at: new Date().toISOString() })
    .eq('id', row.user_id)
    .eq('email', row.email);

  if (error) return { ok: false, error: 'Vérification impossible.' };

  return { ok: true, email: row.email };
}

export async function isEmailVerified(userId: string): Promise<boolean> {
  const { data } = await db()
    .from('user_accounts')
    .select('email_verified_at')
    .eq('id', userId)
    .maybeSingle();
  return Boolean(data?.email_verified_at);
}
