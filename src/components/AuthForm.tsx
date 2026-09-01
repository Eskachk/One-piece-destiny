'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import type { AuthFormState } from '@/app/actions/auth';
import { PASSWORD_MIN_LENGTH } from '@/domain/auth/password-policy';
import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  checkHandle,
  describeHandleIssue,
} from '@/domain/player/handle';

/**
 * Formulaire de connexion / inscription — scène du port.
 *
 * Le mot de passe n'est jamais placé dans l'URL et le formulaire est en POST
 * (Server Action). `autoComplete` est renseigné pour que les gestionnaires de
 * mots de passe fonctionnent — c'est ce qui pousse aux mots de passe forts.
 *
 * L'œil qui révèle le mot de passe est un vrai bouton, annoncé aux lecteurs
 * d'écran : c'est une aide à la saisie sur mobile, pas une décoration.
 */

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3 7 9 6 9-6" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" strokeLinecap="round" />
    </svg>
  );
}

/** Silhouette de buste : le champ « qui es-tu » de l'inscription. */
function CrewIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}

function AnchorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ width: '1.15rem', height: '1.15rem' }}
    >
      <circle cx="12" cy="4.5" r="2.2" />
      <path d="M12 6.7V21M7 11h10M21 15a9 9 0 0 1-18 0" />
    </svg>
  );
}

export function AuthForm({
  mode,
  action,
}: {
  mode: 'login' | 'register';
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [visible, setVisible] = useState(false);
  const [handle, setHandle] = useState('');
  const isRegister = mode === 'register';

  // Vérification immédiate, côté navigateur : le joueur voit tout de suite que
  // son pseudo passe. Le serveur revalide de toute façon — ce contrôle-ci est
  // un confort de saisie, jamais une garantie.
  const handleCheck = handle.length > 0 ? checkHandle(handle) : null;
  const handleError =
    handleCheck && !handleCheck.valid
      ? describeHandleIssue(handleCheck.issue!)
      : null;

  return (
    <form action={formAction} className="harbor__card">
      {isRegister && (
        <div>
          <label htmlFor="handle" className="harbor__label">
            Pseudo
          </label>
          <div className="harbor__field">
            <CrewIcon />
            <input
              id="handle"
              name="handle"
              type="text"
              required
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              minLength={HANDLE_MIN_LENGTH}
              maxLength={HANDLE_MAX_LENGTH}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Ton nom de pirate"
              aria-describedby="handle-hint"
              className="harbor__input"
            />
          </div>
          <p
            id="handle-hint"
            className="harbor__hint"
            style={handleError ? { color: '#b4402f' } : undefined}
          >
            {handleError ??
              `Visible au classement et sur le Market. ${HANDLE_MIN_LENGTH} à ${HANDLE_MAX_LENGTH} caractères, modifiable dans les paramètres.`}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="harbor__label">
          Adresse e-mail
        </label>
        <div className="harbor__field">
          <MailIcon />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="capitaine@exemple.fr"
            className="harbor__input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="harbor__label">
          Mot de passe
        </label>
        <div className="harbor__field">
          <LockIcon />
          <input
            id="password"
            name="password"
            type={visible ? 'text' : 'password'}
            required
            minLength={isRegister ? PASSWORD_MIN_LENGTH : undefined}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            className="harbor__input"
            style={{ paddingRight: '3rem' }}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={
              visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
            }
            style={{
              position: 'absolute',
              right: '0.55rem',
              top: '50%',
              translate: '0 -50%',
              padding: '0.5rem',
              color: '#6b7fa3',
              lineHeight: 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              style={{ width: '1.15rem', height: '1.15rem', position: 'static' }}
            >
              {visible ? (
                <>
                  <path d="M3 3l18 18" strokeLinecap="round" />
                  <path d="M10.6 10.7a2 2 0 0 0 2.8 2.8" />
                  <path d="M6.7 6.9C4.6 8.2 3 10 2 12c2 3.6 5.6 6 10 6 1.5 0 2.9-.3 4.2-.8M21.9 12.4C20 8.9 16.3 6 12 6c-.6 0-1.2 0-1.7.2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M2 12c2-3.6 5.6-6 10-6s8 2.4 10 6c-2 3.6-5.6 6-10 6s-8-2.4-10-6Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>

        {isRegister ? (
          <p className="harbor__hint">
            {PASSWORD_MIN_LENGTH} caractères minimum. Une phrase que tu retiens
            vaut mieux qu&apos;un mot compliqué.
          </p>
        ) : (
          <p style={{ marginTop: '0.45rem', textAlign: 'right' }}>
            <Link href="/forgot" className="harbor__link" style={{ fontSize: '0.85rem' }}>
              Mot de passe oublié ?
            </Link>
          </p>
        )}
      </div>

      {state.error && (
        <p role="alert" className="harbor__alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="harbor__submit">
        <AnchorIcon />
        {pending
          ? 'Un instant…'
          : isRegister
            ? 'Créer mon compte'
            : 'Se connecter'}
      </button>

      <p className="harbor__meta">
        {isRegister ? (
          <>
            Déjà un équipage ?{' '}
            <Link href="/login" className="harbor__link">
              Se connecter
            </Link>
          </>
        ) : (
          <>
            Pas encore de compte ?{' '}
            <Link href="/register" className="harbor__link">
              S&apos;inscrire
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
