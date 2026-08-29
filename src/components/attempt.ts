/**
 * Garde-fou commun aux actions serveur appelées depuis un composant client.
 *
 * Sans lui, une action qui **lève** (base injoignable, réseau coupé) laissait
 * le message précédent affiché : après un import réussi, une publication en
 * échec continuait d'annoncer « 7 personnage(s) enregistré(s) ». Le cas a été
 * observé en vrai — l'administrateur croyait le chapitre publié alors que rien
 * n'avait été écrit.
 *
 * `attempt` ramène l'exception dans la forme d'échec que les appelants
 * savent déjà afficher, pour qu'un échec remplace toujours le message.
 */

export const ACTION_FAILURE_MESSAGE =
  "L'opération a échoué et rien n'a été enregistré. Vérifie ta connexion, puis réessaie.";

export async function attempt<T extends { ok: boolean }>(
  promise: Promise<T>,
): Promise<T | { ok: false; error: string }> {
  try {
    return await promise;
  } catch {
    return { ok: false, error: ACTION_FAILURE_MESSAGE };
  }
}
