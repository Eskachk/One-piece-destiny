import 'server-only';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Statistiques du poste de commandement.
 *
 * Tout vient d'un seul appel à `statistiques_admin()` (migration 0041) : les
 * agrégations — les plus vendus, les plus alignés, les plus possédés — sont
 * faites par la base, qui a les index pour ça, pas par la page après avoir
 * rapatrié des tables entières.
 *
 * La version précédente faisait quinze requêtes, dont deux fausses depuis
 * des mois (`wallets.unopened_chests`, `market_transactions.at` — colonnes
 * inexistantes) : la page affichait 0 Berries en circulation et 0 vente,
 * quoi qu'il se passe, sans erreur visible. Une fonction SQL est vérifiée
 * à l'appel ; une colonne fausse y est une erreur, pas un zéro.
 */

export interface StatsJoueurs {
  total: number;
  crees_24h: number;
  crees_7j: number;
  crees_30j: number;
  verifies: number;
  google: number;
  coffre_arrivee: number;
  ont_joue: number;
  /** Ont joué au moins deux chapitres. */
  fideles: number;
  actifs_24h: number;
  actifs_7j: number;
  parrainages: number;
  parrainages_recompenses: number;
  restreints: number;
  divisions: { division: string; n: number }[];
}

export interface StatsEconomie {
  berries: number;
  berries_attente: number;
  coffres_royaux: number;
  coffres_reserve: number;
  fragments: number;
  cartes: number;
  cartes_frappees: number;
  coffres_ouverts_total: number;
  coffres_ouverts_7j: number;
  coffres_par_type: { kind: string; n: number }[];
  pitie_declenchee: number;
  fabrications_total: number;
  fabrications_7j: number;
  fragments_depenses: number;
}

export interface StatsBoutique {
  revenu_total: number;
  revenu_30j: number;
  revenu_7j: number;
  achats_total: number;
  achats_30j: number;
  acheteurs: number;
  intentions_30j: number;
  echecs_30j: number;
  dernier_achat: string | null;
  produits: { product_id: string; achats: number; cents: number }[];
}

export interface StatsMarche {
  annonces_actives: number;
  ventes_total: number;
  ventes_7j: number;
  ventes_30j: number;
  volume_total: number;
  volume_7j: number;
  volume_30j: number;
  taxe_total: number;
  prix_moyen_30j: number | null;
  plus_vendus: { character_id: string; ventes: number; volume: number; prix_moyen: number }[];
  plus_chers: { character_id: string; prix_max: number; prix_moyen: number; ventes: number }[];
  vendeurs: { handle: string; ventes: number; volume: number }[];
  surveilles: { character_id: string; n: number }[];
}

export interface StatsCollection {
  par_rarete: { rarity: string; n: number }[];
  par_source: { source: string; n: number }[];
  plus_possedes: { character_id: string; n: number }[];
  plus_fabriques: { character_id: string; n: number }[];
  collectionneurs: { handle: string; cartes: number }[];
}

export interface StatsJeu {
  chapitres: {
    chapter_number: number;
    status: string;
    equipes: number;
    moyenne: number | null;
    meilleur: number | null;
    reponses: number;
    questions: number;
  }[];
  plus_alignes: { character_id: string; n: number }[];
  plus_alignes_courant: { character_id: string; n: number }[];
  equipes_courant: number;
  reponses_total: number;
  ligues: number;
  commentaires: number;
}

export interface StatsCourrier {
  en_attente: number;
  envoyes: number;
  envoyes_7j: number;
  morts: number;
  notifications_7j: number;
  notifications_non_lues: number;
}

export interface StatsRisque {
  a_examiner: number;
  restreints: number;
  faux_positifs: number;
  evaluations_7j: number;
}

export interface AdminStats {
  joueurs: StatsJoueurs;
  economie: StatsEconomie;
  boutique: StatsBoutique;
  marche: StatsMarche;
  collection: StatsCollection;
  jeu: StatsJeu;
  courrier: StatsCourrier;
  risque: StatsRisque;
  genere_le: string;
}

export async function adminStats(): Promise<AdminStats | null> {
  if (!isDatabaseConfigured()) return null;

  const { data, error } = await db().rpc('statistiques_admin');
  if (error) throw new Error(`statistiques_admin : ${error.message}`);
  return data as AdminStats;
}
