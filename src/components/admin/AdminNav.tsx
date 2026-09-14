import Link from 'next/link';

/**
 * Les onglets du poste de commandement, sous forme de boutons.
 *
 * Ils étaient des liens soulignés, répétés à la main dans chaque page — et
 * absents de l'écran principal dès qu'un chapitre était ouvert : pour
 * atteindre les statistiques, il fallait connaître l'adresse. Un seul
 * composant, le même partout, la page courante mise en évidence.
 */
const ONGLETS = [
  { href: '/admin', libelle: 'Chapitre', icone: '📖' },
  { href: '/admin/stats', libelle: 'Statistiques', icone: '📊' },
  { href: '/admin/fraude', libelle: 'Fraude', icone: '🛡' },
  { href: '/admin/journal', libelle: 'Journal', icone: '📜' },
] as const;

export function AdminNav({ courant }: { courant: (typeof ONGLETS)[number]['href'] }) {
  return (
    <nav aria-label="Poste de commandement" className="mt-4 flex flex-wrap gap-2">
      {ONGLETS.map((o) => {
        const actif = o.href === courant;
        return (
          <Link
            key={o.href}
            href={o.href}
            aria-current={actif ? 'page' : undefined}
            className={
              actif
                ? 'rounded-lg bg-treasure px-3 py-2 text-sm font-semibold text-navy'
                : 'rounded-lg border border-turquoise/40 px-3 py-2 text-sm text-turquoise hover:bg-turquoise/10'
            }
          >
            <span aria-hidden="true" className="mr-1.5">
              {o.icone}
            </span>
            {o.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
