# E-mails

## Fournisseur retenu : Resend

Comparé à Postmark, Amazon SES et Brevo :

| Critère | Pourquoi Resend |
|---|---|
| API | Un `POST` JSON. **Aucun SDK**, donc aucune dépendance ajoutée. |
| Délivrabilité | DKIM/SPF sur domaine vérifié, comme les autres. |
| Coût | Palier gratuit suffisant à ce stade ; SES est moins cher à grande échelle mais demande une sortie de bac à sable et une configuration IAM. |
| Développement | Domaine de test immédiat, sans validation préalable — Postmark impose une revue avant tout envoi. |
| Réversibilité | Tout passe par `EmailProvider` : changer de prestataire, c'est un fichier et une variable. |

SES reste le bon choix le jour où le volume le justifie. L'abstraction existe
pour que ce jour-là ne soit pas une réécriture.

## Architecture

```
Application
    ↓  queueEmail()          idempotent via dedupe_key (contrainte UNIQUE)
email_outbox (Postgres)
    ↓  POST /api/jobs/email  déclenché par une tâche planifiée
drainOutbox()
    ↓  EmailProvider.send()
Resend
```

**Pourquoi Postgres et pas Redis / BullMQ** : le projet n'a ni l'un ni l'autre,
et n'a pas de worker permanent. Introduire une infrastructure de file pour
quelques messages hebdomadaires coûterait plus qu'elle ne rapporte. La base est
déjà là et déjà transactionnelle.

**Pourquoi une file plutôt qu'un envoi direct** : la publication d'un chapitre
notifie tous les joueurs. Attendre le fournisseur pour chacun ferait expirer la
requête de l'administrateur — et un fournisseur en panne ferait échouer la
publication elle-même.

## Réessais

[`src/domain/email/delivery.ts`](../src/domain/email/delivery.ts), fonction
pure et testée.

- 5 tentatives au maximum, puis **lettre morte** (`status = 'DEAD'`).
- Délai exponentiel : 30 s, 1 min, 2 min, 4 min… plafonné à 15 min.
- Décalage aléatoire de ±20 % : cent messages échoués ensemble ne repartent pas
  tous au même instant.
- Un échec **définitif** (adresse refusée) n'est jamais réessayé — insister
  abîme la réputation d'envoi sans aucune chance d'aboutir.
- Les messages abandonnés sont **conservés**, pas supprimés : un échec
  invisible n'est pas un échec réglé.

## Idempotence

Chaque message porte une `dedupe_key` sous contrainte `UNIQUE`. Un double clic,
un réessai réseau ou un worker redémarré ne produisent pas un second envoi —
c'est la base qui l'empêche, pas la prudence de l'appelant.

Les clés reprennent celle de la notification, préfixée `mail:` : un même
événement ne peut produire qu'un seul e-mail, même si la notification in-app a
déjà été écrite.

## Messages implémentés

| Message | Déclencheur | Catégorie |
|---|---|---|
| Réinitialisation de mot de passe | demande explicite | sécurité |
| Alerte de sécurité | mot de passe changé, MFA activée/désactivée, codes régénérés | sécurité, **non désactivable** |
| Verrouillage imminent | tâche hebdomadaire, 6 h avant l'échéance | hebdomadaire |
| Résultats publiés | publication d'un chapitre | hebdomadaire |
| Récompense disponible | publication d'un chapitre | récompenses |
| Confirmation d'adresse | inscription, ou renvoi depuis le profil | sécurité |
| Alerte de prix | seuil franchi sur la watchlist (§41) | récompenses |

Non implémenté : le **changement d'adresse**. Il n'existe pas d'écran pour
cela ; ajouter le message sans le parcours donnerait l'illusion d'une
fonctionnalité.

La confirmation d'adresse **ne bloque pas l'accès au jeu** : le cahier
construit un rendez-vous hebdomadaire, et refuser l'entrée à quelqu'un dont le
message est parti en indésirables le ferait partir. Elle conditionne les
opérations sensibles, là où une adresse non maîtrisée devient dangereuse.

## Gabarits

[`src/lib/email/templates.ts`](../src/lib/email/templates.ts)

- **Aucune image.** Le message doit rester complet si rien ne charge.
- Styles en ligne, mise en page en tableau : Outlook et Gmail ignorent une
  large part de la feuille de style.
- Version texte systématique — ce n'est pas un repli poli, c'est ce que lisent
  les clients en mode texte et une partie des filtres anti-spam.
- Le texte inséré est échappé : un pseudo peut contenir `<`.
- **Rien de confidentiel** : ni mot de passe, ni code MFA, ni score avant
  publication.

## Anti-spoiler

L'e-mail de résultats annonce **que** les résultats existent, jamais lesquels.
Aucun score, aucun personnage, aucune apparition. C'est le canal le plus
difficile à rattraper : un message parti ne se reprend pas.

## Séparation des environnements

`EMAIL_MODE` doit valoir `live` pour qu'un message parte réellement. Toute
autre valeur journalise sans envoyer. Ce geste délibéré est ce qui empêche un
environnement de recette — souvent branché sur une copie de production —
d'écrire à de vrais joueurs.

## Exploitation

```bash
curl -X POST https://$APP_URL/api/jobs/email -H "Authorization: Bearer $JOB_SECRET"
```

À déclencher toutes les minutes. La route répond `503` si `JOB_SECRET` est
absent : une route de tâche sans secret est une route ouverte.

Journaux, sans destinataire ni contenu : `EMAIL_SENT`, `EMAIL_FAILED`,
`EMAIL_DEAD`, `EMAIL_REJECTED`, `EMAIL_QUEUE_FAILED`.
