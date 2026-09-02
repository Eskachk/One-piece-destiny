import 'server-only';

import { headers } from 'next/headers';

/**
 * Vérification d'origine (cahier §87).
 *
 * Next vérifie déjà l'origine des Server Actions, et le cookie de session est
 * en SameSite=Lax. Le cahier demande explicitement de ne pas se reposer
 * uniquement sur SameSite : on contrôle donc l'en-tête `Origin` nous-mêmes
 * pour toute action qui modifie l'état.
 */

export interface RequestContext {
  ip?: string;
  userAgent?: string;
  origin?: string;
}

function allowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured?.length ? configured : [];
}

export async function assertSameOrigin(): Promise<void> {
  const store = await headers();
  const origin = store.get('origin');
  const host = store.get('host');

  // Requête sans Origin : navigation classique, pas une soumission
  // inter-origines. Les navigateurs envoient toujours Origin sur un POST.
  if (!origin) return;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error('Origine invalide.');
  }

  const whitelist = allowedOrigins();
  if (whitelist.length > 0) {
    if (!whitelist.some((entry) => entry === origin)) {
      throw new Error('Origine non autorisée.');
    }
    return;
  }

  if (!host || originHost !== host) {
    throw new Error('Origine non autorisée.');
  }
}

/**
 * Contexte de la requête pour la journalisation et le rate limiting.
 *
 * ⚠️ `x-forwarded-for` est falsifiable si aucun proxy de confiance ne le
 * réécrit. En production, seul le reverse proxy / CDN doit pouvoir le poser
 * (cahier §103), sinon le rate limiting par IP se contourne trivialement.
 */
export async function getRequestContext(): Promise<RequestContext> {
  const store = await headers();
  const forwarded = store.get('x-forwarded-for');

  return {
    ip: forwarded?.split(',')[0]?.trim() || undefined,
    userAgent: store.get('user-agent') ?? undefined,
    /*
     * Conservée pour la journalisation **seulement**.
     *
     * Elle servait à bâtir les liens de réinitialisation et de confirmation.
     * Le raisonnement — « `assertSameOrigin` l'a validée en amont » — ne
     * tenait pas : ce contrôle compare `Origin` à `Host`, deux en-têtes que
     * la même requête transporte. Les forger tous deux sur le domaine d'un
     * attaquant les rend concordants, et le lien partait avec le jeton de la
     * victime. Ces liens viennent maintenant de `baseUrl()`, décidé par le
     * serveur.
     */
    origin: store.get('origin') ?? undefined,
  };
}
