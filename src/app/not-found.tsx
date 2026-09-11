import Link from 'next/link';
import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { MainNav } from '@/components/MainNav';
import { traduire } from '@/lib/i18n';

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
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return { title: t('nf.meta.title'), robots: { index: false, follow: false } };
}

export default async function NotFound() {
  const { t } = await traduire();
  return (
    <HarborScene variant="page" decor={false}>
      <p className="hb-eyebrow">{t('nf.eyebrow')}</p>
      <h1 className="hb-title mt-1">{t('nf.title')}</h1>

      <p className="hb-card mt-5 text-sm">{t('nf.body')}</p>

      <div className="mt-5 flex flex-wrap gap-4">
        <Link href="/" className="hb-link text-sm">
          {t('nf.back')}
        </Link>
        <Link href="/classement" className="hb-link text-sm">
          {t('nf.leaderboard')}
        </Link>
      </div>

      <MainNav />
    </HarborScene>
  );
}
