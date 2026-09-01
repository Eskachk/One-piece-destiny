'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { activateMfaAction, type ActivationState } from '@/app/actions/mfa';

/**
 * Inscription au second facteur (cahier §86).
 *
 * Deux voies de saisie : le QR code, et le secret en clair pour les
 * gestionnaires qui ne lisent pas d'image. L'activation n'a lieu qu'après
 * vérification d'un premier code, pour ne pas verrouiller un administrateur
 * sur un secret mal recopié.
 */
export function MfaEnrollment({
  qrSvg,
  secret,
}: {
  qrSvg: string;
  secret: string;
}) {
  const [state, formAction, pending] = useActionState<ActivationState, FormData>(
    activateMfaAction,
    { status: 'idle', error: null },
  );

  if (state.status === 'activated') {
    return (
      <section className="space-y-5">
        <div className="rounded-xl border hb-border bg-turquoise/10 p-4">
          <p className="font-semibold hb-accent">
            Double authentification activée.
          </p>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-widest hb-ink-soft">
            Codes de secours
          </h2>
          <p className="mt-2 text-sm hb-ink-soft">
            Note-les maintenant et garde-les hors de ton téléphone.{' '}
            <strong className="hb-ink">
              Ils ne seront plus jamais affichés
            </strong>{' '}
            — la base n&apos;en conserve que des empreintes. Chacun ne sert
            qu&apos;une fois.
          </p>

          <ul className="mt-4 grid grid-cols-2 gap-2 rounded-xl border hb-border hb-input p-4 font-mono text-sm hb-ink">
            {state.recoveryCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        </div>

        <Link
          href="/admin"
          className="transition-quick block w-full rounded-xl hb-goldfill px-4 py-3 text-center font-semibold hb-on-gold"
        >
          Continuer vers le Poste de commandement
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-4 text-sm hb-ink">
        <li>
          <span className="hb-accent">1.</span> Scanne ce QR code avec ton
          application d&apos;authentification.
          <div
            className="mt-3 w-fit rounded-xl bg-parchment p-3"
            // SVG produit côté serveur à partir du secret, sans réseau.
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </li>

        <li>
          <span className="hb-accent">2.</span> Ou saisis la clé à la main :
          <code className="mt-2 block break-all rounded-lg border hb-border hb-input p-3 font-mono text-xs hb-gold">
            {secret}
          </code>
        </li>

        <li>
          <span className="hb-accent">3.</span> Entre le code affiché pour
          confirmer.
        </li>
      </ol>

      <form action={formAction} className="space-y-3">
        <label htmlFor="code" className="sr-only">
          Code de vérification
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          className="w-full rounded-lg border hb-border hb-input px-3 py-2 text-center font-mono text-xl tracking-[0.3em] hb-ink placeholder:tracking-normal placeholder:text-[#9aa8bf]"
        />

        {state.error && (
          <p role="alert" className="text-sm hb-ko">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="transition-quick w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50"
        >
          {pending ? 'Vérification…' : 'Activer la double authentification'}
        </button>
      </form>
    </div>
  );
}
