import { NextResponse } from 'next/server';
import { authorizeJob } from '@/lib/jobs/guard';
import { runPriceAlerts } from '@/lib/jobs/price-alerts';
import { runWeeklyNotifications } from '@/lib/jobs/weekly';

/**
 * Rendez-vous hebdomadaire et alertes de prix.
 *
 * `GET` pour les crons Vercel, `POST` pour tout autre déclencheur — voir
 * `/api/jobs/email` pour le détail de ce choix.
 *
 * La tâche décide elle-même de sa phase, et la déduplication rend les passages
 * répétés sans effet : Vercel prévient qu'un cron peut être manqué **ou**
 * invoqué deux fois, donc rejouer doit rester anodin.
 */
export const dynamic = 'force-dynamic';

async function handle(request: Request) {
  const auth = authorizeJob(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Les deux passes partagent la même cadence horaire : un seul déclencheur
    // à configurer vaut mieux que deux.
    const weekly = await runWeeklyNotifications();
    const prices = await runPriceAlerts();
    return NextResponse.json({ weekly, prices });
  } catch (error) {
    console.error('[jobs] WEEKLY_FAILED', error);
    return NextResponse.json({ error: 'Tâche impossible.' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
