import type { Metadata } from 'next';
import QRCode from 'qrcode';
import Link from 'next/link';
import { MfaEnrollment } from '@/components/MfaEnrollment';
import { formatSecretForDisplay } from '@/domain/auth/totp';
import { base32Decode } from '@/domain/auth/totp';
import { requireAdminForEnrollment } from '@/lib/auth/guards';
import { beginEnrollment } from '@/lib/auth/mfa';
import { Nav } from '@/components/Nav';

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

/**
 * Inscription au second facteur, obligatoire pour un administrateur
 * (cahier §86). `requireAdmin` redirige ici tant que la MFA n'est pas active.
 */
export default async function AdminMfaPage() {
  const session = await requireAdminForEnrollment();

  // Déjà en règle. **On rend un écran, on ne redirige pas.**
  //
  // Un `redirect()` déclenché ici traversait la frontière de Suspense créée
  // par l'écran d'attente : Next ne peut alors plus émettre de 3xx, il place
  // l'ordre dans le flux — et le navigateur restait sur le squelette, sans
  // erreur ni contenu. Le Poste de commandement paraissait cassé alors qu'il ne l'était
  // pas.
  //
  // Un écran explicite vaut mieux de toute façon : l'administrateur sait
  // pourquoi il n'a rien à faire.
  if (session.mfaEnabled) {
    return (
      <main className="hb-page mx-auto w-full max-w-[430px] px-5 py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
          Poste de commandement
        </p>
        <h1 className="mt-1 font-display text-3xl text-parchment">
          Double authentification active
        </h1>
        <p className="mt-3 text-sm text-parchment/70">
          Ce compte est déjà protégé par un second facteur. Rien à faire ici.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-block text-sm text-turquoise underline"
        >
          Retour au Poste de commandement
        </Link>
        <Nav />
      </main>
    );
  }

  const enrollment = await beginEnrollment(session.userId, session.email);

  // QR rendu côté serveur : aucune requête réseau depuis la page, et le
  // secret ne transite pas vers un service tiers.
  const qrSvg = await QRCode.toString(enrollment.uri, {
    type: 'svg',
    margin: 0,
    width: 180,
    color: { dark: '#071c2c', light: '#f5e8c8' },
  });

  return (
    <main className="hb-page mx-auto w-full max-w-[430px] px-5 py-10">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        Poste de commandement
      </p>
      <h1 className="mt-1 font-display text-3xl text-parchment">
        Double authentification
      </h1>
      <p className="mt-3 text-sm text-parchment/70">
        Un compte administrateur peut publier des résultats et figer un
        classement compétitif. Un mot de passe seul ne suffit pas à protéger
        cette responsabilité.
      </p>

      <div className="mt-8">
        <MfaEnrollment
          qrSvg={qrSvg}
          secret={formatSecretForDisplay(base32Decode(enrollment.secret))}
        />
      </div>
      <Nav />
    </main>
  );
}
