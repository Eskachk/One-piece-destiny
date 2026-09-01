import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { suspiciousAccounts } from '@/lib/antiabuse/review';
import { FraudCenter } from '@/components/FraudCenter';
import { Nav } from '@/components/Nav';
import {
  MARKET_ACCESS_DELAY_MS,
  MAX_ACCOUNTS_PER_PERSON,
  STARTER_CARD_LOCK_MS,
} from '@/domain/antiabuse/config';
import { REFERRAL_MIN_CHAPTERS } from '@/domain/social/referral';

export const dynamic = 'force-dynamic';

/**
 * Titre neutre, et ce n’est pas un oubli.
 *
 * Les métadonnées de Next sont résolues indépendamment du rendu : quand
 * `requireAdmin` déclenche `notFound()`, le contenu devient bien une page
 * introuvable — mais le `<title>` déjà calculé, lui, subsiste. Un visiteur
 * anonyme recevait donc un 404 intitulé du nom exact de la page, ce qui
 * confirme précisément ce que ce 404 est censé taire (§105).
 *
 * Le titre reste donc celui du site. `robots` interdit l’indexation.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const days = (ms: number) => Math.round(ms / (24 * 60 * 60 * 1000));
const hours = (ms: number) => Math.round(ms / (60 * 60 * 1000));

/**
 * Fraud Center (cahier §43 ; cadrage §26).
 *
 * Cette page est la **seule** de l'application où les paramètres de détection
 * sont visibles, et elle est derrière `requireAdmin`. Le §40 est explicite :
 * ni les seuils, ni les poids, ni les motifs détaillés ne doivent atteindre le
 * navigateur d'un joueur — les publier reviendrait à distribuer le mode
 * d'emploi du contournement.
 */
export default async function FraudPage() {
  await requireAdmin();
  const accounts = await suspiciousAccounts();

  return (
    <main className="hb-page mx-auto w-full max-w-3xl px-5 py-8">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        Poste de commandement
      </p>
      <h1 className="font-display text-3xl text-parchment">Fraude</h1>

      <nav className="mt-4 flex gap-3 text-sm">
        <Link href="/admin" className="text-turquoise underline">
          Chapitre
        </Link>
        <Link href="/admin/stats" className="text-turquoise underline">
          Statistiques
        </Link>
      </nav>

      <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-4">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Protections passives
        </h2>
        <p className="mt-2 text-sm text-parchment/75">
          Elles s’appliquent à tout le monde, en permanence, sans détection ni
          jugement. Ce sont elles qui font le gros du travail : elles ne se
          trompent sur personne, et rendent le fermage de comptes non rentable
          plutôt que de le poursuivre après coup.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-parchment/70">
          <li>
            • Les cartes du coffre d’arrivée ne s’échangent qu’après{' '}
            <strong className="text-treasure">{days(STARTER_CARD_LOCK_MS)} jours</strong>.
          </li>
          <li>
            • Le Marché s’ouvre{' '}
            <strong className="text-treasure">{hours(MARKET_ACCESS_DELAY_MS)} h</strong>{' '}
            après l’inscription.
          </li>
          <li>
            • Le parrain n’est payé que lorsque son filleul a confirmé son
            adresse et joué{' '}
            <strong className="text-treasure">
              {REFERRAL_MIN_CHAPTERS} chapitres
            </strong>
            . Deux inscriptions depuis la même empreinte ne rapportent rien.
          </li>
          <li>
            • Règle annoncée aux joueurs :{' '}
            <strong className="text-treasure">
              {MAX_ACCOUNTS_PER_PERSON} comptes
            </strong>{' '}
            par personne au maximum.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          À examiner
        </h2>
        <p className="mt-2 text-sm text-parchment/60">
          Un score élevé n’est pas une preuve. Ces comptes présentent plusieurs
          signaux simultanés — la décision reste humaine, et « faux positif »
          est une réponse aussi légitime que « restreindre ».
        </p>

        <FraudCenter
          accounts={accounts.map((account) => ({
            playerId: account.playerId,
            handle: account.handle,
            email: account.email,
            createdAt: account.createdAt.toLocaleDateString('fr-FR'),
            score: account.score,
            level: account.level,
            signals: account.signals,
            restricted: account.restricted,
          }))}
        />
      </section>
      <Nav />
    </main>
  );
}
