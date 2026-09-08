import { NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { inspectEnvironment } from '@/lib/env-check';

export const dynamic = 'force-dynamic';

/**
 * Sonde de santé.
 *
 * ## Le défaut qu'elle referme
 *
 * `assertEnvironment` refuse bien une configuration invalide — vérifié : avec
 * `PAYMENTS_ENABLED=true` et `PAYMENT_MODE=test`, **vingt-neuf mille requêtes
 * d'affilée ont répondu 500**. Mais le serveur *démarre* quand même et sert ces
 * 500 : sur Vercel, le déploiement passe `Ready`, l'alias bascule, et le site
 * est mort sans que rien ne le signale.
 *
 * La promesse « l'application refuse de démarrer » était donc inexacte. On ne
 * peut pas empêcher Next de démarrer ; on peut en revanche donner un point
 * unique qui dit la vérité, et le consulter après chaque déploiement.
 *
 * ## Ce qu'elle vérifie
 *
 *   — la configuration, avec le même code que le contrôle de démarrage ;
 *   — que la base **répond**, par une lecture réelle et bornée.
 *
 * ## Ce qu'elle ne dit jamais
 *
 * Aucune valeur de secret, aucun message d'erreur de la base. Un point de
 * diagnostic public qui décrit son infrastructure est une carte offerte à qui
 * la cherche : on donne un état et des noms de variables, jamais un contenu.
 *
 * Elle reste **publique et sans authentification**, délibérément : une sonde
 * qui exige un secret ne peut pas être appelée par un contrôle de déploiement,
 * et c'est là qu'elle sert.
 */

interface Sante {
  ok: boolean;
  base: 'ok' | 'injoignable' | 'non-configuree';
  configuration: { fatal: string[]; avertissements: string[] };
  latenceBaseMs: number | null;
}

export async function GET() {
  /*
   * `mfaInUse: true` — la supposition la plus stricte.
   *
   * La sonde ne va pas interroger la base pour savoir si un compte utilise la
   * double authentification : elle serait alors en panne quand la base l'est,
   * au moment précis où on l'interroge. Supposer que oui rend le contrôle
   * plus sévère, ce qui est le bon sens de l'erreur pour une sonde.
   */
  const issues = inspectEnvironment({ mfaInUse: true });

  const fatal = issues
    .filter((i) => i.severity === 'FATAL')
    .map((i) => i.variable);
  const avertissements = issues
    .filter((i) => i.severity !== 'FATAL')
    .map((i) => i.variable);

  let base: Sante['base'] = 'non-configuree';
  let latenceBaseMs: number | null = null;

  if (isDatabaseConfigured()) {
    const debut = Date.now();
    try {
      // Une lecture réelle, la plus légère possible : `head` ne rapatrie
      // aucune ligne, mais traverse tout le chemin — réseau, PostgREST,
      // Postgres. Un `select 1` en mémoire ne prouverait rien.
      const { error } = await db()
        .from('app_settings')
        .select('*', { count: 'exact', head: true });
      base = error ? 'injoignable' : 'ok';
    } catch {
      base = 'injoignable';
    }
    latenceBaseMs = Date.now() - debut;
  }

  const sante: Sante = {
    ok: fatal.length === 0 && base !== 'injoignable',
    base,
    configuration: { fatal, avertissements },
    latenceBaseMs,
  };

  return NextResponse.json(sante, {
    // 503 et non 200 : un contrôle de déploiement lit le code de statut, pas
    // le corps. Une sonde qui répond toujours 200 ne sert à rien.
    status: sante.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
