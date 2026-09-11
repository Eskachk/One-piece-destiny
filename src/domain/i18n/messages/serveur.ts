/**
 * Messages que le serveur renvoie aux actions — refus, confirmations, freins.
 *
 * Le serveur les écrit en français, comme ses journaux ; le navigateur les
 * reconnaît (`traduireMessage`) et les redit dans la langue du joueur. Le
 * français de chaque entrée doit donc être **exactement** celui du code qui
 * l'émet — un test le vérifie pour les formes fixes.
 */
export const SERVEUR = {
  fr: {
    'srv.failed':
      'L’opération a échoué et rien n’a été enregistré. Vérifie ta connexion, puis réessaie.',
    'srv.throttle': 'Trop de tentatives. Réessaie dans un instant.',
    'srv.throttle.seconds.one': 'Trop de tentatives. Réessaie dans {n} seconde.',
    'srv.throttle.seconds.other': 'Trop de tentatives. Réessaie dans {n} secondes.',
    'srv.throttle.minutes.one': 'Trop de tentatives. Réessaie dans {n} minute.',
    'srv.throttle.minutes.other': 'Trop de tentatives. Réessaie dans {n} minutes.',
    'srv.restricted':
      'Certaines fonctions d’échange sont temporairement indisponibles sur ce compte. Elles se rouvriront d’elles-mêmes ; tu peux continuer à jouer normalement.',
    'srv.noDb': 'Fonction indisponible sans base de données.',
    'srv.unknownCharacter': 'Personnage inconnu.',
    'srv.saveFailed': 'Enregistrement impossible.',

    // Équipage et pronostics.
    'srv.crew.noChapter': 'Aucun chapitre ouvert.',
    'srv.crew.locked': 'Les équipages sont verrouillés pour ce chapitre.',
    'srv.crew.twice': 'Un personnage ne peut pas être sélectionné deux fois.',
    'srv.pronostic.none': 'Aucun chapitre n’est ouvert aux prédictions.',
    'srv.pronostic.closed': 'Les pronostics sont fermés : le chapitre est verrouillé.',
    'srv.pronostic.notOpen': 'Ce pronostic n’est pas ouvert.',
    'srv.pronostic.invalid': 'Réponse invalide.',

    // Collection.
    'srv.chest.unknown': 'Coffre inconnu.',
    'srv.chest.starterOpened': 'Ton coffre d’inscription est déjà ouvert.',
    'srv.chest.opened': 'Ce coffre a déjà été ouvert.',
    'srv.chest.tooPoor': 'Berries insuffisantes.',
    'srv.chest.balanceChanged': 'Ton solde vient de changer. Réessaie.',
    'srv.craft.owned': 'Tu possèdes déjà ce personnage.',
    'srv.craft.shards': 'Fragments insuffisants.',
    'srv.craft.shardsChanged': 'Tes fragments viennent de changer. Réessaie.',

    // Marché.
    'srv.mk.noDb': 'Le Market nécessite une base de données configurée.',
    'srv.mk.invalidListing': 'Annonce invalide.',
    'srv.mk.notOwned': 'Tu ne possèdes pas ce personnage.',
    'srv.mk.alreadyListed': 'Ce personnage est déjà en vente.',
    'srv.mk.notFound': 'Annonce introuvable.',
    'srv.mk.closed': 'Annonce introuvable ou déjà close.',
    'srv.mk.sold': 'Annonce introuvable ou déjà vendue.',
    'srv.mk.buyFailed': 'Achat impossible : annonce déjà vendue ou Berries insuffisantes.',
    'srv.mk.price.integer': 'Le prix doit être un nombre entier de Berries.',
    'srv.mk.price.floor': 'Prix minimum pour cette rareté : {n} 🪙.',
    'srv.mk.price.ceiling': 'Prix maximum pour cette rareté : {n} 🪙.',
    'srv.mk.cooldown': 'Attends une minute entre deux mises en vente.',
    'srv.mk.cancellations': 'Trop d’annulations récentes. Réessaie plus tard.',
    'srv.mk.recentlyBought': 'Une carte achetée au Market ne peut être revendue qu’après 24 h.',
    'srv.mk.ownListing': 'Tu ne peux pas acheter ta propre annonce.',
    'srv.mk.linked': 'Cette transaction ne peut pas être effectuée.',
    'srv.mk.wash': 'Trop d’échanges récents entre vos deux comptes.',
    'srv.mk.starterLock.one':
      'Les personnages du coffre d’inscription ne s’échangent qu’après {days} jours. Encore {n} jour.',
    'srv.mk.starterLock.other':
      'Les personnages du coffre d’inscription ne s’échangent qu’après {days} jours. Encore {n} jours.',
    'srv.mk.newAccount': 'Le Market s’ouvre 24 h après l’inscription. Encore {n} h.',
    'srv.mk.watchInvalid': 'État de surveillance invalide.',
    'srv.mk.thresholdInvalid': 'Seuil invalide.',

    // Boutique.
    'srv.shop.unknown': 'Produit inconnu.',
    'srv.shop.cap': 'Plafond de dépense journalier atteint. Réessaie demain.',
    'srv.shop.checkoutFailed': 'Impossible d’ouvrir le paiement.',
    'srv.shop.checkoutLater': 'Le paiement n’a pas pu s’ouvrir. Réessaie dans un moment.',

    // Compte et réglages.
    'srv.pref.invalid': 'Préférences invalides.',
    'srv.settings.invalid': 'Réglage invalide.',
    'srv.handle.invalid': 'Pseudo invalide.',
    'srv.handle.taken': 'Ce pseudo est déjà pris.',
    'srv.handle.wait.one': 'Tu pourras changer de pseudo dans {n} jour.',
    'srv.handle.wait.other': 'Tu pourras changer de pseudo dans {n} jours.',
    'srv.handle.failed': 'Changement impossible.',
    'srv.account.missing': 'Compte introuvable.',
    'srv.birth.format': 'Indique une date au format JJ/MM/AAAA.',
    'srv.birth.implausible': 'Cette date de naissance n’est pas plausible.',
    'srv.birth.saved': 'Date de naissance enregistrée.',
    'srv.verify.sent': 'Si ton adresse n’est pas encore confirmée, un lien vient d’être envoyé.',

    // Ligues (en sommeil).
    'srv.league.soon': 'Les ligues privées arriveront dans une prochaine mise à jour.',
    'srv.league.notFound': 'Ligue introuvable.',
    'srv.league.code': 'Code invalide.',
    'srv.league.name': 'Nom invalide.',
  },
  en: {
    'srv.failed': 'The operation failed and nothing was saved. Check your connection, then try again.',
    'srv.throttle': 'Too many attempts. Try again in a moment.',
    'srv.throttle.seconds.one': 'Too many attempts. Try again in {n} second.',
    'srv.throttle.seconds.other': 'Too many attempts. Try again in {n} seconds.',
    'srv.throttle.minutes.one': 'Too many attempts. Try again in {n} minute.',
    'srv.throttle.minutes.other': 'Too many attempts. Try again in {n} minutes.',
    'srv.restricted':
      'Some trading features are temporarily unavailable on this account. They will reopen on their own; you can keep playing as usual.',
    'srv.noDb': 'Feature unavailable without a database.',
    'srv.unknownCharacter': 'Unknown character.',
    'srv.saveFailed': 'Could not save.',

    'srv.crew.noChapter': 'No chapter open.',
    'srv.crew.locked': 'Crews are locked for this chapter.',
    'srv.crew.twice': 'A character cannot be picked twice.',
    'srv.pronostic.none': 'No chapter is open for predictions.',
    'srv.pronostic.closed': 'Predictions are closed: the chapter is locked.',
    'srv.pronostic.notOpen': 'This prediction is not open.',
    'srv.pronostic.invalid': 'Invalid answer.',

    'srv.chest.unknown': 'Unknown chest.',
    'srv.chest.starterOpened': 'Your welcome chest is already open.',
    'srv.chest.opened': 'This chest has already been opened.',
    'srv.chest.tooPoor': 'Not enough Berries.',
    'srv.chest.balanceChanged': 'Your balance just changed. Try again.',
    'srv.craft.owned': 'You already own this character.',
    'srv.craft.shards': 'Not enough shards.',
    'srv.craft.shardsChanged': 'Your shards just changed. Try again.',

    'srv.mk.noDb': 'The Market needs a configured database.',
    'srv.mk.invalidListing': 'Invalid listing.',
    'srv.mk.notOwned': 'You do not own this character.',
    'srv.mk.alreadyListed': 'This character is already for sale.',
    'srv.mk.notFound': 'Listing not found.',
    'srv.mk.closed': 'Listing not found or already closed.',
    'srv.mk.sold': 'Listing not found or already sold.',
    'srv.mk.buyFailed': 'Purchase failed: listing already sold or not enough Berries.',
    'srv.mk.price.integer': 'The price must be a whole number of Berries.',
    'srv.mk.price.floor': 'Minimum price for this rarity: {n} 🪙.',
    'srv.mk.price.ceiling': 'Maximum price for this rarity: {n} 🪙.',
    'srv.mk.cooldown': 'Wait a minute between two listings.',
    'srv.mk.cancellations': 'Too many recent cancellations. Try again later.',
    'srv.mk.recentlyBought': 'A card bought on the Market can only be resold after 24 h.',
    'srv.mk.ownListing': 'You cannot buy your own listing.',
    'srv.mk.linked': 'This transaction cannot be completed.',
    'srv.mk.wash': 'Too many recent trades between your two accounts.',
    'srv.mk.starterLock.one': 'Welcome chest characters can only be traded after {days} days. {n} day to go.',
    'srv.mk.starterLock.other': 'Welcome chest characters can only be traded after {days} days. {n} days to go.',
    'srv.mk.newAccount': 'The Market opens 24 h after sign-up. {n} h to go.',
    'srv.mk.watchInvalid': 'Invalid watch state.',
    'srv.mk.thresholdInvalid': 'Invalid threshold.',

    'srv.shop.unknown': 'Unknown product.',
    'srv.shop.cap': 'Daily spending cap reached. Try again tomorrow.',
    'srv.shop.checkoutFailed': 'Could not open the payment.',
    'srv.shop.checkoutLater': 'The payment could not open. Try again in a moment.',

    'srv.pref.invalid': 'Invalid preferences.',
    'srv.settings.invalid': 'Invalid setting.',
    'srv.handle.invalid': 'Invalid name.',
    'srv.handle.taken': 'This name is already taken.',
    'srv.handle.wait.one': 'You can change your name again in {n} day.',
    'srv.handle.wait.other': 'You can change your name again in {n} days.',
    'srv.handle.failed': 'Change failed.',
    'srv.account.missing': 'Account not found.',
    'srv.birth.format': 'Enter a date in the DD/MM/YYYY format.',
    'srv.birth.implausible': 'This date of birth is not plausible.',
    'srv.birth.saved': 'Date of birth saved.',
    'srv.verify.sent': 'If your address is not confirmed yet, a link has just been sent.',

    'srv.league.soon': 'Private leagues will arrive in a future update.',
    'srv.league.notFound': 'League not found.',
    'srv.league.code': 'Invalid code.',
    'srv.league.name': 'Invalid name.',
  },
} as const;
