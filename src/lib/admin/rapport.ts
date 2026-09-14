import 'server-only';
import type { AdminStats } from './stats';
import { CHARACTER_INDEX } from '@/data/characters';
import { productOf } from '@/domain/payments/catalog';
import { DIVISION_LABEL, type Division } from '@/domain/season/divisions';
import { RARITY_LABEL } from '@/domain/collection/rarity';
import type { Rarity } from '@/domain/types';

/**
 * Le compte rendu téléchargeable du poste de commandement.
 *
 * Un fichier HTML autonome — feuille de style incluse, aucune ressource
 * distante — qui s'ouvre dans n'importe quel navigateur et s'imprime en PDF
 * d'un Ctrl+P. Il reprend les mêmes chiffres que la page, dans le même
 * ordre, mais sur fond blanc et sans navigation : c'est un document, pas un
 * écran. Le CSV, lui, ne porte que les séries journalières, pour un tableur.
 *
 * Tout ce qui vient de la base passe par `echapper` avant d'entrer dans le
 * HTML : un pseudo de joueur est une chaîne comme une autre, et un pseudo
 * qui contient `<script>` ne doit rien pouvoir faire dans un fichier que
 * l'administrateur ouvrira chez lui.
 */

const number = (v: number) => v.toLocaleString('fr-FR');
const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 100)} %` : '—';
const nom = (id: string) => CHARACTER_INDEX.get(id)?.name ?? id;
const rarete = (id: string) => {
  const r = CHARACTER_INDEX.get(id)?.rarity;
  return r ? RARITY_LABEL[r] : '';
};
const jour = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

export function echapper(texte: string): string {
  return texte
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const SOURCE_LABEL: Record<string, string> = {
  CHEST: 'Coffres',
  STARTER_CHEST: 'Coffre d’arrivée',
  ROYAL_CHEST: 'Coffres royaux',
  CRAFT: 'Fabrication',
  MARKET: 'Marché',
  PURCHASE: 'Boutique',
  GRANT: 'Attribution',
};

type Ligne = string[];

function tuiles(items: [string, string, string?][]): string {
  return `<div class="tuiles">${items
    .map(
      ([l, v, h]) =>
        `<div class="tuile"><div class="l">${echapper(l)}</div><div class="v">${echapper(v)}</div>${
          h ? `<div class="h">${echapper(h)}</div>` : ''
        }</div>`,
    )
    .join('')}</div>`;
}

function tableau(titre: string, entetes: string[], lignes: Ligne[], vide: string): string {
  if (lignes.length === 0) {
    return `<h3>${echapper(titre)}</h3><p class="vide">${echapper(vide)}</p>`;
  }
  return `<h3>${echapper(titre)}</h3><table><thead><tr>${entetes
    .map((e) => `<th>${echapper(e)}</th>`)
    .join('')}</tr></thead><tbody>${lignes
    .map(
      (l) =>
        `<tr>${l
          .map((c, i) => `<td class="${i === 0 ? '' : 'num'}">${echapper(c)}</td>`)
          .join('')}</tr>`,
    )
    .join('')}</tbody></table>`;
}

export function rendreRapportHtml(stats: AdminStats): string {
  const { joueurs, economie, boutique, marche, collection, jeu, courrier, risque, series } = stats;
  const date = new Date(stats.genere_le);
  const titre = `One Piece Quest — compte rendu du ${date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`;

  const inscriptions30 = series.reduce((a, p) => a + p.inscriptions, 0);
  const ventes30 = series.reduce((a, p) => a + p.ventes, 0);
  const cents30 = series.reduce((a, p) => a + p.cents, 0);

  const sections = [
    `<section><h2>1. En bref</h2>${tuiles([
      ['Comptes', number(joueurs.total), `${joueurs.crees_7j} créés sur 7 jours`],
      ['Actifs sur 7 jours', number(joueurs.actifs_7j), `${joueurs.actifs_24h} sur 24 heures`],
      ['Ont déjà joué', number(joueurs.ont_joue), `${pct(joueurs.ont_joue, joueurs.total)} des comptes`],
      ['Revenu — 30 jours', euros(boutique.revenu_30j), `${boutique.achats_30j} achats`],
      ['Ventes au marché — 30 jours', number(marche.ventes_30j), `${number(marche.volume_30j)} Berries`],
      ['Équipages — chapitre en cours', number(jeu.equipes_courant)],
    ])}</section>`,

    `<section><h2>2. Les trente derniers jours</h2>
      <p>${number(inscriptions30)} inscriptions, ${number(ventes30)} ventes au marché, ${euros(cents30)} encaissés.</p>
      ${tableau(
        'Jour par jour',
        ['Jour', 'Inscriptions', 'Ventes marché', 'Berries échangées', 'Achats boutique', 'Encaissé'],
        series.map((p) => [
          jour(p.jour),
          number(p.inscriptions),
          number(p.ventes),
          number(p.volume),
          number(p.achats),
          euros(p.cents),
        ]),
        'Aucune donnée.',
      )}</section>`,

    `<section><h2>3. Joueurs</h2>${tuiles([
      ['Comptes', number(joueurs.total), `${joueurs.google} via Google`],
      ['Créés — 24 h', number(joueurs.crees_24h)],
      ['Créés — 7 j', number(joueurs.crees_7j)],
      ['Créés — 30 j', number(joueurs.crees_30j)],
      ['Actifs — 24 h', number(joueurs.actifs_24h)],
      ['Actifs — 7 j', number(joueurs.actifs_7j)],
      ['Adresse vérifiée', number(joueurs.verifies), `${pct(joueurs.verifies, joueurs.total)} des comptes`],
      ['Coffre d’arrivée ouvert', number(joueurs.coffre_arrivee)],
      ['Ont déjà joué', number(joueurs.ont_joue), `${pct(joueurs.ont_joue, joueurs.total)}`],
      ['Fidèles (≥ 2 chapitres)', number(joueurs.fideles)],
      ['Parrainages', number(joueurs.parrainages), `${joueurs.parrainages_recompenses} récompensés`],
      ['Restreints', number(joueurs.restreints)],
    ])}${tableau(
      'Divisions',
      ['Division', 'Joueurs'],
      joueurs.divisions.map((d) => [DIVISION_LABEL[d.division as Division] ?? d.division, number(d.n)]),
      'Aucune progression enregistrée.',
    )}</section>`,

    `<section><h2>4. Boutique — argent réel</h2>${tuiles([
      ['Revenu total', euros(boutique.revenu_total)],
      ['Revenu — 30 j', euros(boutique.revenu_30j)],
      ['Revenu — 7 j', euros(boutique.revenu_7j)],
      ['Achats', number(boutique.achats_total), `${boutique.acheteurs} acheteurs distincts`],
      ['Conversion — 30 j', pct(boutique.achats_30j, boutique.intentions_30j), `${boutique.achats_30j} payés sur ${boutique.intentions_30j} caisses ouvertes`],
      ['Échecs — 30 j', number(boutique.echecs_30j)],
      ['Panier moyen', boutique.achats_total > 0 ? euros(boutique.revenu_total / boutique.achats_total) : '—'],
      ['Dernier achat', boutique.dernier_achat ? new Date(boutique.dernier_achat).toLocaleDateString('fr-FR') : '—'],
    ])}${tableau(
      'Produits les plus achetés',
      ['Produit', 'Achats', 'Montant'],
      boutique.produits.map((p) => [productOf(p.product_id)?.label ?? p.product_id, number(p.achats), euros(p.cents)]),
      'Aucun achat encaissé.',
    )}</section>`,

    `<section><h2>5. Marché — Berries entre joueurs</h2>${tuiles([
      ['Annonces actives', number(marche.annonces_actives)],
      ['Ventes — 7 j', number(marche.ventes_7j), `${number(marche.volume_7j)} Berries`],
      ['Ventes — 30 j', number(marche.ventes_30j), `${number(marche.volume_30j)} Berries`],
      ['Ventes — total', number(marche.ventes_total), `${number(marche.volume_total)} Berries`],
      ['Prix moyen — 30 j', marche.prix_moyen_30j === null ? '—' : `${number(marche.prix_moyen_30j)} Berries`],
      ['Taxe prélevée', `${number(marche.taxe_total)} Berries`],
    ])}${tableau(
      'Personnages les plus vendus',
      ['Personnage', 'Ventes', 'Volume', 'Prix moyen'],
      marche.plus_vendus.map((v) => [`${nom(v.character_id)} (${rarete(v.character_id)})`, number(v.ventes), number(v.volume), number(v.prix_moyen)]),
      'Aucune vente conclue.',
    )}${tableau(
      'Personnages les plus chers',
      ['Personnage', 'Prix max', 'Prix moyen', 'Ventes'],
      marche.plus_chers.map((c) => [`${nom(c.character_id)} (${rarete(c.character_id)})`, number(c.prix_max), number(c.prix_moyen), number(c.ventes)]),
      'Aucune vente conclue.',
    )}${tableau(
      'Personnages les plus surveillés',
      ['Personnage', 'Joueurs'],
      marche.surveilles.map((w) => [`${nom(w.character_id)} (${rarete(w.character_id)})`, number(w.n)]),
      'Aucune liste de surveillance.',
    )}${tableau(
      'Vendeurs les plus actifs',
      ['Joueur', 'Ventes', 'Volume'],
      marche.vendeurs.map((s) => [s.handle, number(s.ventes), number(s.volume)]),
      'Aucune vente conclue.',
    )}</section>`,

    `<section><h2>6. Économie et collection</h2>${tuiles([
      ['Berries en circulation', number(economie.berries), `+ ${number(economie.berries_attente)} en attente`],
      ['Coffres en réserve', number(economie.coffres_reserve)],
      ['Coffres royaux', number(economie.coffres_royaux)],
      ['Fragments', number(economie.fragments), `${number(economie.fragments_depenses)} dépensés`],
      ['Coffres ouverts', number(economie.coffres_ouverts_total), `${economie.coffres_ouverts_7j} sur 7 j · ${economie.pitie_declenchee} garanties`],
      ['Fabrications', number(economie.fabrications_total), `${economie.fabrications_7j} sur 7 j`],
      ['Cartes', number(economie.cartes), `${number(economie.cartes_frappees)} frappées`],
    ])}${tableau(
      'Cartes par rareté',
      ['Rareté', 'Cartes', 'Part'],
      collection.par_rarete.map((r) => [RARITY_LABEL[r.rarity as Rarity] ?? r.rarity, number(r.n), pct(r.n, economie.cartes)]),
      'Aucune carte.',
    )}${tableau(
      'Cartes par provenance',
      ['Provenance', 'Cartes', 'Part'],
      collection.par_source.map((s) => [SOURCE_LABEL[s.source] ?? s.source, number(s.n), pct(s.n, economie.cartes)]),
      'Aucune carte.',
    )}${tableau(
      'Personnages les plus possédés',
      ['Personnage', 'Exemplaires'],
      collection.plus_possedes.map((p) => [`${nom(p.character_id)} (${rarete(p.character_id)})`, number(p.n)]),
      'Aucune carte.',
    )}${tableau(
      'Personnages les plus fabriqués',
      ['Personnage', 'Fabrications'],
      collection.plus_fabriques.map((f) => [`${nom(f.character_id)} (${rarete(f.character_id)})`, number(f.n)]),
      'Aucune fabrication.',
    )}${tableau(
      'Plus grandes collections',
      ['Joueur', 'Cartes'],
      collection.collectionneurs.map((k) => [k.handle, number(k.cartes)]),
      'Aucune carte.',
    )}</section>`,

    `<section><h2>7. Jeu</h2>${tuiles([
      ['Équipages — chapitre en cours', number(jeu.equipes_courant)],
      ['Réponses aux pronostics', number(jeu.reponses_total)],
      ['Ligues', number(jeu.ligues)],
      ['Commentaires', number(jeu.commentaires)],
    ])}${tableau(
      'Les plus alignés — chapitre en cours',
      ['Personnage', 'Équipages', 'Part'],
      jeu.plus_alignes_courant.map((a) => [`${nom(a.character_id)} (${rarete(a.character_id)})`, number(a.n), pct(a.n, jeu.equipes_courant)]),
      'Aucun équipage verrouillé.',
    )}${tableau(
      'Les plus alignés — depuis le début',
      ['Personnage', 'Équipages'],
      jeu.plus_alignes.map((a) => [`${nom(a.character_id)} (${rarete(a.character_id)})`, number(a.n)]),
      'Aucun équipage verrouillé.',
    )}${tableau(
      'Chapitres',
      ['Chapitre', 'État', 'Équipages', 'Moyenne', 'Meilleur', 'Pronostics'],
      jeu.chapitres.map((c) => [
        `#${c.chapter_number}`,
        c.status,
        number(c.equipes),
        c.moyenne === null ? '—' : number(c.moyenne),
        c.meilleur === null ? '—' : number(c.meilleur),
        c.questions === 0 ? '—' : `${number(c.reponses)} rép. / ${c.questions} q.`,
      ]),
      'Aucun chapitre.',
    )}</section>`,

    `<section><h2>8. Système</h2>${tuiles([
      ['E-mails envoyés', number(courrier.envoyes), `${courrier.envoyes_7j} sur 7 j`],
      ['E-mails en attente', number(courrier.en_attente)],
      ['E-mails abandonnés', number(courrier.morts)],
      ['Notifications — 7 j', number(courrier.notifications_7j), `${courrier.notifications_non_lues} non lues`],
      ['Risque — à examiner', number(risque.a_examiner)],
      ['Risque — restreints', number(risque.restreints)],
      ['Évaluations — 7 j', number(risque.evaluations_7j)],
      ['Faux positifs', number(risque.faux_positifs)],
    ])}</section>`,
  ];

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(titre)}</title>
<style>
  body { margin: 0; padding: 2rem; font: 14px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #16304f; background: #fff; }
  main { max-width: 52rem; margin: 0 auto; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
  .sous { color: #667; margin: 0 0 2rem; }
  h2 { font-size: 1.1rem; margin: 2rem 0 .75rem; padding-bottom: .3rem; border-bottom: 2px solid #f4c84a; }
  h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .08em; color: #667; margin: 1.25rem 0 .4rem; }
  .tuiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); gap: .5rem; }
  .tuile { border: 1px solid #dde3ea; border-radius: .5rem; padding: .6rem .75rem; }
  .tuile .l { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: #667; }
  .tuile .v { font: 600 1.25rem/1.2 ui-monospace, monospace; margin-top: .2rem; }
  .tuile .h { font-size: .72rem; color: #778; margin-top: .15rem; }
  table { width: 100%; border-collapse: collapse; font-size: .85rem; }
  th, td { padding: .3rem .5rem; border-bottom: 1px solid #eef1f5; text-align: left; }
  th { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: #667; }
  td.num, th.num { text-align: right; font-family: ui-monospace, monospace; }
  td:not(:first-child) { text-align: right; font-family: ui-monospace, monospace; }
  .vide { color: #889; font-style: italic; margin: 0; }
  footer { margin-top: 3rem; color: #889; font-size: .75rem; }
  @media print { body { padding: 0; } section { break-inside: avoid; } }
</style>
</head>
<body>
<main>
  <h1>${echapper(titre)}</h1>
  <p class="sous">Généré le ${echapper(date.toLocaleString('fr-FR'))} depuis le poste de commandement. Chiffres calculés par la base à cet instant.</p>
  ${sections.join('\n')}
  <footer>One Piece Quest — document interne. Les pseudos cités sont ceux du classement public.</footer>
</main>
</body>
</html>`;
}

/** Les séries journalières, pour un tableur. Séparateur point-virgule : Excel en français. */
export function rendreSeriesCsv(stats: AdminStats): string {
  const lignes = [
    ['jour', 'inscriptions', 'ventes_marche', 'berries_echangees', 'achats_boutique', 'encaisse_euros'],
    ...stats.series.map((p) => [
      p.jour,
      String(p.inscriptions),
      String(p.ventes),
      String(p.volume),
      String(p.achats),
      (p.cents / 100).toFixed(2).replace('.', ','),
    ]),
  ];
  // BOM : sans lui, Excel ouvre le fichier en Latin-1 et casse les accents.
  return '\ufeff' + lignes.map((l) => l.join(';')).join('\r\n') + '\r\n';
}
