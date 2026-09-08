import 'server-only';

/**
 * Taille d'une tranche de pagination.
 *
 * **Le défaut corrigé ici, et pourquoi il ne se voit pas aujourd'hui.**
 *
 * PostgREST — la couche qui sert l'API de Supabase — plafonne le nombre de
 * lignes d'une réponse (`max-rows`, mille par défaut sur un projet Supabase).
 * Une requête sans borne ne renvoie donc pas « tout » : elle renvoie le
 * début, **sans erreur, sans avertissement, et sans que rien dans le code ne
 * puisse le distinguer d'un résultat complet.**
 *
 * C'est la pire forme de bogue d'échelle : invisible tant que le jeu est
 * petit, et il se déclenche le jour où il marche.
 *
 * ## Pourquoi ce module existe séparément
 *
 * L'aide vivait dans `repository/postgres.ts`, privée. Les deux lectures qui
 * s'y trouvaient étaient donc protégées, et six autres — réparties dans les
 * tâches planifiées, l'administration et le Marché — ne l'étaient pas, faute
 * de pouvoir l'appeler. Une protection qu'on ne peut pas importer est une
 * protection qu'on réécrit mal, ou qu'on oublie.
 */
export const PAGE = 1000;

/**
 * Lit une table par tranches, jusqu'à épuisement.
 *
 * `build(from, to)` doit renvoyer la requête bornée par `.range(from, to)`.
 * On s'arrête sur une tranche incomplète — c'est la fin des données — ou sur
 * `MAX_PAGES`, garde-fou contre une boucle infinie si le serveur renvoyait
 * indéfiniment des tranches pleines.
 *
 * **Ordonner la requête, toujours.** Sans `order`, deux tranches successives
 * peuvent renvoyer la même ligne deux fois et en sauter une autre : Postgres
 * ne promet aucun ordre stable entre deux requêtes, et `range` découpe sur
 * l'ordre du moment.
 */
export async function readAllPages<T>(
  label: string,
  build: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const MAX_PAGES = 200; // 200 000 lignes : très au-delà de tout usage réel.
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE;
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(`${label} : ${error.message}`);

    const tranche = data ?? [];
    rows.push(...tranche);
    if (tranche.length < PAGE) return rows;
  }

  return rows;
}
