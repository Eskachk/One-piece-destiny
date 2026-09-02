import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { islandOf } from '@/domain/islands';
import { Nav } from '@/components/Nav';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { SettingsPanel } from '@/components/SettingsPanel';
import { MESSAGES } from '@/domain/i18n/locales';
import { requireSession } from '@/lib/auth/guards';
import { preferencesOf } from '@/lib/notifications/dispatch';
import { readDisplaySettings } from '@/lib/settings/store';
import { db } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Paramètres',
  robots: { index: false, follow: false },
};

/**
 * Paramètres du compte et de l'affichage.
 *
 * Une page à part plutôt qu'un bloc de plus dans le journal de bord : le
 * profil raconte une progression — division, saison, style de jeu — et les
 * réglages n'ont rien à y faire. Mélanger les deux oblige à faire défiler une
 * page de statistiques pour couper une notification.
 *
 * Tout est lu **côté serveur** : la langue décide du rendu, elle ne peut donc
 * pas être appliquée après coup par le navigateur sans faire clignoter la
 * page.
 */
export default async function SettingsPage() {
  const session = await requireSession();

  const [display, preferences, account] = await Promise.all([
    readDisplaySettings(),
    preferencesOf(session.playerId),
    db()
      .from('user_accounts')
      .select('email_verified_at, mfa_enabled, players!inner(handle)')
      .eq('player_id', session.playerId)
      .maybeSingle(),
  ]);

  const player = account.data?.players as unknown as { handle: string } | undefined;
  const t = (key: keyof (typeof MESSAGES)['fr']) =>
    MESSAGES[display.locale][key] ?? MESSAGES.fr[key];

  return (
    <HarborScene variant="page" island={islandOf('/parametres')}>
      <p className="hb-eyebrow">Grand Line Weekly</p>
      <h1 className="hb-title mt-1">{t('settings.title')}</h1>
      <p className="hb-muted mt-3 text-sm">{t('settings.subtitle')}</p>

      <div className="mt-6">
        <SettingsPanel
          initial={display}
          handle={player?.handle ?? ''}
          emailVerified={Boolean(account.data?.email_verified_at)}
          mfaEnabled={Boolean(account.data?.mfa_enabled)}
        />
      </div>

      {/* Pas d'intitulé ici : `NotificationPreferences` porte déjà le sien, et
          deux fois « Notifications » à trois lignes d'intervalle se lit comme
          un défaut de rendu. */}
      <div className="mt-8">
        <NotificationPreferences initial={preferences} />
      </div>

      <Nav />
    </HarborScene>
  );
}
