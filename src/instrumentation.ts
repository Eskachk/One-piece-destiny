/**
 * Point d'entrée exécuté une fois au démarrage du serveur (Next.js).
 *
 * C'est ici que le contrôle de configuration doit vivre : `assertEnvironment`
 * existait mais **n'était appelé nulle part**, ce qui rendait fausse la
 * promesse « l'application refuse de démarrer sur une configuration
 * invalide ». Un contrôle jamais exécuté ne protège de rien.
 *
 * En production, un problème fatal fait échouer le démarrage — donc le
 * déploiement — plutôt que de laisser le site tourner avec, par exemple, une
 * `MFA_ENCRYPTION_KEY` absente qui écrirait les secrets TOTP en clair.
 */
export async function register(): Promise<void> {
  // Le runtime Edge n'a ni `node:crypto` ni accès à la base : le contrôle n'y
  // a pas de sens et planterait à l'import.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { assertEnvironment } = await import('@/lib/env-check');

  // `mfaInUse` interroge la base : sans base configurée, on ne peut pas
  // savoir, et on suppose que oui — la supposition la plus prudente.
  let mfaInUse = true;
  try {
    const { db, isDatabaseConfigured } = await import('@/lib/supabase-admin');
    if (isDatabaseConfigured()) {
      const { count } = await db()
        .from('user_accounts')
        .select('id', { count: 'exact', head: true })
        .eq('mfa_enabled', true);
      mfaInUse = (count ?? 0) > 0;
    }
  } catch {
    // Base injoignable au démarrage : on ne bloque pas pour autant, mais on
    // reste sur l'hypothèse prudente.
  }

  const issues = assertEnvironment({ mfaInUse });

  // Une ligne au demarrage : elle prouve que le controle a tourne, et donne en
  // production le seul moment ou l'on peut constater qu'il n'a rien trouve.
  // Aucune valeur de secret n'y figure — seulement des noms de variables.
  console.info(
    `[env] configuration verifiee — ${issues.length} remarque(s)` +
      (issues.length > 0 ? ` : ${issues.map((i) => i.variable).join(', ')}` : '.'),
  );
}
