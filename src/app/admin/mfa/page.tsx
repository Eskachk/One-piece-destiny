import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { redirect } from 'next/navigation';
import { MfaEnrollment } from '@/components/MfaEnrollment';
import { formatSecretForDisplay } from '@/domain/auth/totp';
import { base32Decode } from '@/domain/auth/totp';
import { requireAdminForEnrollment } from '@/lib/auth/guards';
import { beginEnrollment } from '@/lib/auth/mfa';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Double authentification',
  robots: { index: false, follow: false },
};

/**
 * Inscription au second facteur, obligatoire pour un administrateur
 * (cahier §86). `requireAdmin` redirige ici tant que la MFA n'est pas active.
 */
export default async function AdminMfaPage() {
  const session = await requireAdminForEnrollment();

  // Déjà en règle : rien à faire ici.
  if (session.mfaEnabled) redirect('/admin');

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
    <main className="mx-auto w-full max-w-[430px] px-5 py-10">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        Chapter HQ
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
    </main>
  );
}
