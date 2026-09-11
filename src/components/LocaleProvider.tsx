'use client';

import { createContext, useContext, useMemo } from 'react';
import {
  DEFAULT_LOCALE,
  euros,
  nombre,
  pluriel,
  traduireMessage,
  translator,
  type Locale,
} from '@/domain/i18n/locales';

/**
 * La langue courante, pour les composants client.
 *
 * ## Pourquoi un contexte, et pas une prop
 *
 * La barre de navigation recevait `locale` en prop depuis son enveloppe
 * serveur, et c'était juste pour un seul composant. Avec toute l'interface
 * traduite, la prop aurait dû traverser chaque niveau de chaque arbre — le
 * panneau de la boutique, ses fiches, leurs boutons — pour finir dans un
 * `t()` tout en bas. Un contexte la pose une fois, à la racine.
 *
 * La valeur vient du **serveur** : le gabarit racine lit le cookie et la
 * transmet au fournisseur. Un composant client ne peut pas la lire lui-même
 * au premier rendu, et une barre qui change de langue après coup clignote
 * sous les yeux du joueur.
 *
 * `useT()` mémorise le traducteur par langue : il est appelé dans des rendus
 * fréquents, et reconstruire la table à chaque fois serait du travail perdu.
 */
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      t: translator(locale),
      tn: pluriel(locale),
      nombre: nombre(locale),
      euros: euros(locale),
      /** Traduit un message français rendu par une action serveur. */
      tradMessage: (message: string | null | undefined) =>
        message ? traduireMessage(locale, message) : message,
    }),
    [locale],
  );
}
