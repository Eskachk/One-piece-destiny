import type { Metadata } from 'next';
import { HarborScene, HarborTitle } from '@/components/HarborScene';
import { RequestResetForm } from '@/components/PasswordResetForms';
import { traduire } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return { title: t('auth.forgot.meta'), robots: { index: false, follow: false } };
}

export default async function ForgotPasswordPage() {
  const { t } = await traduire();
  return (
    <HarborScene>
      <HarborTitle title={t('auth.forgot.title')} tagline={t('auth.forgot.tagline')} />
      <RequestResetForm />
    </HarborScene>
  );
}
