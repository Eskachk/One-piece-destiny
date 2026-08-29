# Paiements — **NON ACTIVÉS**

> ⚠️ **Aucun paiement réel n'est activé, et ne doit pas l'être.**
>
> L'activation reste suspendue à l'audit juridique du **§122** du cahier des
> charges, qui commande aussi les obligations de protection des mineurs du
> **§114**. Ce document décrit une architecture prête, pas un système en
> service.

## Ce qui existe

L'architecture complète, testée, derrière un verrou explicite :

```
Joueur
  ↓  createCheckout()      le prix vient du catalogue serveur
Stripe Checkout            le formulaire de carte ne touche jamais l'application
  ↓  webhook signé
verifyStripeSignature()    HMAC-SHA256 + fenêtre temporelle
  ↓
payment_events (PK = event_id)   idempotence : un rejeu n'accorde rien
  ↓
verifyClaim()              statut, produit, montant, devise
  ↓
grant_purchase()           crédit et règlement dans une seule transaction SQL
  ↓
wallets / player_progress
```

## Le verrou d'activation

Trois conditions cumulatives, dans `paymentsState()` :

1. `PAYMENTS_ENABLED=true` ;
2. `PAYMENT_SECRET_KEY` **et** `PAYMENT_WEBHOOK_SECRET` présents — sans le
   second, le webhook ne pourrait pas être vérifié ;
3. en production, `PAYMENT_MODE=live` avec une clé qui n'est pas `sk_test_`.

Une quatrième garde vit dans `assertEnvironment` : en production,
`PAYMENTS_ENABLED=true` avec `PAYMENT_MODE` autre que `live` **empêche
l'application de démarrer**. C'est ce qui interdit qu'un paiement de test
crédite un vrai compte.

Tant que le verrou est fermé, `/api/payments/webhook` répond `503`. Refuser
explicitement vaut mieux que répondre `200` à un événement qu'on ignore : le
prestataire croirait la livraison réussie.

## Ce que le client ne décide jamais

| Décision | Source de vérité |
|---|---|
| Le prix | `CATALOG` côté serveur. Le navigateur n'envoie qu'un identifiant de produit. |
| Le succès du paiement | Le webhook signé, jamais un retour de navigateur. |
| Le joueur crédité | `payment_intents.player_id`, écrit par le serveur à la création. |
| Le contenu accordé | `product.grants`, jamais la requête. |

Aucune donnée bancaire ne transite : ni numéro de carte, ni CVV, ni IBAN.
Stripe héberge le formulaire, l'application ne voit que le résultat signé.

## Protection contre le rejeu

Deux couches, volontairement redondantes :

1. **fenêtre temporelle** de 5 minutes sur la signature — une signature valide
   mais ancienne est refusée, sinon un webhook légitime capté une fois pourrait
   être renvoyé indéfiniment ;
2. **clé primaire** `payment_events.event_id` — un événement déjà traité échoue
   à l'insertion.

Et une troisième au niveau du crédit : `grant_purchase()` ne crédite que si
l'intention était encore `CREATED`. Deux webhooks concurrents franchissant
ensemble le contrôle d'idempotence ne peuvent pas créditer deux fois.

## Cloisonnement de l'économie

```
Argent réel  →  Berries / coffres        autorisé (à l'activation)
Berries      →  collection               autorisé
Berries      →  argent réel              JAMAIS
Personnage   →  argent réel              JAMAIS
```

Le Market reste une économie **interne** : il n'échange que de la monnaie de
jeu. Aucun chemin ne permet d'en sortir de la valeur monétaire. C'est ce qui
distingue le Market d'un marché secondaire — et ce qui change tout,
juridiquement.

## Probabilités des coffres

`src/domain/collection/odds.ts` recalcule les probabilités à partir des **mêmes
constantes que le tirage** (`CHEST_SLOTS`, `RARITY_WEIGHTS`, référentiel réel).
Elles ne peuvent pas diverger sans que le tirage change aussi.

Un test (`odds.test.ts`) simule 20 000 ouvertures et compare la fréquence
observée à la valeur annoncée, tolérance 2 points. Afficher des probabilités
différentes de celles utilisées est exactement la pratique que l'obligation
d'affichage vise à empêcher — le test l'interdit mécaniquement.

Le tirage lui-même reste **entièrement côté serveur** : le client ne peut ni
demander un personnage, ni rejouer un tirage qui lui déplaît.

## Ce qui reste à faire avant toute activation

- [ ] **Audit juridique (§122)** — statut des coffres aléatoires selon les
      juridictions visées, qualification du Market, mentions obligatoires.
- [ ] **§114** — vérification d'âge réelle si la juridiction l'exige. La date
      de naissance actuelle est **déclarative** (voir `docs/security.md`).
- [ ] Conditions générales de vente, droit de rétractation, facturation.
- [ ] Parcours de remboursement (`refund` n'est pas implémenté).
- [ ] Plafonds de dépense effectifs et journalisés côté serveur.
