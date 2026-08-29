# Activer les paiements réels

Le code est complet et vérifié : Checkout hébergé, signature de webhook,
idempotence, plafond journalier, contrôle d'âge, octroi transactionnel. Il ne
manque **que des clés** — et deux d'entre elles ne peuvent venir que de toi.

## Les quatre variables

Dans Vercel → Project Settings → Environment Variables → **Production** :

```
PAYMENTS_ENABLED=true
PAYMENT_MODE=live
PAYMENT_SECRET_KEY=sk_live_...
PAYMENT_WEBHOOK_SECRET=whsec_...
```

Puis redéployer. La boutique s'ouvre au redéploiement suivant, sans autre
changement de code.

## Où trouver ces valeurs

1. **`PAYMENT_SECRET_KEY`** — Stripe → Developers → API keys → *Secret key*.
   Celle qui commence par `sk_live_`.
2. **`PAYMENT_WEBHOOK_SECRET`** — Stripe → Developers → Webhooks →
   *Add endpoint* :
   - URL : `https://one-piece-quest.vercel.app/api/payments/webhook`
   - événement : `checkout.session.completed`

   Stripe affiche alors un *Signing secret* commençant par `whsec_`.

## Trois refus volontaires

Le système **refuse de démarrer** dans ces cas, et c'est délibéré :

| Situation | Ce qui se passe |
| --- | --- |
| `PAYMENT_MODE=live` avec une clé `sk_test_` | boutique fermée, motif affiché |
| `PAYMENTS_ENABLED=true` sans secret de webhook | boutique fermée : un webhook non vérifiable créditerait n'importe qui |
| `PAYMENTS_ENABLED=true` et `PAYMENT_MODE≠live` en production | **l'application ne démarre pas** (`assertEnvironment`) |

Le troisième est le plus important : sans lui, un paiement fictif en mode test
créditerait de vrais comptes.

## Ce que le site ne voit jamais

Ni numéro de carte, ni CVV, ni IBAN. Le formulaire est hébergé par Stripe ;
l'application ne reçoit qu'un événement signé disant qu'un paiement a abouti.

Elle **ne fait pas confiance à cet événement** pour autant : le montant, la
devise et ce qui est accordé sont relus dans le catalogue serveur
(`src/domain/payments/catalog.ts`). Un webhook qui annoncerait « 1 centime pour
le pack à 19,99 € » est rejeté.

## Ce qui reste ta décision

Deux points que je ne peux pas trancher à ta place, et que je signale une
dernière fois sans y revenir :

- **Le rayon Personnages vend l'accès à des personnages nommés d'une œuvre
  protégée contre de l'argent réel.** C'est d'une autre nature que le jeu de
  prédiction lui-même. Les coffres et les Berries n'ont pas ce problème.
- **La protection des mineurs (§114)** repose aujourd'hui sur une date de
  naissance déclarée. C'est ce que fait le code — plafond journalier, refus des
  comptes mineurs et des comptes sans date — mais une date déclarée reste une
  déclaration.

Le reste est prêt.
