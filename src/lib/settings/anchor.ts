import 'server-only';

import { unstable_cache, revalidateTag } from 'next/cache';
import {
  FALLBACK_ANCHOR,
  type ChapterAnchor,
} from '@/domain/chapter/schedule';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Ancrage du calendrier de parution, stocké en base (migration 0026).
 *
 * « Le chapitre N a été jugé le dimanche D. » Tout le calcul du numéro de la
 * semaine en découle — donc si cette paire est fausse, le site ouvre les
 * prédictions sur le mauvais chapitre, et rien ne le rattrape : la source
 * externe est figée au chapitre 1085.
 *
 * Il vivait dans une constante du code. Le corriger demandait une modification
 * du source et un redéploiement, un dimanche soir. Il se corrige maintenant
 * depuis le Poste de commandement, en deux champs.
 */

const CLE = 'chapter_anchor';

/** Étiquette de cache : posée à la lecture, purgée à l'écriture. */
export const ANCHOR_TAG = 'settings:chapter-anchor';

interface AnchorRow {
  chapterNumber: number;
  weekOf: string;
}

/**
 * Ancrage courant.
 *
 * Mis en cache : il est lu à chaque proposition de chapitre et à chaque
 * affichage du Poste de commandement, et il change quelques fois par an. La
 * revalidation longue est sans risque puisque l'écriture purge l'étiquette.
 *
 * ⚠️ `unstable_cache` sérialise en JSON : la date revient en chaîne. Elle est
 * reconstruite ici — c'est le même piège que `reviveChapter` dans `lib/cache`,
 * et il ne se voit qu'à la deuxième visite.
 */
const lireAncrage = unstable_cache(
  async (): Promise<AnchorRow | null> => {
    if (!isDatabaseConfigured()) return null;

    const { data, error } = await db()
      .from('app_settings')
      .select('value')
      .eq('key', CLE)
      .maybeSingle();

    // Une erreur de lecture ne doit pas empêcher le site de fonctionner : on
    // retombe sur l'ancrage du code, qui vaut mieux que rien.
    if (error || !data) return null;

    const valeur = data.value as Partial<AnchorRow> | null;
    if (
      !valeur ||
      typeof valeur.chapterNumber !== 'number' ||
      typeof valeur.weekOf !== 'string'
    ) {
      return null;
    }

    return { chapterNumber: valeur.chapterNumber, weekOf: valeur.weekOf };
  },
  ['chapter-anchor'],
  { tags: [ANCHOR_TAG], revalidate: 300 },
);

export async function getChapterAnchor(): Promise<ChapterAnchor> {
  const ligne = await lireAncrage();
  if (!ligne) return FALLBACK_ANCHOR;

  const weekOf = new Date(ligne.weekOf);
  if (Number.isNaN(weekOf.getTime())) return FALLBACK_ANCHOR;

  return { chapterNumber: ligne.chapterNumber, weekOf };
}

/** L'ancrage vient-il de la base, ou du repli codé en dur ? */
export async function chapterAnchorIsStored(): Promise<boolean> {
  return (await lireAncrage()) !== null;
}

export async function setChapterAnchor(
  anchor: ChapterAnchor,
  adminPlayerId: string,
): Promise<void> {
  const { error } = await db()
    .from('app_settings')
    .upsert(
      {
        key: CLE,
        value: {
          chapterNumber: anchor.chapterNumber,
          weekOf: anchor.weekOf.toISOString(),
        },
        updated_at: new Date().toISOString(),
        // Une correction de calendrier décale tous les chapitres suivants :
        // elle doit être imputable à quelqu'un.
        updated_by: adminPlayerId,
      },
      { onConflict: 'key' },
    );

  if (error) throw new Error(`app_settings.upsert : ${error.message}`);

  revalidateTag(ANCHOR_TAG);
}
