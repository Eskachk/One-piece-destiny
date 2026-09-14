import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { adminStats } from '@/lib/admin/stats';
import { rendreRapportHtml, rendreSeriesCsv } from '@/lib/admin/rapport';

export const dynamic = 'force-dynamic';

/**
 * Téléchargement du compte rendu.
 *
 *   GET /admin/stats/rapport            → le compte rendu complet, en HTML
 *   GET /admin/stats/rapport?format=csv → les séries journalières, en CSV
 *
 * `Content-Disposition: attachment` : le navigateur enregistre le fichier au
 * lieu de l'afficher. Le nom porte la date du jour, pour qu'une semaine de
 * comptes rendus se classe toute seule dans un dossier.
 *
 * Même garde que la page : un compte qui n'est pas administrateur reçoit un
 * 404, comme s'il n'y avait rien ici.
 */
export async function GET(request: Request) {
  await requireAdmin();
  const stats = await adminStats();
  if (!stats) {
    return NextResponse.json({ error: 'Base de données non configurée.' }, { status: 503 });
  }

  const jour = new Date(stats.genere_le).toISOString().slice(0, 10);
  const format = new URL(request.url).searchParams.get('format');

  if (format === 'csv') {
    return new NextResponse(rendreSeriesCsv(stats), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="one-piece-quest-series-${jour}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  return new NextResponse(rendreRapportHtml(stats), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="one-piece-quest-compte-rendu-${jour}.html"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
