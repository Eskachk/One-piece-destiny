import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { adminStats } from '@/lib/admin/stats';
import { CHARACTER_INDEX } from '@/data/characters';
import { productOf } from '@/domain/payments/catalog';
import { DIVISION_LABEL, type Division } from '@/domain/season/divisions';
import { RARITY_LABEL } from '@/domain/collection/rarity';
import type { Rarity } from '@/domain/types';
import {
  incidentsParOrigine,
  incidentsRecents,
} from '@/lib/observability/incidents';
import { Nav } from '@/components/Nav';
import { GraphiqueJours } from '@/components/admin/GraphiqueJours';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Statistiques du poste de commandement.
 *
 * Tout ce que la base sait du jeu, en une page : qui joue, ce qui se vend
 * en argent réel, ce qui s'échange en Berries, ce que les joueurs
 * possèdent, ce qu'ils alignent. Un seul appel (`statistiques_admin`) ;
 * la page ne fait que nommer les personnages et mettre en forme.
 *
 * Les pseudos qui apparaissent (vendeurs, collectionneurs) sont ceux du
 * classement public : rien ici n'est plus intime que ce que tout joueur
 * voit déjà.
 */

const number = (value: number) => value.toLocaleString('fr-FR');
const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)} %` : '—';
const nom = (characterId: string) => CHARACTER_INDEX.get(characterId)?.name ?? characterId;
const rarete = (characterId: string) => {
  const r = CHARACTER_INDEX.get(characterId)?.rarity;
  return r ? RARITY_LABEL[r] : '';
};
const pluriel = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un);

const SOURCE_LABEL: Record<string, string> = {
  CHEST: 'Coffres',
  STARTER_CHEST: 'Coffre d’arrivée',
  ROYAL_CHEST: 'Coffres royaux',
  CRAFT: 'Fabrication',
  MARKET: 'Marché',
  PURCHASE: 'Boutique',
  GRANT: 'Attribution',
};
const KIND_LABEL: Record<string, string> = {
  WEEKLY: 'hebdomadaires',
  STARTER: 'd’arrivée',
  ROYAL: 'royaux',
};

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-turquoise/20 bg-navy/40 p-3">
      <p className="text-[11px] uppercase tracking-widest text-parchment/50">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl text-treasure">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-parchment/45">{hint}</p>}
    </div>
  );
}

/**
 * Les rubriques, dans l'ordre de lecture d'un compte rendu : d'abord ce qui
 * bouge (le résumé, les trente jours), puis qui joue, puis l'argent, puis
 * le jeu lui-même, et le système en dernier. Le sommaire en haut de page
 * reprend cet ordre ; chaque rubrique porte une ancre.
 */
const RUBRIQUES = [
  { id: 'bref', numero: 1, titre: 'En bref' },
  { id: 'jours', numero: 2, titre: 'Les trente derniers jours' },
  { id: 'joueurs', numero: 3, titre: 'Joueurs' },
  { id: 'boutique', numero: 4, titre: 'Boutique — argent réel' },
  { id: 'marche', numero: 5, titre: 'Marché — Berries entre joueurs' },
  { id: 'economie', numero: 6, titre: 'Économie et collection' },
  { id: 'jeu', numero: 7, titre: 'Jeu' },
  { id: 'systeme', numero: 8, titre: 'Système' },
] as const;

type RubriqueId = (typeof RUBRIQUES)[number]['id'];

function Section({
  id,
  note,
  children,
}: {
  id: RubriqueId;
  note?: string;
  children: React.ReactNode;
}) {
  const rubrique = RUBRIQUES.find((r) => r.id === id)!;
  return (
    <section id={id} className="mt-10 scroll-mt-4 border-t border-turquoise/15 pt-6">
      <h2 className="font-display text-xl text-parchment">
        <span className="mr-2 font-mono text-sm text-treasure">{rubrique.numero}.</span>
        {rubrique.titre}
      </h2>
      {note && <p className="mt-1 max-w-2xl text-xs text-parchment/50">{note}</p>}
      {children}
    </section>
  );
}

/** Sous-titre à l'intérieur d'une rubrique, quand elle a plusieurs blocs. */
function SousTitre({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 text-[11px] uppercase tracking-widest text-parchment/55">{children}</h3>
  );
}

function Sommaire() {
  return (
    <nav aria-label="Sommaire" className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {RUBRIQUES.map((r) => (
        <a key={r.id} href={`#${r.id}`} className="text-turquoise underline-offset-2 hover:underline">
          <span className="mr-1 font-mono text-xs text-parchment/45">{r.numero}.</span>
          {r.titre}
        </a>
      ))}
    </nav>
  );
}

/** Un classement : rang, libellé, valeur — et une seconde valeur en option. */
function Palmares({
  titre,
  lignes,
  vide,
}: {
  titre: string;
  lignes: { cle: string; libelle: string; detail?: string; valeur: string; valeur2?: string }[];
  vide: string;
}) {
  return (
    <div className="rounded-lg border border-turquoise/20 bg-navy/40 p-3">
      <p className="text-[11px] uppercase tracking-widest text-parchment/50">{titre}</p>
      {lignes.length === 0 ? (
        <p className="mt-2 text-xs text-parchment/45">{vide}</p>
      ) : (
        <ol className="mt-2 space-y-1">
          {lignes.map((l, i) => (
            <li key={l.cle} className="flex items-baseline gap-2 text-sm">
              <span className="w-5 shrink-0 font-mono text-xs text-parchment/40">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-parchment/90">
                {l.libelle}
                {l.detail && <span className="ml-1 text-[11px] text-parchment/45">{l.detail}</span>}
              </span>
              <span className="shrink-0 font-mono text-treasure">{l.valeur}</span>
              {l.valeur2 && (
                <span className="shrink-0 font-mono text-xs text-parchment/50">{l.valeur2}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

async function JournalIncidents() {
  const [origines, recents] = await Promise.all([
    incidentsParOrigine(),
    incidentsRecents(30),
  ]);

  return (
    <div className="mt-5">
      <SousTitre>Incidents</SousTitre>

      {origines.length === 0 ? (
        <p className="mt-2 text-sm text-parchment/60">
          Aucun incident sur les dernières 24 heures.
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {origines.map((o) => (
            <li
              key={o.scope}
              className="rounded-lg border border-orange/40 bg-orange/10 px-3 py-1 text-xs text-parchment"
            >
              {o.scope} — <span className="font-mono">{o.n}</span>
            </li>
          ))}
        </ul>
      )}

      {recents.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-parchment/50">
                <th className="pb-2">Quand</th>
                <th className="pb-2">Origine</th>
                <th className="pb-2">Message</th>
                <th className="pb-2">Code</th>
              </tr>
            </thead>
            <tbody>
              {recents.map((i) => (
                <tr
                  key={i.id}
                  className="border-t border-turquoise/10 text-parchment/80"
                >
                  <td className="py-2 whitespace-nowrap font-mono">
                    {new Date(i.at).toLocaleString('fr-FR')}
                  </td>
                  <td className="whitespace-nowrap">{i.scope}</td>
                  <td className="max-w-[24rem] truncate" title={i.message}>
                    {i.message}
                  </td>
                  <td className="font-mono text-parchment/50">
                    {i.digest ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function AdminStatsPage() {
  await requireAdmin();
  const stats = await adminStats();

  if (!stats) {
    return (
      <main className="hb-page mx-auto w-full max-w-3xl px-5 py-8">
        <h1 className="font-display text-3xl text-parchment">Statistiques</h1>
        <p className="mt-4 text-sm text-parchment/70">
          Base de données non configurée : aucune statistique à afficher.
        </p>
        <Nav />
      </main>
    );
  }

  const { joueurs, economie, boutique, marche, collection, jeu, courrier, risque, series } = stats;
  const inscriptions30 = series.reduce((a, p) => a + p.inscriptions, 0);

  return (
    <main className="hb-page mx-auto w-full max-w-3xl px-5 py-8">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        Poste de commandement
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-parchment">Statistiques</h1>
          <p className="mt-1 text-xs text-parchment/45">
            Calculées à l’instant — {new Date(stats.genere_le).toLocaleString('fr-FR')}.
          </p>
        </div>
        {/* Deux fichiers : le compte rendu complet, qu'on ouvre et qu'on
            imprime, et les séries brutes pour un tableur. */}
        <div className="flex flex-wrap gap-2">
          <a
            href="/admin/stats/rapport"
            download
            className="rounded-lg bg-treasure px-3 py-2 text-sm font-semibold text-navy"
          >
            ⬇ Télécharger le compte rendu
          </a>
          <a
            href="/admin/stats/rapport?format=csv"
            download
            className="rounded-lg border border-turquoise/40 px-3 py-2 text-sm text-turquoise"
          >
            Séries (CSV)
          </a>
        </div>
      </div>

      <nav className="mt-4 flex gap-3 text-sm">
        <Link href="/admin" className="text-turquoise underline">
          Chapitre
        </Link>
        <Link href="/admin/fraude" className="text-turquoise underline">
          Fraude
        </Link>
        <Link href="/admin/journal" className="text-turquoise underline">
          Journal
        </Link>
      </nav>

      <Sommaire />

      {/* --- 1. En bref -------------------------------------------------- */}
      <Section id="bref" note="Six chiffres pour savoir comment va le jeu aujourd’hui. Le détail est dans les rubriques suivantes.">
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile label="Comptes" value={number(joueurs.total)} hint={`${joueurs.crees_7j} créés sur 7 j`} />
          <Tile label="Actifs — 7 j" value={number(joueurs.actifs_7j)} hint={`${joueurs.actifs_24h} sur 24 h`} />
          <Tile
            label="Ont déjà joué"
            value={number(joueurs.ont_joue)}
            hint={`${pct(joueurs.ont_joue, joueurs.total)} des comptes`}
          />
          <Tile label="Revenu — 30 j" value={euros(boutique.revenu_30j)} hint={`${boutique.achats_30j} achats`} />
          <Tile
            label="Ventes au marché — 30 j"
            value={number(marche.ventes_30j)}
            hint={`${number(marche.volume_30j)} Berries`}
          />
          <Tile label="Équipages — chapitre en cours" value={number(jeu.equipes_courant)} />
        </div>
      </Section>

      {/* --- 2. Au jour le jour ------------------------------------------ */}
      <Section
        id="jours"
        note="Un graphique par mesure : inscriptions, ventes au marché et achats en boutique ne se comptent pas dans la même unité. Survoler une colonne donne sa valeur ; « Voir les valeurs » déplie le détail."
      >
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <GraphiqueJours
            titre="Inscriptions"
            points={series.map((p) => ({ jour: p.jour, valeur: p.inscriptions }))}
          />
          <GraphiqueJours
            titre="Ventes au marché"
            points={series.map((p) => ({ jour: p.jour, valeur: p.ventes }))}
          />
          <GraphiqueJours
            titre="Achats en boutique"
            points={series.map((p) => ({ jour: p.jour, valeur: p.cents }))}
            formatValeur={(v) => euros(v)}
          />
        </div>
      </Section>

      {/* --- 3. Joueurs -------------------------------------------------- */}
      <Section id="joueurs">
        <SousTitre>Arrivées</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Comptes" value={number(joueurs.total)} hint={`${joueurs.google} via Google`} />
          <Tile label="Créés — 24 h" value={number(joueurs.crees_24h)} />
          <Tile label="Créés — 7 j" value={number(joueurs.crees_7j)} />
          <Tile label="Créés — 30 j" value={number(joueurs.crees_30j)} hint={`${number(inscriptions30)} sur les 30 derniers jours`} />
        </div>

        <SousTitre>Engagement</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Actifs — 24 h" value={number(joueurs.actifs_24h)} hint="Une session vue" />
          <Tile label="Actifs — 7 j" value={number(joueurs.actifs_7j)} />
          <Tile
            label="Ont déjà joué"
            value={number(joueurs.ont_joue)}
            hint={`${pct(joueurs.ont_joue, joueurs.total)} — au moins un équipage`}
          />
          <Tile label="Fidèles" value={number(joueurs.fideles)} hint="Deux chapitres joués ou plus" />
        </div>

        <SousTitre>Compte</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile
            label="Adresse vérifiée"
            value={number(joueurs.verifies)}
            hint={`${pct(joueurs.verifies, joueurs.total)} des comptes`}
          />
          <Tile label="Coffre d’arrivée ouvert" value={number(joueurs.coffre_arrivee)} />
          <Tile
            label="Parrainages"
            value={number(joueurs.parrainages)}
            hint={`${joueurs.parrainages_recompenses} récompensés`}
          />
          <Tile label="Restreints" value={number(joueurs.restreints)} />
        </div>

        {/* Le rapport entre comptes créés et comptes qui jouent est le
            meilleur indicateur d'une ferme : beaucoup d'inscriptions, peu de
            parties. Il mérite d'être calculé ici plutôt que de tête. */}
        {joueurs.total > 0 && (
          <p className="mt-3 max-w-2xl text-xs text-parchment/55">
            {pct(joueurs.ont_joue, joueurs.total)} des comptes ont déjà verrouillé un
            équipage. Un effondrement de ce rapport après un pic d’inscriptions est le
            signe le plus fiable d’une création massive de comptes.
          </p>
        )}

        {joueurs.divisions.length > 0 && (
          <>
            <SousTitre>Divisions</SousTitre>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {joueurs.divisions.map((d) => (
                <li
                  key={d.division}
                  className="rounded-lg border border-turquoise/20 px-3 py-1 text-parchment/80"
                >
                  {DIVISION_LABEL[d.division as Division] ?? d.division} —{' '}
                  <span className="font-mono text-treasure">{number(d.n)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      {/* --- 4. Boutique ------------------------------------------------- */}
      <Section
        id="boutique"
        note="Seules les intentions passées à PAID par le webhook comptent : ce qui a été encaissé, jamais ce qui a été ouvert."
      >
        <SousTitre>Revenu</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Total" value={euros(boutique.revenu_total)} />
          <Tile label="30 jours" value={euros(boutique.revenu_30j)} />
          <Tile label="7 jours" value={euros(boutique.revenu_7j)} />
          <Tile
            label="Panier moyen"
            value={
              boutique.achats_total > 0
                ? euros(boutique.revenu_total / boutique.achats_total)
                : '—'
            }
          />
        </div>
        <SousTitre>Achats</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile
            label="Achats"
            value={number(boutique.achats_total)}
            hint={`${boutique.acheteurs} ${pluriel(boutique.acheteurs, 'acheteur distinct', 'acheteurs distincts')}`}
          />
          <Tile
            label="Conversion — 30 j"
            value={pct(boutique.achats_30j, boutique.intentions_30j)}
            hint={`${boutique.achats_30j} payés sur ${boutique.intentions_30j} caisses ouvertes`}
          />
          <Tile label="Échecs — 30 j" value={number(boutique.echecs_30j)} />
          <Tile
            label="Dernier achat"
            value={
              boutique.dernier_achat
                ? new Date(boutique.dernier_achat).toLocaleDateString('fr-FR')
                : '—'
            }
          />
        </div>
        <div className="mt-3">
          <Palmares
            titre="Produits les plus achetés"
            vide="Aucun achat encaissé pour le moment."
            lignes={boutique.produits.map((p) => ({
              cle: p.product_id,
              libelle: productOf(p.product_id)?.label ?? p.product_id,
              valeur: `${number(p.achats)} ×`,
              valeur2: euros(p.cents),
            }))}
          />
        </div>
      </Section>

      {/* --- 5. Marché --------------------------------------------------- */}
      <Section id="marche">
        <SousTitre>Activité</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile label="Annonces actives" value={number(marche.annonces_actives)} />
          <Tile
            label="Ventes — 7 j"
            value={number(marche.ventes_7j)}
            hint={`${number(marche.volume_7j)} Berries`}
          />
          <Tile
            label="Ventes — 30 j"
            value={number(marche.ventes_30j)}
            hint={`${number(marche.volume_30j)} Berries`}
          />
          <Tile
            label="Ventes — total"
            value={number(marche.ventes_total)}
            hint={`${number(marche.volume_total)} Berries`}
          />
          <Tile
            label="Prix moyen — 30 j"
            value={marche.prix_moyen_30j === null ? '—' : `${number(marche.prix_moyen_30j)} 🪙`}
          />
          <Tile
            label="Taxe prélevée"
            value={`${number(marche.taxe_total)} 🪙`}
            hint="Berries retirées de la circulation"
          />
        </div>
        <SousTitre>Palmarès</SousTitre>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Palmares
            titre="Personnages les plus vendus"
            vide="Aucune vente conclue."
            lignes={marche.plus_vendus.map((v) => ({
              cle: v.character_id,
              libelle: nom(v.character_id),
              detail: rarete(v.character_id),
              valeur: `${number(v.ventes)} ${pluriel(v.ventes, 'vente', 'ventes')}`,
              valeur2: `~${number(v.prix_moyen)} 🪙`,
            }))}
          />
          <Palmares
            titre="Personnages les plus chers"
            vide="Aucune vente conclue."
            lignes={marche.plus_chers.map((c) => ({
              cle: c.character_id,
              libelle: nom(c.character_id),
              detail: rarete(c.character_id),
              valeur: `${number(c.prix_max)} 🪙`,
              valeur2: `moy. ${number(c.prix_moyen)}`,
            }))}
          />
          <Palmares
            titre="Personnages les plus surveillés"
            vide="Aucune liste de surveillance."
            lignes={marche.surveilles.map((w) => ({
              cle: w.character_id,
              libelle: nom(w.character_id),
              detail: rarete(w.character_id),
              valeur: `${number(w.n)} ${pluriel(w.n, 'joueur', 'joueurs')}`,
            }))}
          />
          <Palmares
            titre="Vendeurs les plus actifs"
            vide="Aucune vente conclue."
            lignes={marche.vendeurs.map((s) => ({
              cle: s.handle,
              libelle: s.handle,
              valeur: `${number(s.ventes)} ${pluriel(s.ventes, 'vente', 'ventes')}`,
              valeur2: `${number(s.volume)} 🪙`,
            }))}
          />
        </div>
      </Section>

      {/* --- 6. Économie et collection ----------------------------------- */}
      <Section id="economie">
        <SousTitre>Monnaie et réserves</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile
            label="Berries en circulation"
            value={number(economie.berries)}
            hint={`+ ${number(economie.berries_attente)} en attente de déblocage`}
          />
          <Tile label="Coffres en réserve" value={number(economie.coffres_reserve)} />
          <Tile label="Coffres royaux" value={number(economie.coffres_royaux)} />
          <Tile
            label="Fragments"
            value={number(economie.fragments)}
            hint={`${number(economie.fragments_depenses)} dépensés`}
          />
        </div>
        <SousTitre>Ouvertures et fabrications</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile
            label="Coffres ouverts"
            value={number(economie.coffres_ouverts_total)}
            hint={`${number(economie.coffres_ouverts_7j)} sur 7 j · ${economie.pitie_declenchee} garanties déclenchées`}
          />
          <Tile
            label="Fabrications"
            value={number(economie.fabrications_total)}
            hint={`${number(economie.fabrications_7j)} sur 7 j`}
          />
          <Tile
            label="Cartes"
            value={number(economie.cartes)}
            hint={`${number(economie.cartes_frappees)} frappées`}
          />
        </div>
        {economie.coffres_par_type.length > 0 && (
          <p className="mt-2 text-xs text-parchment/55">
            Coffres ouverts :{' '}
            {economie.coffres_par_type
              .map((k) => `${number(k.n)} ${KIND_LABEL[k.kind] ?? k.kind}`)
              .join(' · ')}
            .
          </p>
        )}
        <SousTitre>Collection</SousTitre>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Palmares
            titre="Cartes par rareté"
            vide="Aucune carte."
            lignes={collection.par_rarete.map((r) => ({
              cle: r.rarity,
              libelle: RARITY_LABEL[r.rarity as Rarity] ?? r.rarity,
              valeur: number(r.n),
              valeur2: pct(r.n, economie.cartes),
            }))}
          />
          <Palmares
            titre="Cartes par provenance"
            vide="Aucune carte."
            lignes={collection.par_source.map((s) => ({
              cle: s.source,
              libelle: SOURCE_LABEL[s.source] ?? s.source,
              valeur: number(s.n),
              valeur2: pct(s.n, economie.cartes),
            }))}
          />
          <Palmares
            titre="Personnages les plus possédés"
            vide="Aucune carte."
            lignes={collection.plus_possedes.map((p) => ({
              cle: p.character_id,
              libelle: nom(p.character_id),
              detail: rarete(p.character_id),
              valeur: `${number(p.n)} ex.`,
            }))}
          />
          <Palmares
            titre="Personnages les plus fabriqués"
            vide="Aucune fabrication par fragments."
            lignes={collection.plus_fabriques.map((f) => ({
              cle: f.character_id,
              libelle: nom(f.character_id),
              detail: rarete(f.character_id),
              valeur: `${number(f.n)} ×`,
            }))}
          />
          <Palmares
            titre="Plus grandes collections"
            vide="Aucune carte."
            lignes={collection.collectionneurs.map((k) => ({
              cle: k.handle,
              libelle: k.handle,
              valeur: `${number(k.cartes)} cartes`,
            }))}
          />
        </div>
      </Section>

      {/* --- 7. Jeu ------------------------------------------------------ */}
      <Section id="jeu">
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="Équipages — chapitre en cours" value={number(jeu.equipes_courant)} />
          <Tile label="Réponses aux pronostics" value={number(jeu.reponses_total)} />
          <Tile label="Ligues" value={number(jeu.ligues)} />
          <Tile label="Commentaires" value={number(jeu.commentaires)} />
        </div>
        <SousTitre>Les plus alignés</SousTitre>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Palmares
            titre="Chapitre en cours"
            vide="Aucun équipage verrouillé."
            lignes={jeu.plus_alignes_courant.map((a) => ({
              cle: a.character_id,
              libelle: nom(a.character_id),
              detail: rarete(a.character_id),
              valeur: `${number(a.n)} éq.`,
              valeur2: pct(a.n, jeu.equipes_courant),
            }))}
          />
          <Palmares
            titre="Depuis le début"
            vide="Aucun équipage verrouillé."
            lignes={jeu.plus_alignes.map((a) => ({
              cle: a.character_id,
              libelle: nom(a.character_id),
              detail: rarete(a.character_id),
              valeur: `${number(a.n)} éq.`,
            }))}
          />
        </div>

        <SousTitre>Chapitres</SousTitre>
        {jeu.chapitres.length === 0 ? (
          <p className="mt-2 text-sm text-parchment/60">Aucun chapitre.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-turquoise/20 bg-navy/40 p-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-widest text-parchment/50">
                  <th className="py-2">Chapitre</th>
                  <th>État</th>
                  <th className="text-right">Équipages</th>
                  <th className="text-right">Moyenne</th>
                  <th className="text-right">Meilleur</th>
                  <th className="text-right">Pronostics</th>
                </tr>
              </thead>
              <tbody>
                {jeu.chapitres.map((chapter) => (
                  <tr
                    key={chapter.chapter_number}
                    className="border-t border-turquoise/10 text-parchment/80"
                  >
                    <td className="py-2 font-mono">#{chapter.chapter_number}</td>
                    <td className="text-xs">{chapter.status}</td>
                    <td className="text-right font-mono">{number(chapter.equipes)}</td>
                    <td className="text-right font-mono">{chapter.moyenne ?? '—'}</td>
                    <td className="text-right font-mono text-treasure">
                      {chapter.meilleur ?? '—'}
                    </td>
                    <td className="text-right font-mono text-xs">
                      {chapter.questions === 0
                        ? '—'
                        : `${number(chapter.reponses)} rép. / ${chapter.questions} q.`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* --- 8. Système -------------------------------------------------- */}
      <Section id="systeme">
        <SousTitre>Courrier et notifications</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile
            label="E-mails envoyés"
            value={number(courrier.envoyes)}
            hint={`${number(courrier.envoyes_7j)} sur 7 j`}
          />
          <Tile label="En attente" value={number(courrier.en_attente)} />
          <Tile
            label="Abandonnés"
            value={number(courrier.morts)}
            hint="Après épuisement des tentatives"
          />
          <Tile
            label="Notifications — 7 j"
            value={number(courrier.notifications_7j)}
            hint={`${number(courrier.notifications_non_lues)} non lues au total`}
          />
        </div>
        <SousTitre>Risque</SousTitre>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="À examiner" value={number(risque.a_examiner)} />
          <Tile label="Restreints" value={number(risque.restreints)} />
          <Tile label="Évaluations — 7 j" value={number(risque.evaluations_7j)} />
          <Tile
            label="Faux positifs"
            value={number(risque.faux_positifs)}
            hint="Conservés pour mesurer la justesse"
          />
        </div>
        <JournalIncidents />
      </Section>

      <Nav />
    </main>
  );
}
