'use client';

import type { IslandId } from '@/domain/islands';
import { useT } from '@/components/LocaleProvider';
import type { MessageKey } from '@/domain/i18n/locales';

/**
 * Le nom de l'île, dans la langue du joueur.
 *
 * Composant client pour une raison seulement : `HarborScene` est rendu aussi
 * bien par des pages serveur que par l'écran d'erreur, qui est client. Le
 * contexte de langue est le seul moyen qui marche des deux côtés.
 */
export function IslandName({ island }: { island: IslandId }) {
  const { t } = useT();
  return <>{t(`island.${island}` as MessageKey)}</>;
}
