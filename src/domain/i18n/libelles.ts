import type { Recurrence } from '../chapter/recurrence';
import type { MessageKey, Traducteur } from './locales';

/**
 * Libellés du domaine, traduits.
 *
 * Le domaine expose ses étiquettes en français — `RARITY_LABEL`,
 * `presenceLabel`, `decrireRecurrence` — et il a raison de ne connaître qu'une
 * langue : ses tests, ses journaux et ses règles s'y réfèrent. Les composants,
 * eux, ne doivent plus lire ces constantes pour afficher : ils passent par
 * ces fonctions, qui prennent le traducteur de la requête.
 *
 * Toutes retombent sur le français si la clé manque, parce que `t` le fait.
 */

export const libelleRarete = (t: Traducteur, rarete: string) =>
  t(`rarity.${rarete}` as MessageKey);

export const libellePresence = (t: Traducteur, niveau: string) =>
  t(`presence.${niveau}` as MessageKey);

export const libelleTri = (t: Traducteur, tri: string) =>
  t(`filters.sort.${tri}` as MessageKey);

export const libelleAttribut = (t: Traducteur, id: string) =>
  t(`attr.${id}` as MessageKey);

export const libelleSet = (t: Traducteur, id: string) => t(`set.${id}` as MessageKey);

export const libelleSetRecompense = (t: Traducteur, id: string) =>
  t(`set.${id}.reward` as MessageKey);

export const libelleStyle = (t: Traducteur, style: string) => t(`style.${style}` as MessageKey);

export const libelleStyleDescription = (t: Traducteur, style: string) =>
  t(`style.${style}.desc` as MessageKey);

/** Ce que l'âge déclaré permet, dans les mots du joueur. */
export const libelleAge = (t: Traducteur, band: string) => t(`age.${band}` as MessageKey);

export const libelleFamille = (t: Traducteur, famille: string) =>
  t(`attrFamily.${famille}` as MessageKey);

/** Même logique que `decrireRecurrence`, dans la langue du joueur. */
export function decrireRecurrenceT(t: Traducteur, recurrence: Recurrence | undefined): string {
  if (!recurrence || recurrence.observes === 0) return t('recurrence.none');
  if (!recurrence.vus) return t('recurrence.never', { n: recurrence.observes });
  return t('recurrence.seen', { vus: recurrence.vus, n: recurrence.observes });
}
