/**
 * Classement hebdomadaire : la page, l'analyse du chapitre, les distinctions
 * et le détail du score — ces dernières lignes sont stockées en français au
 * moment du calcul et retraduites à l'affichage (voir `detail-score.ts`).
 */
export const CLASSEMENT = {
  fr: {
    'lb.meta.title': 'Classement hebdomadaire',
    'lb.meta.description':
      'Le classement de la semaine : meilleures prédictions, plus beaux paris et percentile de chaque capitaine.',
    'lb.title': 'Classement hebdomadaire',
    'lb.noChapter': 'Aucun chapitre en cours.',
    'lb.locked':
      '🔒 Les résultats du chapitre {n} ne sont pas encore publiés. Rien n’est révélé avant la sortie officielle.',
    'lb.chapter': 'Chapitre {n}',
    'lb.bounty': 'Prime hebdomadaire',
    'lb.veil': 'Afficher les résultats du chapitre {n}',
    'lb.mine': 'Ta position',
    'lb.pts': '{n} pts',
    'lb.percentile.one': 'Top {p}% sur {n} capitaine',
    'lb.percentile.other': 'Top {p}% sur {n} capitaines',
    'lb.replay': 'Comment ton équipage a performé',
    'lb.analysis': 'Chapitre {n} — analyse',
    'lb.analysis.mostPicked': 'Le plus choisi',
    'lb.analysis.best': 'Meilleur rendement',
    'lb.analysis.surprise': 'Plus belle surprise',
    'lb.analysis.trap': 'Piège de la semaine',
    'lb.analysis.average': 'Score moyen',
    'lb.analysis.median': 'Score médian',
    'lb.analysis.pick': '{name} — {rate}',
    'lb.analysis.points': '{name} — {n} pts',
    'lb.analysis.surpriseValue': '{name} — {n} pts, choisi par {rate}',
    'lb.analysis.trapValue': '{name} — {n} pts malgré {rate} de sélection',
    'lb.awards': 'Distinctions',
    'award.BEST_PREDICTION': 'Meilleure prédiction',
    'award.BEST_UPSET': 'Plus beau pari',
    'award.HIGHEST_RISK': 'Risque maximal',
    'award.BEST_SYNERGY': 'Meilleure synergie',
    'lb.ranking': 'Classement',
    'lb.empty': 'Aucune équipe classée pour ce chapitre.',
    'lb.back': 'Retour à l’équipage',

    // Détail du score, ligne par ligne.
    'score.present': 'Présent dans le chapitre → +{n}',
    'score.absent': 'Absent du chapitre → pas de base.',
    'score.absentOld': 'Absent du chapitre → aucun point.',
    'score.relation': '{relation} avec {name} → +{n}',
    'score.affiliation': 'Affiliation {name} ({present} présents) → +{n}',
    'score.shared': '{attribute} partagé → +{n}',
    'score.riskHit':
      'Pari réussi — plus improbable que {rank} % du référentiel (présence {presence}, rareté {rarity}, attributs {attributes}) → +{n}',
    'score.riskNear':
      'Pari manqué mais bien vu — {rank} % d’improbabilité, payée à {paid} % pour ses liens avec le chapitre → +{n}',
    'score.riskMiss':
      'Pari manqué et sans lien avec le chapitre → +0 (l’improbabilité seule ne rapporte rien)',
    'score.consensus':
      'Choisi par {rate} % des joueurs → × {factor} (un choix que tout le monde fait ne départage personne)',
    'relation.CREW': 'Équipage',
    'relation.ALLIANCE': 'Alliance',
    'relation.FACTION': 'Faction',
    'relation.RIVALRY': 'Rivalité',
    'relation.MENTOR': 'Mentor',
    'relation.FAMILY': 'Famille',
  },
  en: {
    'lb.meta.title': 'Weekly leaderboard',
    'lb.meta.description':
      'This week’s leaderboard: best predictions, boldest bets and every captain’s percentile.',
    'lb.title': 'Weekly leaderboard',
    'lb.noChapter': 'No chapter in progress.',
    'lb.locked':
      '🔒 Chapter {n} results are not published yet. Nothing is revealed before the official release.',
    'lb.chapter': 'Chapter {n}',
    'lb.bounty': 'Weekly bounty',
    'lb.veil': 'Show chapter {n} results',
    'lb.mine': 'Your position',
    'lb.pts': '{n} pts',
    'lb.percentile.one': 'Top {p}% of {n} captain',
    'lb.percentile.other': 'Top {p}% of {n} captains',
    'lb.replay': 'How your crew performed',
    'lb.analysis': 'Chapter {n} — analysis',
    'lb.analysis.mostPicked': 'Most picked',
    'lb.analysis.best': 'Best return',
    'lb.analysis.surprise': 'Biggest surprise',
    'lb.analysis.trap': 'Trap of the week',
    'lb.analysis.average': 'Average score',
    'lb.analysis.median': 'Median score',
    'lb.analysis.pick': '{name} — {rate}',
    'lb.analysis.points': '{name} — {n} pts',
    'lb.analysis.surpriseValue': '{name} — {n} pts, picked by {rate}',
    'lb.analysis.trapValue': '{name} — {n} pts despite a {rate} pick rate',
    'lb.awards': 'Awards',
    'award.BEST_PREDICTION': 'Best prediction',
    'award.BEST_UPSET': 'Boldest bet',
    'award.HIGHEST_RISK': 'Highest risk',
    'award.BEST_SYNERGY': 'Best synergy',
    'lb.ranking': 'Ranking',
    'lb.empty': 'No crew ranked for this chapter.',
    'lb.back': 'Back to the crew',

    'score.present': 'In the chapter → +{n}',
    'score.absent': 'Not in the chapter → no base.',
    'score.absentOld': 'Not in the chapter → no points.',
    'score.relation': '{relation} with {name} → +{n}',
    'score.affiliation': 'Affiliation {name} ({present} present) → +{n}',
    'score.shared': '{attribute} shared → +{n}',
    'score.riskHit':
      'Bet won — less likely than {rank}% of the roster (presence {presence}, rarity {rarity}, attributes {attributes}) → +{n}',
    'score.riskNear':
      'Bet missed but well spotted — {rank}% unlikelihood, paid at {paid}% for its ties to the chapter → +{n}',
    'score.riskMiss':
      'Bet missed with no tie to the chapter → +0 (unlikelihood alone earns nothing)',
    'score.consensus':
      'Picked by {rate}% of players → × {factor} (a pick everyone makes separates no one)',
    'relation.CREW': 'Crew',
    'relation.ALLIANCE': 'Alliance',
    'relation.FACTION': 'Faction',
    'relation.RIVALRY': 'Rivalry',
    'relation.MENTOR': 'Mentor',
    'relation.FAMILY': 'Family',
  },
} as const;
