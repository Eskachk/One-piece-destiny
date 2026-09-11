/**
 * Règles du jeu et sanctions (cahier §43, §89, §113, §114).
 *
 * Composant serveur : aucun état, aucune interaction. Les blocs sont des
 * `<details>` natifs, qui se replient sans une ligne de JavaScript et restent
 * navigables au clavier.
 *
 * Deux principes de rédaction, et ils ne sont pas cosmétiques :
 *
 *   — **chaque règle dit ce qui arrive si on l'enfreint.** Une interdiction
 *     sans conséquence annoncée n'est pas une règle, c'est un souhait ; et
 *     sanctionner un joueur sur une règle qu'il n'a pas pu lire est
 *     exactement ce que §113 interdit ;
 *   — **on ne menace de rien qui ne soit réellement appliqué.** Les mesures
 *     citées ici sont celles que le produit sait exécuter aujourd'hui :
 *     annulation d'un score, retrait de Berries, blocage du Market, fermeture
 *     du compte. Rien de plus.
 */

import { traduire } from '@/lib/i18n';
import type { MessageKey } from '@/domain/i18n/locales';

/** Les règles, dans l'ordre d'affichage. Les textes vivent dans le dictionnaire. */
const RULES = ['accounts', 'referral', 'scam', 'bug', 'bots', 'spoiler', 'lend'] as const;

export async function HouseRules() {
  const { t } = await traduire();
  return (
    <section className="hb-card mt-6">
      <h2 className="font-display text-xl hb-ink">{t('rules.title')}</h2>

      <p className="hb-muted mt-2 text-sm">{t('rules.intro')}</p>

      {/* Deux protections s'appliquent à tout le monde, en permanence. Les
          annoncer ici évite qu'un joueur les découvre en butant dessus — et
          c'est ce que demande le §113. */}
      <ul className="hb-muted mt-3 space-y-1 text-xs">
        <li>
          {t('rules.starter.a')} <strong>{t('rules.starter.b')}</strong>.
        </li>
        <li>
          {t('rules.market.a')} <strong>{t('rules.market.b')}</strong> {t('rules.market.c')}
        </li>
      </ul>

      <ul className="mt-4 space-y-2">
        {RULES.map((rule) => (
          <li key={rule}>
            <details className="hb-rule">
              <summary className="hb-rule__title">{t(`rules.${rule}`)}</summary>
              <p className="mt-2 text-sm">{t(`rules.${rule}.body` as MessageKey)}</p>
              <p className="hb-rule__sanction mt-2">{t(`rules.${rule}.sanction` as MessageKey)}</p>
            </details>
          </li>
        ))}
      </ul>

      <p className="hb-muted mt-4 border-t hb-border pt-3 text-xs">
        {t('rules.outro')}
      </p>
    </section>
  );
}
