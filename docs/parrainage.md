# Parrainage (cahier §71, §43)

## Ce que reçoit chacun

| Situation | Berries |
| --- | --- |
| Inscription ordinaire | **1 500** |
| Inscription via un lien d'invitation | **3 000** |
| Le parrain, par filleul | **800** |

Un coffre coûte 1 500 Berries. Le repère est donc lisible sans calcul :
une inscription = un coffre, une invitation = deux coffres.

## Pourquoi 800 pour le parrain

Le montant est encadré des deux côtés :

- trop bas, personne n'invite et la fonction ne sert à rien ;
- trop haut, fabriquer des comptes rapporte plus que jouer, et le classement
  se remplit de coquilles vides.

800 vaut un peu plus d'un demi-coffre. À comparer aux 200 Berries de la
participation hebdomadaire : un parrainage pèse quatre semaines de présence.

**Le garde-fou décisif n'est pas le montant, c'est le moment du versement.**
Rien n'est payé à l'inscription. Le parrain est crédité lorsque son filleul
**verrouille un premier équipage** — c'est-à-dire lorsqu'un joueur de plus
participe réellement au rendez-vous hebdomadaire. Un générateur de comptes ne
franchit pas cette étape ; un ami ramené, oui.

Plafond : 10 filleuls récompensés. Au-delà, le lien reste enregistré mais ne
rapporte plus.

## Le chemin, de bout en bout

1. Le joueur ouvre son profil. Son code est **créé au premier affichage**
   (`ensureReferralCode`) : il n'y a pas de bouton « générer », le lien est là.
2. Il partage `https://<domaine>/r/<CODE>`.
3. L'invité clique. La route `src/app/r/[code]/route.ts` dépose un cookie
   `opq_ref` — `httpOnly`, 30 jours — puis redirige vers `/register`.
4. À la création du compte, `grantSignupBonus` lit le cookie, le supprime,
   résout le parrain et crédite 3 000 au lieu de 1 500. Le lien est enregistré
   dans `referrals` avec `rewarded_at = null`.
5. Au premier `saveCrew` du filleul, `payReferrerOnFirstCrew` vérifie le
   plafond, réclame la ligne de façon atomique, crédite le parrain et le
   notifie.

## Deux points à ne pas défaire

**`SameSite=Lax` sur `opq_ref`.** Le lien arrive d'ailleurs — une conversation,
un réseau social. En `Strict`, le cookie ne serait pas envoyé lors de cette
toute première navigation et le parrainage se perdrait à chaque fois. C'est le
seul endroit du produit où une valeur doit survivre à une arrivée externe.

**Le `is('rewarded_at', null)` dans `confirmReferral`.** C'est le verrou contre
le double paiement : deux enregistrements d'équipage simultanés partent en
concurrence, un seul `update` trouve encore la ligne en attente. Sans cette
condition dans la requête, un joueur qui enregistre deux fois de suite paierait
son parrain deux fois.

## Ce qui a disparu

La saisie d'un code (« On t'a parrainé ? Saisis le code ») et l'action
`redeemReferralAction`. C'était le seul endroit du produit où l'on demandait de
retaper huit caractères sans voyelles, et celui où l'on perdait le plus de
monde. Le lien décide tout, à l'inscription, côté serveur.
