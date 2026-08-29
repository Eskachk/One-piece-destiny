import type { Metadata } from 'next';
import { HarborScene, HarborTitle } from '@/components/HarborScene';
import { RequestResetForm } from '@/components/PasswordResetForms';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <HarborScene>
      <HarborTitle
        title="Cap perdu"
        tagline="On t’envoie un lien valable une heure."
      />
      <RequestResetForm />
    </HarborScene>
  );
}
