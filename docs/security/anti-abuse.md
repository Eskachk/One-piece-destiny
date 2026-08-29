# Anti-abus comportemental

> Ce document décrit **l'architecture**. Il ne publie ni les poids, ni les
> seuils, ni les fenêtres de détection — ils vivent dans
> `src/domain/antiabuse/config.ts`, côté serveur uniquement. Documenter les
> règles exactes reviendrait à distribuer le mode d'emploi du contournement.

## Ce que le système cherche

Pas le multi-compte. Un joueur peut légitimement en avoir deux, et une famille
partage une connexion. Ce qu'on cherche, c'est le motif :

> plusieurs comptes créés pour produire de la valeur et la concentrer sur un
> seul.

## Ce qui existait déjà

Le produit n'est pas parti de zéro, et rien n'a été réécrit :

| Existant | Rôle |
| --- | --- |
| `domain/market/anti-manipulation.ts` | cooldowns, revente, annulations, wash trading entre deux comptes |
| `user_accounts.signup_ip` (0012) | rapprochement de comptes |
| `audit_log` (0001, 0012) | traçabilité des actions sensibles |
| `inventory.serial_code` (0018) | identité unique de chaque exemplaire |
| `idempotency_keys`, `payment_events` | anti-rejeu |
| `domain/auth/rate-limit.ts` | force brute sur la connexion |

Ce module **complète** ces briques : elles décidaient transaction par
transaction, il fallait pouvoir raisonner sur un **ensemble de comptes**.

## Architecture

```
     action du joueur
            |
            v
   enregistrement d'un fait          (account_events, card_ownership)
            |
            v
   evaluation, APRES la transaction  (lib/antiabuse/signals.ts)
            |
            v
   assessRisk() — fonction pure      (domain/antiabuse/engine.ts)
            |
            v
   score + signaux + action          (risk_assessments)
            |
            v
   NONE / MONITOR / REVIEW / RESTRICT_ECONOMY
```

La séparation « collecte » / « décision » est structurante : `assessRisk` est
pure, donc une évaluation contestée se **rejoue à l'identique** des mois plus
tard, sur les mêmes faits.

## Les protections qui font le travail

Par ordre d'efficacité réelle — et les trois premières ne détectent rien, ne se
trompent sur personne, et n'accusent personne :

1. **Verrou des cartes d'arrivée.** Les personnages du coffre d'inscription ne
   s'échangent pas avant plusieurs jours. La valeur existe, elle est immobile.
   C'est ce qui rend le fermage non rentable, sans qu'un joueur légitime soit
   gêné : personne n'a besoin de revendre sa dotation dans l'heure.
2. **Délai d'accès au Market.** Un compte neuf ne vend pas.
3. **Qualification du parrainage.** Le parrain n'est payé que lorsque son
   filleul verrouille un premier équipage — une étape qu'un compte fabriqué ne
   franchit pas.
4. **Provenance des cartes.** Chaque exemplaire porte sa chaîne de
   propriétaires. Ce n'est pas une heuristique : « ces quinze cartes viennent
   des coffres d'arrivée de quinze comptes créés le même jour » est un fait.
5. **Moteur de risque.** Combinaison de signaux techniques, comportementaux et
   économiques.

## Signaux

Trois familles. Aucune ne suffit seule.

- **Techniques** — âge du compte, comptes partageant le contexte
  d'inscription, cadence d'ouverture de coffres.
- **Comportementaux** — absence de partie jouée, grappe de filleuls inactifs.
- **Économiques** — revente immédiate, bénéficiaire commun, échanges
  circulaires, trajet complet « coffre d'arrivée → Market → compte lié ».

**Règle absolue, vérifiée par un test :** aucun poids de signal n'atteint le
seuil de restriction. Partager une adresse IP ne peut donc pas, à soi seul,
restreindre un compte.

## Actions

| Niveau | Effet |
| --- | --- |
| NONE | rien |
| MONITOR | rien de visible — le compte est simplement suivi |
| REVIEW | apparaît dans le Fraud Center |
| RESTRICT_ECONOMY | Market limité, temporairement |

**Le système ne suspend jamais automatiquement.** La sanction maximale
automatique est une restriction économique bornée dans le temps. Fermer un
compte reste une décision humaine, prise depuis le Chapter HQ et tracée.

Aucune restriction ne touche au jeu : verrouiller un équipage, marquer des
points et monter en division restent possibles quoi qu'il arrive.

## Faux positifs

Le Fraud Center rend « faux positif » aussi accessible que « restreindre ». Un
outil qui rend la sanction plus facile que l'absolution produit des sanctions.

Les verdicts sont **conservés**, jamais effacés : c'est la seule mesure honnête
de la justesse du dispositif. Le tableau de bord affiche leur nombre.

Cas explicitement testés comme **légitimes** : foyer partageant une connexion,
joueur très actif, échange déséquilibré ponctuel entre amis, compte tout juste
créé qui n'a pas encore joué.

## Données collectées

| Donnée | Finalité | Conservation |
| --- | --- | --- |
| Adresse IP d'inscription | rapprochement de comptes | durée de vie du compte |
| IP d'un événement de parcours | vélocité | durée de vie du compte |
| Horodatages de parcours | distinguer un joueur d'un compte fabriqué | durée de vie du compte |
| Transactions Market | flux économiques | durée de vie du compte |
| Chaîne de propriété des cartes | provenance | permanente |

**Pas de fingerprinting d'appareil. Pas de géolocalisation. Aucune tentative
d'identifier la personne derrière un compte.** Le cadrage l'interdit
explicitement, et cela n'apporterait rien : ce qu'on cherche est un motif de
comportement, pas une identité.

Les tables anti-abus sont en RLS sans policy — refus par défaut. Un joueur ne
peut pas lire son propre score : il en déduirait les règles.

## Ce que le joueur voit

Un message générique, et rien d'autre :

> Certaines fonctions d'échange sont temporairement indisponibles sur ce
> compte.

Les verrous **annoncés à l'avance** (carte d'arrivée, délai Market) ont, eux,
un message explicite : la règle est publique, il n'y a rien à contourner.

## Limites connues

Elles sont réelles, et il vaut mieux les écrire :

- **Le rapprochement par IP se contourne** — VPN, partage de connexion mobile,
  réseau différent par compte. C'est pourquoi il ne pèse qu'un signal parmi
  d'autres, et pourquoi les protections passives comptent davantage.
- **Un fermier patient passe.** Créer des comptes, attendre le déverrouillage,
  faire jouer un chapitre à chacun, puis transférer : le dispositif ralentit
  cela de plusieurs jours par compte, il ne l'empêche pas. C'est l'objectif
  affiché — rendre l'abus coûteux, pas impossible.
- **Trade direct et enchères n'existent pas** (§120). Les sections
  correspondantes du cadrage n'ont donc rien à protéger : le seul canal de
  transfert est le Market. Y ajouter du code mort aurait donné l'illusion
  d'une couverture.
- **Pas de file d'attente ni de Redis.** Les évaluations sont faites en ligne,
  après la transaction. À l'échelle actuelle c'est suffisant ; au-delà, il
  faudra les sortir du cycle de requête.
- **Le graphe de comptes est plat.** Une liste de contreparties agrégées, pas
  un moteur de graphes. Suffisant pour repérer un bénéficiaire commun ; pas
  pour démêler une chaîne à trois niveaux.
- **La règle des deux comptes est annoncée, pas techniquement imposée.** Rien
  n'empêche d'en créer un troisième ; ce sont les protections économiques qui
  le rendent inutile.

## Fichiers

```
src/domain/antiabuse/config.ts       seuils, poids, durees (serveur uniquement)
src/domain/antiabuse/engine.ts       assessRisk() — pure
src/domain/antiabuse/engine.test.ts  scenarios d'abus ET de faux positifs
src/lib/antiabuse/events.ts          journal de parcours
src/lib/antiabuse/signals.ts         collecte + evaluation
src/lib/antiabuse/restrictions.ts    verrous economiques
src/lib/antiabuse/provenance.ts      chaine de propriete des cartes
src/lib/antiabuse/review.ts          lectures du Fraud Center
src/app/actions/antiabuse.ts         actions admin, toutes tracees
src/app/admin/fraude/page.tsx        Fraud Center
src/app/admin/stats/page.tsx         tableau de bord
supabase/migrations/0021_anti_abuse.sql
```
