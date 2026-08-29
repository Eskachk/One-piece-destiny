# Sécurité et protection des mineurs

## Le serveur décide, toujours

Le client ne décide jamais : du prix, du score, du résultat d'un coffre, du
paiement, de la récompense, de la propriété d'un personnage, du verrouillage
d'un équipage, des permissions, ni de l'âge.

Vérifié en conditions réelles : formulaire de sélection chargé avant
l'échéance, envoyé après → refusé, **zéro ligne écrite**.

## Secrets

| Variable | Rôle | Journalisée |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | accès total à la base | jamais |
| `MFA_ENCRYPTION_KEY` | chiffre les secrets TOTP | jamais — voir [mfa.md](mfa.md) |
| `EMAIL_API_KEY` | envoi d'e-mails | jamais |
| `PAYMENT_SECRET_KEY` | prestataire de paiement | jamais |
| `PAYMENT_WEBHOOK_SECRET` | vérification de signature | jamais |
| `JOB_SECRET` | routes de tâches planifiées | jamais |

Le journal d'audit ([`src/lib/audit.ts`](../src/lib/audit.ts)) retire toute clé
dont le nom contient `password`, `token`, `secret`, `hash`, `key`, `code` ou
`card` avant écriture. La rédaction porte sur le **nom** du champ, pas sur son
contenu : un secret inattendu placé dans un champ bien nommé est quand même
retiré.

`assertEnvironment()` contrôle la configuration au démarrage et **empêche
l'application de démarrer** en production sur un problème fatal. Aucun message
n'affiche de valeur.

## Protection des mineurs (§114)

> ⚠️ **Ceci n'établit aucune conformité juridique.** Le code fournit la
> mécanique permettant d'appliquer des restrictions. Quelles restrictions
> s'appliquent, dans quel pays, relève de l'audit du §122 — qui n'est pas fait.
> Les seuils sont des valeurs de travail, pas un avis juridique.

[`src/domain/compliance/age.ts`](../src/domain/compliance/age.ts)

| Tranche | Achat réel | Marketing | Market interne | Accord parental |
|---|---|---|---|---|
| Majeur (≥ 18) | oui | oui | oui | non |
| 16–17 | **non** | **non** | oui | non |
| < 16 | **non** | **non** | oui | **oui** |
| Inconnu | **non** | **non** | oui | non |

Deux principes :

1. **le serveur recalcule** l'âge à partir de la date stockée, à chaque fois.
   Un client ne peut pas annoncer « je suis majeur » ;
2. **en cas d'inconnu, on restreint.** Une date absente donne les restrictions
   les plus fortes, jamais les plus faibles.

Le Market reste ouvert à tous : il n'échange que de la monnaie de jeu. Le
fermer aux mineurs les priverait du jeu sans les protéger de quoi que ce soit.
Ce qui leur est fermé, c'est l'achat en euros.

### Limite assumée

La date de naissance est **déclarative**. Il n'y a aucune vérification
d'identité, et le cahier n'en prévoit pas. Un mineur qui saisit une fausse date
passe. C'est une limite réelle qu'il ne faut pas présenter autrement — si la
juridiction visée exige une vérification effective, elle reste à construire, et
elle bloque l'activation des paiements.

### Dark patterns

Ce qui a été évité, délibérément :

- pas de compte à rebours artificiel sur un achat ;
- pas de « dernière chance » ni de rareté fabriquée ;
- probabilités de coffre affichées, calculées depuis le tirage réel ;
- la règle de pitié est annoncée **avant** l'ouverture, pas découverte après ;
- les Berries n'achètent jamais un avantage de score, et c'est écrit sur chaque
  écran où on peut en dépenser ;
- le marketing est désactivé par défaut.

## Couverture de tests sécurité

| Domaine | Vérifié |
|---|---|
| Authentification | limitation de débit par compte et par IP, expiration de session, réauthentification |
| MFA | anti-rejeu du pas de temps, chiffrement/déchiffrement, code de secours à usage unique |
| Webhook | signature forgée, corps modifié, rejeu hors fenêtre, secret vide, rotation |
| Paiement | montant manipulé, devise, produit inconnu, statut, `__proto__` |
| E-mail | injection d'en-tête (`\r`, `\n`, `\0`), adresses invalides |
| Notifications | alerte de sécurité non désactivable, champs inconnus ignorés |
| Coffres | probabilités annoncées vs tirage réel sur 20 000 ouvertures |
| Market | revente en cooldown, achat de son propre lot, solde insuffisant |

## Défauts trouvés et corrigés

- **`productOf('__proto__')` renvoyait `Object.prototype`** au lieu de `null` :
  un identifiant venu d'un webhook atteignait la chaîne de prototypes. Corrigé
  par `Object.hasOwn`. Trouvé par un test écrit pour ça.
- **Actions serveur silencieuses** : une action qui *levait* laissait le message
  précédent affiché — après un import réussi, une publication en échec
  continuait d'annoncer un succès. Corrigé dans 13 composants
  ([`attempt.ts`](../src/components/attempt.ts)).
- **`crewLockSoon`, `crewLocked`, `resultsComputing`** existaient sans aucun
  émetteur.

## Reste à faire

- [ ] Rotation du `service_role` avant mise en production, sans qu'aucun agent
      ne lise `.env.local`.
- [ ] Remplacer `unsafe-inline` sur les styles par un nonce (§84.2).
- [ ] Vérification d'adresse e-mail à l'inscription.
- [ ] Audit juridique §122 — bloque les paiements réels.
