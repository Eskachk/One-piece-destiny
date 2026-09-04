import Link from 'next/link';
import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { MainNav } from '@/components/MainNav';

/**
 * Page introuvable (cahier §55, §106).
 *
 * Elle manquait, et Next servait donc sa page par défaut : « 404 — This page
 * could not be found », en anglais, sur fond blanc, sans navigation. C'est
 * l'écran que voit un joueur qui ouvre un vieux lien de partage — l'adresse
 * `/share/<chapitre>/<équipage>` circule sur Discord et survit à la
 * suppression d'un équipage — et celui que voit un robot d'indexation qui
 * essaie une adresse au hasard.
 *
 * `noindex` : une 404 porte déjà le bon code de statut, mais l'indiquer aussi
 * dans les balises évite qu'un moteur garde l'adresse en réserve.
 */
export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <HarborScene variant="page" decor={false}>
      <p className="hb-eyebrow">Erreur 404</p>
      <h1 className="hb-title mt-1">Cette île n&apos;est pas sur la carte</h1>

      <p className="hb-card mt-5 text-sm">
        L&apos;adresse demandée n&apos;existe pas, ou n&apos;existe plus. Un lien
        de partage vers un équipage supprimé finit ici, par exemple.
      </p>

      <div className="mt-5 flex flex-wrap gap-4">
        <Link href="/" className="hb-link text-sm">
          Retour à l&apos;équipage
        </Link>
        <Link href="/classement" className="hb-link text-sm">
          Voir le classement
        </Link>
      </div>

      <MainNav />
    </HarborScene>
  );
}
