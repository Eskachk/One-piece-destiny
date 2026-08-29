import 'server-only';

import { classifyStatus, type FailureKind } from '@/domain/email/delivery';

/**
 * Abstraction du fournisseur d'e-mail.
 *
 * L'application ne connaît que cette interface. Changer de prestataire revient
 * à ajouter un fichier et une variable d'environnement — pas à toucher au
 * code métier.
 *
 * **Resend est le fournisseur retenu** : API HTTP simple (un POST JSON, aucun
 * SDK à installer, donc aucune dépendance supplémentaire dans le bundle),
 * domaine vérifiable par DKIM/SPF, palier gratuit suffisant pour la phase
 * actuelle, et migration possible vers Postmark ou SES sans réécrire
 * l'appelant puisque tout passe par `EmailProvider`.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type SendResult =
  | { ok: true; providerId: string | null }
  | { ok: false; failure: FailureKind; message: string };

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<SendResult>;
}

/**
 * Fournisseur de développement : écrit dans le journal serveur.
 *
 * Il n'envoie rien. C'est délibéré — un environnement de développement ne doit
 * pas pouvoir écrire à de vraies personnes, en particulier quand la base est
 * une copie de production.
 */
export const consoleProvider: EmailProvider = {
  name: 'console',
  async send(message) {
    console.info(
      `\n[mail:dev] → ${message.to}\n[mail:dev] ${message.subject}\n${message.text}\n`,
    );
    return { ok: true, providerId: null };
  },
};

/** Fournisseur Resend, appelé directement en HTTP. */
function resendProvider(apiKey: string, from: string, replyTo?: string): EmailProvider {
  return {
    name: 'resend',
    async send(message) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            // La clé ne doit jamais se retrouver ailleurs que dans cet en-tête.
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(replyTo ? { reply_to: replyTo } : {}),
          }),
        });

        if (!response.ok) {
          // Le corps peut contenir l'adresse ; il ne contient pas la clé.
          const detail = await response.text().catch(() => '');
          return {
            ok: false,
            failure: classifyStatus(response.status),
            message: `HTTP ${response.status} ${detail.slice(0, 200)}`,
          };
        }

        const payload = (await response.json().catch(() => null)) as
          | { id?: string }
          | null;
        return { ok: true, providerId: payload?.id ?? null };
      } catch (error) {
        // Réseau coupé, DNS, délai dépassé : temporaire par nature.
        return {
          ok: false,
          failure: 'TRANSIENT',
          message: error instanceof Error ? error.message : 'Échec réseau.',
        };
      }
    },
  };
}

export interface EmailConfig {
  provider: EmailProvider;
  from: string;
  /** `true` quand aucun message ne peut réellement partir. */
  dryRun: boolean;
  /** Explication affichable dans le diagnostic admin. */
  status: string;
}

let cached: EmailConfig | null = null;

/**
 * Résout la configuration d'envoi depuis l'environnement.
 *
 * `EMAIL_MODE` sépare explicitement les environnements. Il faut le poser à
 * `live` pour qu'un message parte vraiment : sans ce geste délibéré, un
 * déploiement de recette ne peut pas écrire à de vrais joueurs par accident.
 */
export function emailConfig(): EmailConfig {
  if (cached) return cached;

  const from = process.env.EMAIL_FROM ?? 'Grand Line Weekly <onboarding@resend.dev>';
  const replyTo = process.env.EMAIL_REPLY_TO;
  const mode = process.env.EMAIL_MODE ?? 'development';
  const apiKey = process.env.EMAIL_API_KEY;
  const name = process.env.EMAIL_PROVIDER ?? 'resend';

  if (mode !== 'live') {
    cached = {
      provider: consoleProvider,
      from,
      dryRun: true,
      status: `EMAIL_MODE=${mode} : les messages sont journalisés, pas envoyés.`,
    };
    return cached;
  }

  if (!apiKey) {
    cached = {
      provider: consoleProvider,
      from,
      dryRun: true,
      status:
        'EMAIL_MODE=live mais EMAIL_API_KEY absente : les messages ne partent pas.',
    };
    return cached;
  }

  if (name !== 'resend') {
    cached = {
      provider: consoleProvider,
      from,
      dryRun: true,
      status: `Fournisseur « ${name} » non implémenté : ajoute-le dans src/lib/email/provider.ts.`,
    };
    return cached;
  }

  cached = {
    provider: resendProvider(apiKey, from, replyTo),
    from,
    dryRun: false,
    status: 'Resend actif.',
  };
  return cached;
}

/** Réinitialise le cache — utilisé par les tests. */
export function resetEmailConfig(): void {
  cached = null;
}
