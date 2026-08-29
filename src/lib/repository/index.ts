import 'server-only';

import { isDatabaseConfigured } from '@/lib/supabase-admin';
import { memoryRepository } from './memory';
import { postgresRepository } from './postgres';
import type { Repository } from './types';

export type { Repository, ChapterResultRow } from './types';

/**
 * Sélection de l'implémentation.
 *
 * Postgres dès que les variables d'environnement sont présentes, mémoire
 * sinon. Le choix est exposé pour que l'interface puisse dire clairement au
 * joueur que ses données ne survivront pas — un prototype qui perd les
 * données sans le dire est pire qu'un prototype qui l'annonce.
 */
const usePostgres = isDatabaseConfigured();

export const PERSISTENCE_MODE: 'memory' | 'postgres' = usePostgres
  ? 'postgres'
  : 'memory';

export function getRepository(): Repository {
  return usePostgres ? postgresRepository : memoryRepository;
}
