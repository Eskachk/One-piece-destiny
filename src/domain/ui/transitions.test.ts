import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Un bouton qui se désactive pendant l'appel doit **réellement** se désactiver.
 *
 * ## Le piège
 *
 * `useTransition` ne suit que le travail qu'on lui donne. Écrit ainsi :
 *
 *     startTransition(() => void monAction())
 *
 * la fonction passée est **synchrone** : elle lance la promesse et rend la
 * main immédiatement. React considère donc la transition terminée avant même
 * que la requête ne parte, `pending` retombe dans la milliseconde, et le
 * `disabled={pending}` posé juste au-dessus du bouton ne protège rien.
 *
 * Le symptôme n'est pas une erreur mais un martèlement : le joueur clique, ne
 * voit rien changer, reclique — et chaque clic part réellement. Sur une action
 * idempotente, cela ne fait que du bruit. Sur une bascule, l'état final
 * dépend de l'ordre d'arrivée des requêtes.
 *
 * La forme correcte donne une fonction **asynchrone** à la transition, qui
 * reste alors en cours jusqu'à la résolution :
 *
 *     startTransition(async () => { await monAction(); })
 *
 * ## Pourquoi un test qui lit le source
 *
 * Parce que la faute ne vit pas dans une fonction qu'on puisse appeler : elle
 * vit dans la forme d'un appel. Aucun test de comportement ne la distingue
 * d'un appel correct — les deux finissent par écrire la même chose en base.
 * Seule sa syntaxe la trahit.
 */

const DOSSIERS = ['src/components', 'src/app'];

function fichiers(racine: string): string[] {
  const out: string[] = [];
  for (const entree of readdirSync(racine, { withFileTypes: true })) {
    const chemin = join(racine, entree.name);
    if (entree.isDirectory()) out.push(...fichiers(chemin));
    else if (entree.name.endsWith('.tsx') || entree.name.endsWith('.ts')) out.push(chemin);
  }
  return out;
}

describe('transitions et boutons', () => {
  it('ne lance jamais une transition sur une fonction synchrone', () => {
    // `startTransition(() =>` suivi d'autre chose que `async` : la transition
    // se termine avant l'appel, et le bouton reste cliquable.
    const fautifs: string[] = [];

    for (const dossier of DOSSIERS) {
      for (const chemin of fichiers(dossier)) {
        const source = readFileSync(chemin, 'utf8');
        for (const ligne of source.split('\n')) {
          // Une transition rendue à une fonction fléchée sans `async`, et dont
          // le corps appelle quelque chose qui ressemble à une action serveur.
          if (/startTransition\(\(\)\s*=>\s*(?!\{?\s*$)(?!async)/.test(ligne) && /Action\(|void /.test(ligne)) {
            fautifs.push(`${chemin} : ${ligne.trim()}`);
          }
        }
      }
    }

    expect(fautifs).toEqual([]);
  });

  it('ne laisse aucune action de bascule côté serveur', () => {
    // Une bascule — « inverse l'état courant » — ne peut pas être idempotente :
    // deux requêtes concurrentes lisent le même état de départ, et le résultat
    // dépend de l'ordre d'arrivée. Les actions doivent poser un état voulu.
    //
    // Le nom est le seul indice fiable : `toggleXAction`. Une action nommée
    // ainsi est presque toujours racée.
    const fautives: string[] = [];
    for (const chemin of fichiers('src/app/actions')) {
      const source = readFileSync(chemin, 'utf8');
      for (const nom of source.matchAll(/export async function (toggle\w+Action)/g)) {
        fautives.push(`${chemin} : ${nom[1]}`);
      }
    }

    expect(fautives).toEqual([]);
  });
});
