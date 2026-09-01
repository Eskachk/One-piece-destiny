import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { adminStats } from '@/lib/admin/stats';
import { Nav } from '@/components/Nav';

export const dynamic = 'force-dynamic';

/**
 * Titre neutre, et ce n’est pas un oubli.
 *
 * Les métadonnées de Next sont résolues indépendamment du rendu : quand
 * `requireAdmin` déclenche `notFound()`, le contenu devient bien une page
 * introuvable — mais le `<title>` déjà calculé, lui, subsiste. Un visiteur
 * anonyme recevait donc un 404 intitulé du nom exact de la page, ce qui
 * confirme précisément ce que ce 404 est censé taire (§105).
 *
 * Le titre reste donc celui du site. `robots` interdit l’indexation.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const number = (value: number) => value.toLocaleString('fr-FR');

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-turquoise/20 bg-navy/40 p-3">
      <p className="text-[11px] uppercase tracking-widest text-parchment/50">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl text-treasure">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-parchment/45">{hint}</p>}
    </div>
  );
}

/**
 * Tableau de bord du Poste de commandement (cahier §82).
 *
 * Trois familles de chiffres, dans cet ordre : les joueurs, l'économie, les
 * chapitres. C'est l'ordre dans lequel on cherche une anomalie — un pic
 * d'inscriptions se lit avant son effet sur les Berries, qui se lit avant son
 * effet sur le classement.
 *
 * Aucune donnée personnelle n'apparaît ici : ce sont des agrégats. Le détail
 * d'un compte se consulte dans le Fraud Center, qui est tracé.
 */
export default async function AdminStatsPage() {
  await requireAdmin();
  const stats = await adminStats();

  if (!stats) {
    return (
      <main className="hb-page mx-auto w-full max-w-3xl px-5 py-8">
        <h1 className="font-display text-3xl text-parchment">Statistiques</h1>
        <p className="mt-4 text-sm text-parchment/70">
          Base de données non configurée : aucune statistique à afficher.
        </p>
        <Nav />
      </main>
    );
  }

  const { players, economy, chapters, risk } = stats;

  return (
    <main className="hb-page mx-auto w-full max-w-3xl px-5 py-8">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        Poste de commandement
      </p>
      <h1 className="font-display text-3xl text-parchment">Statistiques</h1>

      <nav className="mt-4 flex gap-3 text-sm">
        <Link href="/admin" className="text-turquoise underline">
          Chapitre
        </Link>
        <Link href="/admin/fraude" className="text-turquoise underline">
          Fraude
        </Link>
      </nav>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Joueurs
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile label="Comptes" value={number(players.total)} />
          <Tile label="Créés — 24 h" value={number(players.createdLast24h)} />
          <Tile label="Créés — 7 j" value={number(players.createdLast7d)} />
          <Tile
            label="Adresse vérifiée"
            value={number(players.verified)}
            hint={`${Math.round((players.verified / Math.max(1, players.total)) * 100)} % des comptes`}
          />
          <Tile
            label="Coffre d’arrivée ouvert"
            value={number(players.withStarterOpened)}
          />
          <Tile
            label="Ont déjà joué"
            value={number(players.everLockedCrew)}
            hint="Au moins un équipage verrouillé"
          />
        </div>

        {/* Le rapport entre comptes créés et comptes qui jouent est le
            meilleur indicateur d'une ferme : beaucoup d'inscriptions, peu de
            parties. Il mérite d'être calculé ici plutôt que de tête. */}
        <p className="mt-3 text-xs text-parchment/55">
          {players.total > 0 && (
            <>
              {Math.round((players.everLockedCrew / players.total) * 100)} % des
              comptes ont déjà verrouillé un équipage. Un effondrement de ce
              rapport après un pic d’inscriptions est le signe le plus fiable
              d’une création massive de comptes.
            </>
          )}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Économie
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile
            label="Berries en circulation"
            value={number(economy.berriesInCirculation)}
          />
          <Tile label="Coffres en réserve" value={number(economy.chestsUnopened)} />
          <Tile label="Cartes frappées" value={number(economy.cardsMinted)} />
          <Tile
            label="Coffres ouverts — 7 j"
            value={number(economy.chestsOpenedLast7d)}
          />
          <Tile
            label="Annonces actives"
            value={number(economy.marketListingsActive)}
          />
          <Tile
            label="Ventes — 7 j"
            value={number(economy.marketSalesLast7d)}
            hint={`${number(economy.marketVolumeLast7d)} Berries échangées`}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Risque
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Tile label="À examiner" value={number(risk.pendingReview)} />
          <Tile label="Restreints" value={number(risk.restricted)} />
          <Tile
            label="Faux positifs"
            value={number(risk.falsePositives)}
            hint="Conservés pour mesurer la justesse"
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Chapitres
        </h2>

        {chapters.length === 0 ? (
          <p className="mt-3 text-sm text-parchment/60">Aucun chapitre.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-parchment/50">
                  <th className="py-2">Chapitre</th>
                  <th>État</th>
                  <th className="text-right">Équipages</th>
                  <th className="text-right">Moyenne</th>
                  <th className="text-right">Meilleur</th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((chapter) => (
                  <tr
                    key={chapter.chapterNumber}
                    className="border-t border-turquoise/10 text-parchment/80"
                  >
                    <td className="py-2 font-mono">#{chapter.chapterNumber}</td>
                    <td className="text-xs">{chapter.status}</td>
                    <td className="text-right font-mono">{chapter.teamsLocked}</td>
                    <td className="text-right font-mono">
                      {chapter.averageScore ?? '—'}
                    </td>
                    <td className="text-right font-mono text-treasure">
                      {chapter.topScore ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Nav />
    </main>
  );
}
