import 'server-only';

import type { EmailMessage } from './provider';

/**
 * Gabarits d'e-mail (cahier §50 à §54 pour la direction artistique).
 *
 * Contraintes tenues :
 *
 *   — **aucune image.** Une carte au trésor en pièce jointe serait bloquée par
 *     la plupart des clients ; le message doit rester complet sans elle. La
 *     couleur et la typographie portent seules l'identité ;
 *   — **styles en ligne**, tableau de mise en page : Outlook et Gmail
 *     ignorent une large part de la feuille de style ;
 *   — **version texte systématique.** Elle n'est pas un repli poli, elle est
 *     ce que lisent les clients en mode texte et une partie des filtres
 *     anti-spam ;
 *   — **rien de confidentiel dans le corps.** Pas de mot de passe, pas de
 *     code MFA, pas de score avant publication.
 */

const ABYSS = '#071c2c';
const NAVY = '#0e3045';
const PARCHMENT = '#f5e8c8';
const TURQUOISE = '#25c7c5';
const TREASURE = '#f4c84a';

/** Échappe le texte inséré dans le HTML — un pseudo peut contenir `<`. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Base des liens envoyés par e-mail.
 *
 * `APP_URL` d'abord, pour un domaine personnalisé. À défaut, Vercel expose
 * lui-même `VERCEL_PROJECT_PRODUCTION_URL` (sans schéma) : s'en servir évite
 * de deviner l'URL de production, de la saisir à la main — ou de l'oublier,
 * auquel cas tous les liens pointeraient vers localhost.
 */
export function baseUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const hosted = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (hosted) return `https://${hosted.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}

interface LayoutInput {
  title: string;
  intro: string;
  /** Paragraphes du corps, déjà en texte brut. */
  lines: string[];
  action?: { label: string; href: string };
  /** Note de bas de page propre au message. */
  footnote?: string;
  /** Le pied de page propose de gérer les notifications (§108). */
  showPreferences?: boolean;
}

function layout(input: LayoutInput): { html: string; text: string } {
  const url = baseUrl();

  const bodyHtml = input.lines
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${PARCHMENT};">${escapeHtml(line)}</p>`,
    )
    .join('');

  const actionHtml = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
         <tr><td style="background:${TREASURE};border-radius:10px;">
           <a href="${input.action.href}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:${ABYSS};text-decoration:none;">${escapeHtml(input.action.label)}</a>
         </td></tr>
       </table>
       <p style="margin:0 0 14px;font-size:12px;line-height:1.6;color:rgba(245,232,200,0.55);">
         Si le bouton ne fonctionne pas, copie ce lien :<br>${escapeHtml(input.action.href)}
       </p>`
    : '';

  const footnoteHtml = input.footnote
    ? `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:rgba(245,232,200,0.55);">${escapeHtml(input.footnote)}</p>`
    : '';

  const preferencesHtml = input.showPreferences
    ? `<a href="${url}/profil" style="color:${TURQUOISE};text-decoration:underline;">Gérer mes notifications</a> · `
    : '';

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:${ABYSS};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ABYSS};padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${NAVY};border-radius:16px;padding:28px;">
    <tr><td>
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${TURQUOISE};">One Piece Quest</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${PARCHMENT};font-family:Georgia,'Times New Roman',serif;">${escapeHtml(input.title)}</h1>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${PARCHMENT};">${escapeHtml(input.intro)}</p>
      ${bodyHtml}
      ${actionHtml}
      ${footnoteHtml}
    </td></tr>
  </table>
  <p style="max-width:560px;margin:16px auto 0;font-size:11px;line-height:1.7;color:rgba(245,232,200,0.45);text-align:center;">
    ${preferencesHtml}Message envoyé par One Piece Quest.<br>
    Jeu de prédiction non officiel, sans lien avec les ayants droit de l’œuvre.
  </p>
</td></tr></table>
</body></html>`;

  const text = [
    'GRAND LINE WEEKLY',
    '',
    input.title,
    '',
    input.intro,
    '',
    ...input.lines,
    ...(input.action ? ['', input.action.label + ' : ' + input.action.href] : []),
    ...(input.footnote ? ['', input.footnote] : []),
    '',
    '---',
    ...(input.showPreferences ? [`Gérer mes notifications : ${url}/profil`] : []),
    'Jeu de prédiction non officiel, sans lien avec les ayants droit de l’œuvre.',
  ].join('\n');

  return { html, text };
}

export function passwordResetEmail(to: string, link: string): EmailMessage {
  const { html, text } = layout({
    title: 'Réinitialiser ton mot de passe',
    intro: 'Tu as demandé à réinitialiser ton mot de passe.',
    lines: [
      'Ce lien expire dans une heure et ne fonctionne qu’une seule fois.',
      'Si tu n’es pas à l’origine de cette demande, ignore ce message : ton mot de passe actuel reste valable.',
    ],
    action: { label: 'Choisir un nouveau mot de passe', href: link },
    footnote: 'Nous ne te demanderons jamais ton mot de passe par e-mail.',
  });

  return { to, subject: 'Réinitialiser ton mot de passe — One Piece Quest', html, text };
}

export function securityAlertEmail(
  to: string,
  what: string,
  occurredAt: Date,
): EmailMessage {
  const { html, text } = layout({
    title: 'Changement de sécurité sur ton compte',
    intro: what,
    lines: [
      `Constaté le ${occurredAt.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })} (heure de Paris).`,
      'Si tu es à l’origine de ce changement, il n’y a rien à faire.',
      'Sinon, réinitialise ton mot de passe immédiatement et vérifie ta double authentification.',
    ],
    action: { label: 'Sécuriser mon compte', href: `${baseUrl()}/forgot` },
    // Pas de lien de désinscription : une alerte de sécurité n'est pas de la
    // prospection, et la couper reviendrait à désarmer le compte.
    footnote:
      'Les alertes de sécurité ne peuvent pas être désactivées : elles protègent l’accès à ton compte.',
  });

  return { to, subject: '🔐 Changement de sécurité — One Piece Quest', html, text };
}

export function crewLockSoonEmail(to: string, chapterNumber: number): EmailMessage {
  const { html, text } = layout({
    title: 'Ton équipage se verrouille ce soir',
    intro: `Dernière ligne droite pour ajuster ta prédiction du chapitre ${chapterNumber}.`,
    lines: [
      'Le verrouillage a lieu dimanche à 23:59:59 (heure de Paris).',
      'Passé cette heure, l’équipage ne peut plus être modifié.',
    ],
    action: { label: 'Ajuster mon équipage', href: baseUrl() },
    showPreferences: true,
  });

  return { to, subject: `⚠️ Ton équipage se verrouille — chapitre ${chapterNumber}`, html, text };
}

/**
 * Résultats publiés.
 *
 * Ne contient **ni score, ni personnage, ni apparition** : l'e-mail annonce
 * que les résultats existent, le site les montre. C'est la règle anti-spoiler
 * appliquée au canal le plus difficile à rattraper — un message parti ne se
 * reprend pas.
 */
export function resultsReadyEmail(to: string, chapterNumber: number): EmailMessage {
  const { html, text } = layout({
    title: `Les résultats du chapitre ${chapterNumber} sont là`,
    intro: 'Le classement de la semaine est publié.',
    lines: [
      'Découvre ton rang, le détail de ta prédiction et les distinctions de la semaine.',
    ],
    action: { label: 'Voir le classement', href: `${baseUrl()}/classement` },
    showPreferences: true,
  });

  return { to, subject: `🏆 Résultats du chapitre ${chapterNumber}`, html, text };
}

export function rewardReadyEmail(
  to: string,
  berries: number,
  chests: number,
): EmailMessage {
  const parts = [
    berries > 0 ? `${berries} Berries` : null,
    chests > 0 ? `${chests} coffre${chests > 1 ? 's' : ''}` : null,
  ].filter(Boolean) as string[];

  const { html, text } = layout({
    title: 'Ta récompense hebdomadaire est disponible',
    intro: parts.join(' et ') + ' t’attendent.',
    lines: [
      'Les Berries n’achètent que de la collection : aucun bonus de score n’est en vente.',
    ],
    action: { label: 'Ouvrir ma collection', href: `${baseUrl()}/collection` },
    showPreferences: true,
  });

  return { to, subject: '🎁 Ta récompense hebdomadaire', html, text };
}

export function verifyEmailAddressEmail(to: string, link: string): EmailMessage {
  const { html, text } = layout({
    title: 'Confirme ton adresse e-mail',
    intro: 'Bienvenue sur One Piece Quest.',
    lines: [
      'Confirme cette adresse pour sécuriser ton compte : c’est elle qui recevra les liens de réinitialisation et les alertes de sécurité.',
      'Ce lien expire dans 24 heures.',
      'Si tu n’es pas à l’origine de cette inscription, ignore ce message — aucun compte ne sera activé à ton nom sans cette confirmation.',
    ],
    action: { label: 'Confirmer mon adresse', href: link },
  });

  return { to, subject: 'Confirme ton adresse — One Piece Quest', html, text };
}

/**
 * Alerte de prix (cahier §41).
 *
 * Le seuil est choisi par le joueur : ce n'est pas une relance commerciale
 * mais une surveillance qu'il a demandée. Elle relève donc des notifications
 * de service, pas de la prospection.
 */
export function priceAlertEmail(
  to: string,
  characterName: string,
  price: number,
  threshold: number,
): EmailMessage {
  const { html, text } = layout({
    title: `${characterName} est passé sous ton seuil`,
    intro: `Une annonce à ${price} Berries vient de paraître (ton seuil : ${threshold}).`,
    lines: [
      'Cette annonce reste disponible tant que personne ne l’achète.',
      'Aucun personnage n’influence ton score par son prix — seule la collection est en jeu.',
    ],
    action: { label: 'Voir l’annonce', href: `${baseUrl()}/market` },
    showPreferences: true,
  });

  return { to, subject: `💰 ${characterName} sous ${threshold} Berries`, html, text };
}
