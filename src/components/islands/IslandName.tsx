'use client';

import { useEffect, useState } from 'react';
import type { IslandId } from '@/domain/islands';
import { useT } from '@/components/LocaleProvider';
import type { MessageKey } from '@/domain/i18n/locales';

/**
 * Le nom de l'île, en haut à droite — et, sur grand écran, le bouton qui
 * efface l'interface pour regarder le décor.
 *
 * ## Contemplation
 *
 * Un clic pose `contemplation` sur `<html>` ; la feuille de style fait
 * disparaître tout ce qui n'est pas le fond (voir `html.contemplation` dans
 * `globals.css`). Un second clic, ou Échap, rend la page. L'état vit sur
 * l'élément racine plutôt que dans React : c'est le fond, en position fixe,
 * qui reste, et le contenu qui s'efface — l'inverse d'un état de composant.
 *
 * Sur téléphone le bouton n'en est pas un : l'étiquette reste inerte, comme
 * avant. Deux raisons. Il n'y a pas de place pour un mode de plus sur un
 * écran de 390 px, et surtout le geste de sortie — Échap, ou retrouver un
 * bouton de 12 px au coin d'un fond animé — n'y est pas fiable. C'est le CSS
 * qui tranche, à la largeur et au pointeur, pas un test d'agent.
 *
 * Composant client pour une raison de plus : `HarborScene` est rendu par des
 * pages serveur comme par l'écran d'erreur, qui est client. Le contexte de
 * langue est le seul moyen qui marche des deux côtés.
 */
const CLASSE = 'contemplation';

export function IslandName({ island }: { island: IslandId }) {
  const { t } = useT();
  const [contemple, setContemple] = useState(false);

  useEffect(() => {
    const racine = document.documentElement;
    racine.classList.toggle(CLASSE, contemple);
    if (!contemple) return;

    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContemple(false);
    };
    window.addEventListener('keydown', auClavier);
    return () => {
      window.removeEventListener('keydown', auClavier);
      // Quitter la page en pleine contemplation ne doit pas laisser la
      // suivante sans interface.
      racine.classList.remove(CLASSE);
    };
  }, [contemple]);

  return (
    <button
      type="button"
      className="isl-name"
      aria-pressed={contemple}
      title={t(contemple ? 'island.contemplate.exit' : 'island.contemplate')}
      onClick={() => setContemple((v) => !v)}
    >
      {t(`island.${island}` as MessageKey)}
    </button>
  );
}
