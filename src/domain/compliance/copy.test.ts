import { describe, expect, it } from 'vitest';

/**
 * Garde-fou sur les formulations (cahier §114, point 20 du cadrage).
 *
 * Les gabarits d'e-mail vivent dans `src/lib/` et importent `server-only` :
 * on ne peut pas les charger ici. On lit donc le **fichier source** et on y
 * cherche les tournures de pression.
 *
 * C'est volontairement grossier, et c'est le but : ce test a déjà attrapé une
 * formulation écrite de bonne foi — « Les annonces partent vite » — dans
 * l'alerte de prix. Un principe qu'on s'énonce sans le mesurer ne survit pas
 * longtemps.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATES = readFileSync(
  join(process.cwd(), 'src/lib/email/templates.ts'),
  'utf8',
);

/** Tournures qui fabriquent de l'urgence ou de la rareté artificielle. */
const PRESSION = [
  /derni[eè]re chance/i,
  /partent vite/i,
  /d[ée]p[êe]che-toi/i,
  /plus que \d+ (heure|minute|jour)/i,
  /offre limit[ée]e/i,
  /ne rate pas/i,
  /avant qu'il ne soit trop tard/i,
];

describe('formulations des e-mails', () => {
  it('n’emploie aucune pression à l’urgence', () => {
    for (const motif of PRESSION) {
      expect(TEMPLATES).not.toMatch(motif);
    }
  });

  it('ne promet jamais un avantage de score contre de l’argent', () => {
    // Le cloisonnement de l'économie (§17) doit tenir jusque dans la prose.
    //
    // Attention au sens : « aucun bonus de score n'est en vente » contient la
    // formule tout en affirmant l'inverse. On ne rejette donc que les
    // occurrences **non niées** — une premiere version de ce test échouait sur
    // sa propre phrase de garantie.
    for (const occurrence of TEMPLATES.matchAll(/bonus de score|avantage de score/gi)) {
      const avant = TEMPLATES.slice(Math.max(0, occurrence.index - 40), occurrence.index);
      expect(avant).toMatch(/aucun|jamais|ni /i);
    }

    expect(TEMPLATES).not.toMatch(/am[ée]liore ton score|gagne plus de points/i);
  });

  it('rappelle que le prix n’influence pas le score', () => {
    expect(TEMPLATES).toMatch(/n[’']influence (pas|jamais)|aucun personnage/i);
  });
});
