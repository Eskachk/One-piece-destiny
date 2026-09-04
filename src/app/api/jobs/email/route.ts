import { NextResponse } from 'next/server';
import { drainOutbox } from '@/lib/email/outbox';
import { authorizeJob } from '@/lib/jobs/guard';
import { db } from '@/lib/supabase-admin';

/**
 * Vidange de la file d'envoi.
 *
 * **GET et POST.** Les crons Vercel invoquent en `GET` — on ne choisit pas la
 * méthode — tandis qu'un déclencheur externe ou un appel manuel utilisera
 * plutôt `POST`. Les deux mènent au même traitement.
 *
 * Le `GET` n'est pas pour autant sans effet de bord, ce qui est inhabituel :
 * c'est la contrainte de la plateforme. Le jeton porteur reste exigé, donc la
 * route n'est pas déclenchable par une simple visite.
 *
 * Idempotence : la réservation du lot est atomique (`claim_emails`), donc deux
 * invocations concurrentes — que Vercel annonce comme possibles — traitent des
 * lots disjoints au lieu d'envoyer deux fois les mêmes messages.
 */
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  const auth = authorizeJob(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const report = await drainOutbox();

    /*
     * Purge des fenêtres de cadence, greffée sur le travail quotidien.
     *
     * `action_rate_limits` garde une ligne par joueur et par action ; sans
     * purge, la table ne redescend jamais. Elle n'a pas mérité son propre cron
     * — c'est une suppression sur index qui dure quelques millisecondes — et un
     * cron de plus est une chose de plus qui peut être mal configurée.
     *
     * `allSettled` : une purge en échec ne doit pas faire répondre 500 sur un
     * envoi d'e-mails qui, lui, a réussi. Vercel réessaierait alors le lot.
     */
    const [purge] = await Promise.allSettled([
      db().rpc('purge_rate_limits'),
    ]);
    if (purge.status === 'rejected') {
      console.error('[email] RATE_LIMIT_PURGE_FAILED', purge.reason);
    }

    return NextResponse.json(report);
  } catch (error) {
    // Le message d'erreur peut contenir un détail d'infrastructure : il est
    // journalisé côté serveur, pas renvoyé à l'appelant.
    console.error('[email] EMAIL_DRAIN_FAILED', error);
    return NextResponse.json({ error: 'Vidange impossible.' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
