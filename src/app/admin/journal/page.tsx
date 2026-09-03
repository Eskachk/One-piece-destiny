import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { accountJournal, findAccounts } from '@/lib/admin/account-journal';
import { audit } from '@/lib/audit';
import { Nav } from '@/components/Nav';

export const dynamic = 'force-dynamic';

/**
 * Titre neutre, et ce n'est pas un oubli — voir `/admin/fraude` pour le
 * détail : les métadonnées de Next survivent au `notFound()` de `requireAdmin`,
 * et un titre explicite confirmerait à un visiteur anonyme ce que le 404 est
 * censé taire (§105).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const STATUT: Record<string, { classe: string; libelle: string }> = {
  SUCCESS: { classe: 'text-turquoise', libelle: 'OK' },
  REFUSED: { classe: 'text-orange', libelle: 'REFUSÉ' },
  ERROR: { classe: 'text-danger', libelle: 'ERREUR' },
};

function horodatage(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'Europe/Paris',
  });
}

/**
 * Journal d'un compte (cahier §100).
 *
 * Le journal d'audit était écrit depuis le premier jour et **jamais lu** :
 * chaque connexion, chaque achat, chaque refus anti-abus y laissait une ligne
 * qu'aucun écran n'affichait. Il fallait ouvrir la console Supabase et écrire
 * du SQL — autrement dit, la trace existait sans servir à personne.
 *
 * La recherche accepte un pseudo, une adresse ou un identifiant, parce que les
 * trois arrivent : un joueur écrit avec son pseudo, un message de support
 * arrive avec une adresse, une alerte anti-abus donne un identifiant.
 */
export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; id?: string }>;
}) {
  const session = await requireAdmin();
  const { q = '', id } = await searchParams;

  const candidats = q.trim().length >= 2 ? await findAccounts(q) : [];

  // Un seul résultat : on l'ouvre directement. Chercher un pseudo exact puis
  // devoir cliquer dessus est une étape pour rien.
  const cible = id ?? (candidats.length === 1 ? candidats[0].playerId : null);
  const journal = cible ? await accountJournal(cible) : null;

  // Consulter l'activité d'un joueur est une action d'administration comme une
  // autre : elle laisse une trace au même titre qu'une restriction de compte.
  if (journal) {
    await audit({
      playerId: session.playerId,
      action: 'admin.account_journal_read',
      status: 'SUCCESS',
      metadata: { subject: journal.playerId },
    });
  }

  return (
    <main className="hb-page mx-auto w-full max-w-3xl px-5 py-8">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        Poste de commandement
      </p>
      <h1 className="font-display text-3xl text-parchment">Journal d’un compte</h1>

      <nav className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/admin" className="text-turquoise underline">
          Chapitre
        </Link>
        <Link href="/admin/stats" className="text-turquoise underline">
          Statistiques
        </Link>
        <Link href="/admin/fraude" className="text-turquoise underline">
          Fraude
        </Link>
      </nav>

      {/* Formulaire en GET : la recherche devient une URL, donc un lien qu'on
          garde, qu'on partage et sur lequel on revient. Une action serveur
          aurait rendu le résultat impossible à retrouver. */}
      <form method="GET" className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Pseudo, adresse e-mail ou identifiant"
          aria-label="Rechercher un compte"
          className="flex-1 rounded-lg border border-turquoise/25 bg-navy/60 px-3 py-2 text-parchment placeholder:text-parchment/35"
        />
        <button
          type="submit"
          className="transition-quick rounded-lg bg-treasure px-4 py-2 text-sm font-semibold text-abyss"
        >
          Chercher
        </button>
      </form>

      {q.trim().length >= 2 && candidats.length === 0 && !journal && (
        <p className="mt-4 text-sm text-parchment/60">Aucun compte ne correspond.</p>
      )}

      {candidats.length > 1 && (
        <ul className="mt-4 space-y-1">
          {candidats.map((c) => (
            <li key={c.playerId}>
              <Link
                href={`/admin/journal?q=${encodeURIComponent(q)}&id=${c.playerId}`}
                className="text-sm text-turquoise underline"
              >
                {c.handle}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {journal && (
        <>
          <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
            <h2 className="font-display text-2xl text-parchment">{journal.handle}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <dt className="text-parchment/50">Adresse</dt>
                <dd className="break-all font-mono text-parchment/90">
                  {journal.email ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-parchment/50">Inscrit le</dt>
                <dd className="font-mono text-parchment/90">
                  {journal.createdAt ? horodatage(journal.createdAt) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-parchment/50">Adresse vérifiée</dt>
                <dd className={journal.emailVerified ? 'text-turquoise' : 'text-orange'}>
                  {journal.emailVerified ? 'oui' : 'non'}
                </dd>
              </div>
              <div>
                <dt className="text-parchment/50">Double facteur</dt>
                <dd className={journal.mfaEnabled ? 'text-turquoise' : 'text-parchment/60'}>
                  {journal.mfaEnabled ? 'actif' : 'inactif'}
                </dd>
              </div>
            </dl>
            <p className="mt-3 break-all font-mono text-[11px] text-parchment/40">
              {journal.playerId}
            </p>
          </section>

          <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
            <h2 className="text-xs uppercase tracking-widest text-parchment/60">
              Activité {journal.truncated && `(${journal.lines.length} dernières)`}
            </h2>

            {journal.lines.length === 0 ? (
              <p className="mt-3 text-sm text-parchment/60">
                Aucune ligne. Le compte existe mais n’a déclenché aucune action
                journalisée — connexion par lien, inscription très récente.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {journal.lines.map((ligne, i) => {
                  const statut = STATUT[ligne.status] ?? {
                    classe: 'text-parchment/60',
                    libelle: ligne.status,
                  };
                  return (
                    <li
                      key={`${ligne.at}-${i}`}
                      className="rounded-lg border border-turquoise/10 bg-abyss/30 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="font-mono text-xs text-parchment/45">
                          {horodatage(ligne.at)}
                        </span>
                        <span className="font-mono text-parchment/90">{ligne.action}</span>
                        <span className={`text-xs ${statut.classe}`}>{statut.libelle}</span>
                      </div>
                      {ligne.metadata && Object.keys(ligne.metadata).length > 0 && (
                        <pre className="mt-1 overflow-x-auto text-[11px] text-parchment/50">
                          {JSON.stringify(ligne.metadata)}
                        </pre>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
            <h2 className="text-xs uppercase tracking-widest text-parchment/60">
              Tentatives de connexion
            </h2>
            <p className="mt-1 text-xs text-parchment/45">
              Lues par adresse, pas par compte : une tentative échouée n’a
              justement pas de compte attaché.
            </p>

            {journal.logins.length === 0 ? (
              <p className="mt-3 text-sm text-parchment/60">Aucune tentative enregistrée.</p>
            ) : (
              <ul className="mt-3 space-y-1">
                {journal.logins.map((ligne, i) => (
                  <li
                    key={`${ligne.at}-${i}`}
                    className="flex flex-wrap items-baseline gap-x-3 text-sm"
                  >
                    <span className="font-mono text-xs text-parchment/45">
                      {horodatage(ligne.at)}
                    </span>
                    <span className="font-mono text-parchment/70">{ligne.ip ?? 'ip inconnue'}</span>
                    <span className={ligne.successful ? 'text-turquoise' : 'text-orange'}>
                      {ligne.successful ? 'réussie' : 'échouée'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Nav />
    </main>
  );
}
