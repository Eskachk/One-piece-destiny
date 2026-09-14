# Paiements

## État actuel

**Activés et vérifiés en local, en mode test.** Les clés sont dans
`.env.local`, qui n'est pas versionné.

Vérifié réellement, pas supposé :

| Contrôle | Résultat |
| --- | --- |
| Création d'une session Checkout avec la clé fournie | HTTP 200, `cs_test_…` |
| Montant transmis | 1499 EUR — celui du catalogue serveur |
| Métadonnées (joueur, intention, produit) | présentes dans la session |
| `livemode` | `false` — clé de test confirmée |
| Signature de webhook | couverte par `domain/payments/signature.test.ts` |

## Ce qui manque pour la production

**Une clé `sk_live_`.** La clé fournie commence par `sk_test_`, et le site
refuse délibérément de la servir en production. Deux raisons, et aucune n'est
un excès de prudence :

1. **`assertEnvironment` empêche le démarrage** si `PAYMENTS_ENABLED=true` et
   `PAYMENT_MODE≠live` en production. Mettre le site en ligne dans cet état ne
   le casserait pas à moitié : il ne démarrerait pas du tout.
2. Même sans ce garde-fou, une clé de test accepte la carte
   `4242 4242 4242 4242`. **N'importe qui obtiendrait des coffres et des
   Berries gratuitement**, sans qu'un centime ne circule. Ce n'est pas un
   risque théorique : c'est le premier numéro que tape quiconque reconnaît une
   page Stripe en mode test.

### Pour passer en production

Dans Stripe : activer le compte (Settings → Activate payments — Stripe demande
l'identité, l'adresse et un IBAN), puis récupérer la clé `sk_live_`.

Puis, dans Vercel → Settings → Environment Variables → **Production** :

```
PAYMENTS_ENABLED=true
PAYMENT_MODE=live
PAYMENT_SECRET_KEY=sk_live_...
PAYMENT_WEBHOOK_SECRET=whsec_...
```

Le `whsec_` de production est **différent** de celui de test : il faut créer
un second endpoint dans Stripe → Developers → Webhooks, en mode *live* :

- URL : `https://one-piece-quest.vercel.app/api/payments/webhook`
- événement : `checkout.session.completed`

Redéployer. La boutique s'ouvre au déploiement suivant, sans changement de
code.

## Tester en local

Le serveur de développement lit déjà les clés. Carte de test :

```
4242 4242 4242 4242   —   date future quelconque   —   CVC quelconque
```

Le webhook, lui, n'arrive pas en local : Stripe ne sait pas joindre
`localhost`. Pour le recevoir :

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

La commande affiche un `whsec_` **temporaire**, propre à cette session, à
placer dans `.env.local` le temps du test.

## Le règlement, et ses deux entrées

Vérifié de bout en bout le 15 septembre 2026, contre le serveur de
développement (clé de test) et la base de production, avec une sonde
supprimée ensuite :

| Scénario | Résultat |
| --- | --- |
| Webhook sans signature, signature périmée, corps altéré | 400, rien d'écrit |
| Paiement valide (bourse 4,99 €) | 200 `accepted` — +7 500 Berries, intention `PAID`, événement `VERIFIED` |
| Rejeu du même événement | 200 `duplicate`, aucun second crédit |
| Événement vu mais crédit échoué, puis rejeu | 200 `accepted` — le rejeu **reprend** et crédite |
| Mauvais montant, statut non payé, produit inconnu | 200 `accepted: false`, événement `REJECTED: …`, audit `REFUSED` |
| Retour `?paiement=ok` sur une session réelle non payée | bandeau « confirmation en cours », intention inchangée |
| Retour `?paiement=annule` | bandeau « Paiement annulé. Rien n'a été débité. » |
| Intention vieille de deux jours | close en `CANCELLED` au passage |

Le crédit ne dépend plus **que** du webhook. `lib/payments/reglement.ts`
porte le règlement, et il a deux entrées :

- le webhook (`/api/payments/webhook`), quand il arrive ;
- le **rapprochement** à chaque visite de la boutique
  (`lib/payments/rapprochement.ts`) : les sessions ouvertes par le joueur ces
  vingt-quatre heures sont relues chez le prestataire, et une session payée
  est créditée sur-le-champ, par le même chemin.

Les deux ne peuvent pas créditer deux fois : `grant_purchase_v2` ne règle
qu'une intention encore `CREATED`, dans une seule transaction.

### Ce qu'il faut vérifier dans le tableau de bord Stripe, en mode live

Aucun événement n'a encore été reçu en production (aucun achat réel n'a été
mené au bout). Le rapprochement couvre le cas où le webhook serait mal
configuré, mais il vaut mieux qu'il arrive :

- Developers → Webhooks : un endpoint **live** sur
  `https://one-piece-quest.vercel.app/api/payments/webhook`, abonné à
  `checkout.session.completed` ;
- son secret de signature `whsec_…` est celui de `PAYMENT_WEBHOOK_SECRET`
  dans Vercel → Production ;
- après le premier achat réel : Developers → Webhooks → l'endpoint → les
  livraisons doivent montrer un `200` ; et le Poste de commandement →
  Statistiques → Boutique doit compter un achat payé.

## Ce que le site ne voit jamais

Ni numéro de carte, ni CVV, ni IBAN. Le formulaire est hébergé par Stripe ;
l'application ne reçoit qu'un événement signé.

Et elle ne lui fait pas confiance pour autant : le montant, la devise et ce qui
est accordé sont relus dans `src/domain/payments/catalog.ts`. Un webhook qui
annoncerait « 1 centime pour le pack à 19,99 € » est rejeté.

## Protection des mineurs (§114)

La date de naissance est déclarative — le site ne vérifie l'identité de
personne, et le dire autrement serait mentir sur le niveau réel de protection.

Elle se saisit **une seule fois**, sur le profil. C'est le point qui manquait :
tant qu'elle était modifiable, un compte bloqué parce que mineur n'avait qu'à
se redéclarer majeur, et la protection ne protégeait plus rien.

Sans date, aucun achat n'est possible : le plafond journalier vaut zéro.
