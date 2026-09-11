/**
 * Boutique en argent réel : la page, les rayons, les produits du catalogue.
 *
 * Les produits sont nommés par leur identifiant de `payments/catalog.ts` ;
 * le catalogue garde ses libellés français, qui restent la référence des
 * reçus et des sessions de paiement.
 */
export const BOUTIQUE = {
  fr: {
    'shop.meta.title': 'Boutique',
    'shop.title': 'Boutique',
    'shop.intro':
      'Des coffres et des Berries, en argent réel. Tout ce qui est vendu ici s’obtient aussi en jouant, et rien n’y donne le moindre point au classement.',
    'shop.lot': '{n} {unit} · {each} l’unité',
    'shop.unit.chests': 'coffres',
    'shop.unit.royalChests': 'coffres royaux',
    'shop.closed': 'La boutique n’est pas encore ouverte.',
    'shop.closed.meanwhile':
      'En attendant, les Berries gagnées chaque semaine ouvrent exactement les mêmes coffres.',
    'shop.promo.title': 'Offre de lancement sur les coffres.',
    'shop.promo.body.one':
      'La première semaine seulement — jusqu’au {date}, soit {n} jour restant. Les Berries et les personnages restent au prix habituel, et les probabilités des coffres ne changent pas.',
    'shop.promo.body.other':
      'La première semaine seulement — jusqu’au {date}, soit {n} jours restants. Les Berries et les personnages restent au prix habituel, et les probabilités des coffres ne changent pas.',
    'shop.section.CHEST': 'Coffres',
    'shop.section.CHEST.blurb':
      'Mêmes probabilités que les coffres gagnés en jeu. Le coffre royal ajoute une garantie et sa propre cérémonie.',
    'shop.section.COINS': 'Berries',
    'shop.section.COINS.blurb':
      'La monnaie du jeu. Elle sert à ouvrir des coffres et à acheter au Marché.',
    'shop.section.CHARACTER': 'Personnages',
    'shop.section.CHARACTER.blurb': 'Des personnages nommés, tous obtenables gratuitement en coffre.',
    'shop.buy': 'Acheter',
    'shop.wait': 'Un instant…',
    'shop.limits.title': 'Ce que l’argent n’achète pas',
    'shop.limits.body':
      'Aucun produit de cette page ne donne de points, ne modifie un score, ni n’avantage au classement. La rareté d’un personnage est une valeur de collection : un Commun peut être excellent une semaine donnée, un Légendaire peut ne rien rapporter.',
    'shop.limits.note':
      'Les probabilités des coffres achetés sont exactement celles des coffres gagnés en jeu — elles sont affichées ci-dessus, au rayon Coffres, et aussi sur la page Collection. Les achats sont réservés aux comptes majeurs et plafonnés par jour.',

    'product.chest_pack_small': 'Coffre de Gaimon',
    'product.chest_pack_small.desc': 'Composition et probabilités identiques aux coffres gagnés en jeu.',
    'product.chest_pack_large': 'Coffre de Nami',
    'product.chest_pack_large.desc': 'Composition et probabilités identiques aux coffres gagnés en jeu.',
    'product.royal_chest': 'Coffre du Yonko',
    'product.royal_chest.desc':
      'Légendaire ou mieux garanti dans chacun, aucune carte commune, et une ouverture en cérémonie dédiée.',
    'product.berries_pouch': 'Bourse de Berries',
    'product.berries_pouch.desc': '7 500 Berries, soit 5 coffres à la boutique du jeu.',
    'product.berries_hold': 'Sac de Berries',
    'product.berries_hold.desc': '36 000 Berries, soit 24 coffres à la boutique du jeu.',
    'product.character_shanks': 'Shanks',
    'product.character_shanks.desc': 'Ajoute Shanks à ta collection, sans passer par les coffres.',
    'product.character_mihawk': 'Dracule Mihawk',
    'product.character_mihawk.desc': 'Ajoute Mihawk à ta collection, sans passer par les coffres.',
    'product.character_luffy': 'Monkey D. Luffy',
    'product.character_luffy.desc': 'Ajoute Luffy à ta collection, sans passer par les coffres.',
  },
  en: {
    'shop.meta.title': 'Shop',
    'shop.title': 'Shop',
    'shop.intro':
      'Chests and Berries, for real money. Everything sold here can also be earned by playing, and none of it gives a single leaderboard point.',
    'shop.lot': '{n} {unit} · {each} each',
    'shop.unit.chests': 'chests',
    'shop.unit.royalChests': 'royal chests',
    'shop.closed': 'The shop is not open yet.',
    'shop.closed.meanwhile': 'Meanwhile, the Berries earned every week open exactly the same chests.',
    'shop.promo.title': 'Launch offer on chests.',
    'shop.promo.body.one':
      'First week only — until {date}, {n} day left. Berries and characters stay at their usual price, and chest odds do not change.',
    'shop.promo.body.other':
      'First week only — until {date}, {n} days left. Berries and characters stay at their usual price, and chest odds do not change.',
    'shop.section.CHEST': 'Chests',
    'shop.section.CHEST.blurb':
      'Same odds as chests earned in the game. The royal chest adds a guarantee and its own ceremony.',
    'shop.section.COINS': 'Berries',
    'shop.section.COINS.blurb': 'The game’s currency. It opens chests and buys on the Market.',
    'shop.section.CHARACTER': 'Characters',
    'shop.section.CHARACTER.blurb': 'Named characters, all obtainable for free from chests.',
    'shop.buy': 'Buy',
    'shop.wait': 'One moment…',
    'shop.limits.title': 'What money does not buy',
    'shop.limits.body':
      'No product on this page gives points, changes a score or helps on the leaderboard. A character’s rarity is a collection value: a Common can be excellent in a given week, a Legendary can earn nothing.',
    'shop.limits.note':
      'The odds of purchased chests are exactly those of chests earned in the game — they are shown above, in the Chests section, and on the Collection page too. Purchases are reserved for adult accounts and capped per day.',

    'product.chest_pack_small': 'Gaimon’s chest',
    'product.chest_pack_small.desc': 'Same contents and odds as chests earned in the game.',
    'product.chest_pack_large': 'Nami’s chest',
    'product.chest_pack_large.desc': 'Same contents and odds as chests earned in the game.',
    'product.royal_chest': 'Yonko’s chest',
    'product.royal_chest.desc':
      'Legendary or better guaranteed in each, no common card, and an opening with its own ceremony.',
    'product.berries_pouch': 'Berry pouch',
    'product.berries_pouch.desc': '7,500 Berries, that is 5 chests at the in-game shop.',
    'product.berries_hold': 'Berry sack',
    'product.berries_hold.desc': '36,000 Berries, that is 24 chests at the in-game shop.',
    'product.character_shanks': 'Shanks',
    'product.character_shanks.desc': 'Adds Shanks to your collection, without going through chests.',
    'product.character_mihawk': 'Dracule Mihawk',
    'product.character_mihawk.desc': 'Adds Mihawk to your collection, without going through chests.',
    'product.character_luffy': 'Monkey D. Luffy',
    'product.character_luffy.desc': 'Adds Luffy to your collection, without going through chests.',
  },
} as const;
