import 'server-only';

import {
  isSendableAddress,
  nextStep,
  type FailureKind,
} from '@/domain/email/delivery';
import { db } from '@/lib/supabase-admin';
import { emailConfig, type EmailMessage } from './provider';

/**
 * File d'envoi des e-mails.
 *
 * Deux raisons de ne pas envoyer depuis la requête HTTP :
 *
 *   1. la publication d'un chapitre notifie tous les joueurs ; attendre le
 *      fournisseur pour chacun ferait expirer la requête de l'administrateur ;
 *   2. un fournisseur indisponible ne doit pas faire échouer la publication.
 *      Le message est mis en file, il partira au prochain passage.
 *
 * L'idempotence repose sur `dedupe_key`, contrainte unique en base : le même
 * événement rejoué — double clic, réessai, worker redémarré — ne produit pas
 * un second message. C'est la base qui l'empêche, pas la prudence de
 * l'appelant.
 */

export interface QueueResult {
  queued: boolean;
  reason?: string;
  /** Le message est deja parti, sans attendre la tache planifiee. */
  sent?: boolean;
}

export interface QueueOptions {
  /**
   * Tente un envoi immediat apres la mise en file.
   *
   * Reserve aux messages dont le retard les rend inutiles : un lien de
   * reinitialisation vaut une heure, une alerte de securite doit arriver
   * pendant que la victime peut encore agir.
   *
   * Sur un hebergement dont le planificateur ne passe qu'une fois par jour
   * (Vercel Hobby), c'est la seule facon de rendre ces messages utilisables.
   * L'envoi reste **un seul message**, jamais un lot : la raison d'etre de la
   * file — ne pas faire attendre une publication qui notifie tous les joueurs —
   * demeure intacte.
   */
  urgent?: boolean;
}

export async function queueEmail(
  message: EmailMessage,
  dedupeKey: string,
  options: QueueOptions = {},
): Promise<QueueResult> {
  // Filtré avant la base : une adresse porteuse d'un saut de ligne est une
  // tentative d'injection d'en-tête, pas une faute de frappe.
  if (!isSendableAddress(message.to)) {
    console.warn('[email] EMAIL_REJECTED adresse invalide');
    return { queued: false, reason: 'Adresse invalide.' };
  }

  const { error } = await db().from('email_outbox').insert({
    recipient: message.to,
    subject: message.subject,
    html: message.html,
    body_text: message.text,
    dedupe_key: dedupeKey,
  });

  if (error) {
    // 23505 : la clé existe déjà. Ce n'est pas une panne, c'est l'idempotence
    // qui fonctionne.
    if (error.code === '23505') return { queued: false, reason: 'Déjà en file.' };
    console.error(`[email] EMAIL_QUEUE_FAILED ${error.code ?? 'inconnu'}`);
    return { queued: false, reason: 'Mise en file impossible.' };
  }

  if (options.urgent) {
    // Un echec ici n'est pas grave : le message reste en file et repartira au
    // prochain passage. On ne propage donc jamais l'erreur a l'appelant, dont
    // l'operation (inscription, reinitialisation) a deja reussi.
    const sent = await flushUrgent();
    return { queued: true, sent };
  }

  return { queued: true };
}

/**
 * Envoie immediatement le lot du a l'instant present, borne a un message.
 *
 * Passe par la meme reservation atomique que la vidange : un envoi urgent
 * concurrent d'un passage planifie ne peut pas produire de doublon.
 */
async function flushUrgent(): Promise<boolean> {
  try {
    const report = await drainOutbox(1);
    return report.sent > 0;
  } catch (error) {
    console.error('[email] EMAIL_URGENT_FAILED', error);
    return false;
  }
}

export interface DrainReport {
  claimed: number;
  sent: number;
  retried: number;
  dead: number;
  dryRun: boolean;
  status: string;
}

/**
 * Traite les messages dus.
 *
 * Appelé par `/api/jobs/email`, lui-même déclenché par une tâche planifiée.
 * Le lot est borné : un passage long tiendrait une connexion ouverte sans
 * bénéfice, et le passage suivant reprendra le reste.
 */
export async function drainOutbox(batchSize = 25): Promise<DrainReport> {
  const config = emailConfig();
  const report: DrainReport = {
    claimed: 0,
    sent: 0,
    retried: 0,
    dead: 0,
    dryRun: config.dryRun,
    status: config.status,
  };

  // Remise en file des reservations abandonnees (fonction interrompue en plein
  // vol). Sans ce filet, un message reste bloque en CLAIMED indefiniment.
  await db().rpc('requeue_stale_claims', { p_older_than: '10 minutes' });

  // Reservation ATOMIQUE du lot. Un simple SELECT laisserait deux executions
  // concurrentes prendre les memes lignes et envoyer deux fois le meme
  // message : Vercel annonce explicitement que ses crons peuvent etre invoques
  // en double. La `dedupe_key` ne couvre pas ce cas — elle empeche deux mises
  // en file, pas deux envois de la meme ligne.
  const { data: due, error } = await db().rpc('claim_emails', {
    p_batch: batchSize,
  });

  if (error) throw new Error(`claim_emails : ${error.message}`);
  if (!due || due.length === 0) return report;

  report.claimed = due.length;

  for (const row of due) {
    const result = await config.provider.send({
      to: row.recipient,
      subject: row.subject,
      html: row.html,
      text: row.body_text,
    });

    if (result.ok) {
      await db()
        .from('email_outbox')
        .update({
          status: 'SENT',
          sent_at: new Date().toISOString(),
          attempts: row.attempts + 1,
          provider_id: result.providerId,
          last_error: null,
          claimed_at: null,
        })
        .eq('id', row.id);

      // Journalisé sans le destinataire ni le contenu (§100).
      console.info(`[email] EMAIL_SENT id=${row.id} provider=${config.provider.name}`);
      report.sent += 1;
      continue;
    }

    await recordFailure(row.id, row.attempts, result.failure, result.message);
    if (
      nextStep({ attempts: row.attempts + 1, failure: result.failure }).action ===
      'DEAD_LETTER'
    ) {
      report.dead += 1;
    } else {
      report.retried += 1;
    }
  }

  return report;
}

async function recordFailure(
  id: string,
  attempts: number,
  failure: FailureKind,
  message: string,
): Promise<void> {
  const step = nextStep({ attempts: attempts + 1, failure });

  if (step.action === 'DEAD_LETTER') {
    // Lettre morte : conservée, pas supprimée. Un message abandonné doit
    // rester consultable, sinon l'échec devient invisible.
    await db()
      .from('email_outbox')
      .update({
        status: 'DEAD',
        claimed_at: null,
        attempts: attempts + 1,
        last_error: `${step.reason} ${message}`.slice(0, 500),
      })
      .eq('id', id);

    console.error(`[email] EMAIL_DEAD id=${id} ${step.reason}`);
    return;
  }

  await db()
    .from('email_outbox')
    .update({
      // Retour explicite en file : sans cela la ligne resterait CLAIMED et ne
      // repartirait qu'apres le delai du filet anti-blocage.
      status: 'PENDING',
      claimed_at: null,
      attempts: attempts + 1,
      next_attempt_at: new Date(Date.now() + step.delayMs).toISOString(),
      last_error: message.slice(0, 500),
    })
    .eq('id', id);

  console.warn(`[email] EMAIL_FAILED id=${id} tentative=${step.attempt}`);
}

/** Compteurs pour le diagnostic administrateur (§82). */
export async function outboxStats(): Promise<Record<string, number>> {
  const { data } = await db().from('email_outbox').select('status');
  const counts: Record<string, number> = { PENDING: 0, SENT: 0, DEAD: 0, FAILED: 0 };
  for (const row of data ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;
  return counts;
}
