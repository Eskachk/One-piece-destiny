'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import {
  changeHandleAction,
  updateDisplaySettingsAction,
} from '@/app/actions/settings';
import {
  COVERAGE,
  LOCALES,
  LOCALE_LABEL,
  MESSAGES,
  type Locale,
} from '@/domain/i18n/locales';
import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  checkHandle,
  describeHandleIssue,
} from '@/domain/player/handle';

/**
 * Panneau des paramètres.
 *
 * Une règle de présentation, et elle vaut pour chaque ligne : **dire ce que le
 * réglage fait**, pas seulement le nommer. « Bouclier anti-spoiler » ne
 * signifie rien tant qu'on n'a pas écrit ce qui est masqué et quand. Un
 * interrupteur dont on ne devine pas l'effet ne se touche pas.
 *
 * Rien ici ne touche au jeu — ni au score, ni aux probabilités de tirage. La
 * page le dit en tête, parce que c'est la première question qu'on se pose en
 * arrivant sur un écran de réglages dans un jeu.
 */

interface Display {
  locale: Locale;
  reducedMotion: boolean;
  spoilerShield: boolean;
}

/** Interrupteur. Le libellé entier est cliquable : sur téléphone, une case de
    16 px se rate une fois sur deux (§55). */
function Toggle({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="hb-setting">
      <label className="hb-setting__row" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="hb-setting__box"
        />
        <span className="hb-setting__label">{label}</span>
      </label>
      <p className="hb-muted hb-setting__hint">{hint}</p>
    </div>
  );
}

export function SettingsPanel({
  initial,
  handle,
  emailVerified,
  mfaEnabled,
}: {
  initial: Display;
  handle: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}) {
  const [display, setDisplay] = useState<Display>(initial);
  const [draftHandle, setDraftHandle] = useState(handle);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Traduction locale au composant : le panneau est le seul écran qui doit
  // pouvoir changer de langue **avant** rechargement, puisque c'est lui qui la
  // change. Ailleurs, la langue vient du rendu serveur.
  const t = (key: keyof (typeof MESSAGES)['fr']) =>
    MESSAGES[display.locale][key] ?? MESSAGES.fr[key];

  const save = (next: Display) => {
    // L'affichage change tout de suite, l'enregistrement suit. Un interrupteur
    // qui attend l'aller-retour serveur donne l'impression de ne pas répondre.
    setDisplay(next);
    startTransition(async () => {
      const result = await attempt(updateDisplaySettingsAction(next));
      if (!result.ok) {
        // Échec : on revient à l'état précédent plutôt que de laisser
        // l'interface affirmer un réglage qui n'est pas enregistré.
        setDisplay(display);
        setMessage({ ok: false, text: String(result.error) });
      } else {
        setMessage({ ok: true, text: t('settings.saved') });
      }
    });
  };

  const handleCheck = draftHandle === handle ? null : checkHandle(draftHandle);
  const handleError =
    handleCheck && !handleCheck.valid ? describeHandleIssue(handleCheck.issue!) : null;

  const renameMe = () => {
    startTransition(async () => {
      const result = await attempt(changeHandleAction(draftHandle));
      setMessage(
        result.ok
          ? { ok: true, text: t('settings.saved') }
          : { ok: false, text: String(result.error) },
      );
    });
  };

  return (
    <div className="space-y-7">
      {message && (
        <p role="status" className={`text-sm ${message.ok ? 'hb-accent' : 'hb-ko'}`}>
          {message.text}
        </p>
      )}

      {/* --- Langue --------------------------------------------------------- */}
      <section>
        <h2 className="hb-legend">{t('settings.language')}</h2>
        <p className="hb-muted mt-1 text-xs">{t('settings.languageHint')}</p>

        <div className="mt-3 flex gap-2">
          {LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              disabled={pending}
              aria-busy={pending}
              aria-pressed={display.locale === locale}
              onClick={() => save({ ...display, locale })}
              className={`hb-pick${display.locale === locale ? ' hb-pick--on' : ''}`}
            >
              {LOCALE_LABEL[locale]}
            </button>
          ))}
        </div>

        {/* La couverture réelle est écrite, pas devinée. Proposer une langue
            sans dire ce qu'elle couvre, c'est laisser la découvrir au
            troisième écran. */}
        {COVERAGE[display.locale] && (
          <p className="hb-muted mt-2 text-xs">{COVERAGE[display.locale]}</p>
        )}
      </section>

      {/* --- Pseudo --------------------------------------------------------- */}
      <section>
        <h2 className="hb-legend">{t('settings.identity')}</h2>
        <p className="hb-muted mt-1 text-xs">{t('settings.identityHint')}</p>

        <input
          type="text"
          value={draftHandle}
          onChange={(event) => setDraftHandle(event.target.value)}
          minLength={HANDLE_MIN_LENGTH}
          maxLength={HANDLE_MAX_LENGTH}
          autoComplete="username"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={t('settings.identity')}
          className="mt-2 w-full rounded-lg border hb-border hb-input px-3 py-2 hb-ink"
        />
        {handleError && <p className="hb-ko mt-1 text-xs">{handleError}</p>}

        <button
          type="button"
          disabled={pending || draftHandle === handle || Boolean(handleError)}
          aria-busy={pending}
          onClick={renameMe}
          className="hb-btn--ghost mt-2 w-full rounded-lg px-3 py-2 disabled:opacity-40"
        >
          {t('settings.identitySave')}
        </button>
      </section>

      {/* --- Confort -------------------------------------------------------- */}
      <section>
        <h2 className="hb-legend">{t('settings.comfort')}</h2>

        <div className="mt-2 space-y-3">
          <Toggle
            id="reduced-motion"
            label={t('settings.motion')}
            hint={t('settings.motionHint')}
            checked={display.reducedMotion}
            disabled={pending}
            aria-busy={pending}
            onChange={(reducedMotion) => save({ ...display, reducedMotion })}
          />
          <Toggle
            id="spoiler-shield"
            label={t('settings.spoiler')}
            hint={t('settings.spoilerHint')}
            checked={display.spoilerShield}
            disabled={pending}
            aria-busy={pending}
            onChange={(spoilerShield) => save({ ...display, spoilerShield })}
          />
        </div>
      </section>

      {/* --- Sécurité ------------------------------------------------------- */}
      <section>
        <h2 className="hb-legend">{t('settings.security')}</h2>
        <p className="hb-muted mt-1 text-xs">{t('settings.securityHint')}</p>

        <ul className="mt-2 space-y-1 text-sm">
          <li>
            <Link href="/forgot" className="hb-link">
              Changer mon mot de passe
            </Link>
          </li>
          <li className="hb-muted">
            Double authentification :{' '}
            <strong>{mfaEnabled ? t('settings.on') : t('settings.off')}</strong>
          </li>
          <li className="hb-muted">
            Adresse e-mail :{' '}
            <strong>{emailVerified ? 'confirmée' : 'non confirmée'}</strong>
            {!emailVerified && (
              <>
                {' — '}
                <Link href="/profil" className="hb-link">
                  renvoyer le lien
                </Link>
              </>
            )}
          </li>
        </ul>
      </section>
    </div>
  );
}
