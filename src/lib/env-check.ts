import 'server-only';

/**
 * Contrôle des variables d'environnement au démarrage.
 *
 * Le principe : **échouer au démarrage plutôt qu'au premier utilisateur.** Une
 * `MFA_ENCRYPTION_KEY` absente en production ne se voit pas — jusqu'au moment
 * où un administrateur dont le secret est chiffré ne peut plus se connecter,
 * ou pire, où un nouveau secret est écrit en clair sans que personne
 * s'en aperçoive.
 *
 * ⚠️ **Aucune valeur n'est jamais journalisée**, ni en entier ni tronquée. Les
 * messages décrivent le problème, jamais le secret.
 */

export interface EnvIssue {
  variable: string;
  severity: 'FATAL' | 'WARNING';
  message: string;
}

/** Longueur minimale acceptée, en caractères, avant dérivation scrypt. */
const MIN_KEY_LENGTH = 32;

function checkMfaKey(isProduction: boolean, mfaInUse: boolean): EnvIssue[] {
  const value = process.env.MFA_ENCRYPTION_KEY;

  if (!value) {
    // Sans MFA activée nulle part, l'absence est tolérable en développement.
    if (!isProduction && !mfaInUse) {
      return [
        {
          variable: 'MFA_ENCRYPTION_KEY',
          severity: 'WARNING',
          message:
            'Absente : les secrets TOTP seraient stockés en clair. Requise dès qu’un compte active la MFA.',
        },
      ];
    }

    return [
      {
        variable: 'MFA_ENCRYPTION_KEY',
        severity: 'FATAL',
        message:
          'Absente. Les secrets TOTP déjà chiffrés deviendraient illisibles et les nouveaux seraient écrits en clair.',
      },
    ];
  }

  const issues: EnvIssue[] = [];

  if (value.length < MIN_KEY_LENGTH) {
    issues.push({
      variable: 'MFA_ENCRYPTION_KEY',
      severity: isProduction ? 'FATAL' : 'WARNING',
      message: `Trop courte : ${MIN_KEY_LENGTH} caractères minimum attendus. Générer avec « node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))" ».`,
    });
  }

  // Un espace en tête ou en fin vient presque toujours d'un copier-coller. La
  // clé dérivée serait différente de celle utilisée pour chiffrer : tous les
  // secrets existants deviendraient illisibles, sans message clair.
  if (value !== value.trim()) {
    issues.push({
      variable: 'MFA_ENCRYPTION_KEY',
      severity: 'FATAL',
      message:
        'Contient une espace en début ou en fin : la clé dérivée ne correspondrait pas à celle ayant chiffré les secrets existants.',
    });
  }

  if (/[\r\n]/.test(value)) {
    issues.push({
      variable: 'MFA_ENCRYPTION_KEY',
      severity: 'FATAL',
      message: 'Contient un saut de ligne : valeur probablement tronquée ou mal copiée.',
    });
  }

  return issues;
}

export function inspectEnvironment(options: { mfaInUse: boolean }): EnvIssue[] {
  const isProduction = process.env.NODE_ENV === 'production';
  const issues: EnvIssue[] = [...checkMfaKey(isProduction, options.mfaInUse)];

  if (isProduction) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      issues.push({
        variable: 'SUPABASE_SERVICE_ROLE_KEY',
        severity: 'FATAL',
        message: 'Absente : l’application basculerait sur le dépôt en mémoire en production.',
      });
    }

    // Vercel fournit VERCEL_PROJECT_PRODUCTION_URL : APP_URL n'est alors
    // necessaire que pour un domaine personnalise.
    if (!process.env.APP_URL && !process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      issues.push({
        variable: 'APP_URL',
        severity: 'WARNING',
        message:
          'Absente, et aucune URL fournie par l’hebergeur : les liens des e-mails pointeraient vers http://localhost:3000.',
      });
    }

    if (process.env.EMAIL_MODE === 'live' && !process.env.EMAIL_API_KEY) {
      issues.push({
        variable: 'EMAIL_API_KEY',
        severity: 'FATAL',
        message: 'EMAIL_MODE=live sans clé : aucun e-mail ne partirait.',
      });
    }

    // Second verrou du Chapter HQ (§86). Sans cette variable, le rôle `ADMIN`
    // décide seul — et il vit dans une colonne, donc à portée de toute
    // écriture malencontreuse en base.
    if (!process.env.ADMIN_EMAIL) {
      issues.push({
        variable: 'ADMIN_EMAIL',
        severity: 'WARNING',
        message:
          'Absente : tout compte portant le rôle ADMIN ouvre le Chapter HQ, sans second contrôle hors base.',
      });
    }

    // Un paiement de test ne doit jamais créditer la production (§29).
    if (process.env.PAYMENTS_ENABLED === 'true' && process.env.PAYMENT_MODE !== 'live') {
      issues.push({
        variable: 'PAYMENT_MODE',
        severity: 'FATAL',
        message:
          'Paiements actifs en production avec un prestataire en mode test : un paiement fictif créditerait de vrais comptes.',
      });
    }
  }

  return issues;
}

let alreadyReported = false;

/**
 * Vérifie l'environnement une fois par processus.
 *
 * En production, un problème fatal **arrête l'application**. En développement,
 * il est affiché sans bloquer : on ne veut pas empêcher quelqu'un de démarrer
 * le projet pour découvrir le code.
 */
export function assertEnvironment(options: { mfaInUse: boolean }): EnvIssue[] {
  const issues = inspectEnvironment(options);
  if (alreadyReported) return issues;
  alreadyReported = true;

  for (const issue of issues) {
    const line = `[env] ${issue.severity} ${issue.variable} — ${issue.message}`;
    if (issue.severity === 'FATAL') console.error(line);
    else console.warn(line);
  }

  const fatal = issues.filter((issue) => issue.severity === 'FATAL');
  if (fatal.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Configuration invalide : ${fatal.map((i) => i.variable).join(', ')}. ` +
        'Voir docs/security.md. Aucune valeur de secret n’est affichée.',
    );
  }

  return issues;
}
