/**
 * Règles du jeu et sanctions (cahier §43, §89, §113, §114).
 *
 * Composant serveur : aucun état, aucune interaction. Les blocs sont des
 * `<details>` natifs, qui se replient sans une ligne de JavaScript et restent
 * navigables au clavier.
 *
 * Deux principes de rédaction, et ils ne sont pas cosmétiques :
 *
 *   — **chaque règle dit ce qui arrive si on l'enfreint.** Une interdiction
 *     sans conséquence annoncée n'est pas une règle, c'est un souhait ; et
 *     sanctionner un joueur sur une règle qu'il n'a pas pu lire est
 *     exactement ce que §113 interdit ;
 *   — **on ne menace de rien qui ne soit réellement appliqué.** Les mesures
 *     citées ici sont celles que le produit sait exécuter aujourd'hui :
 *     annulation d'un score, retrait de Berries, blocage du Market, fermeture
 *     du compte. Rien de plus.
 */

const RULES: { title: string; body: string; sanction: string }[] = [
  {
    title: 'Deux comptes au maximum',
    body:
      'Tu peux avoir un second compte — pour tester une autre stratégie, ou parce que vous êtes deux à jouer sur la même connexion. Au-delà, c’est une ferme : multiplier les coffres d’arrivée, se parrainer soi-même ou occuper plusieurs places au classement fausse la semaine de tout le monde. Partager une connexion n’est jamais reproché en soi ; c’est le fait de faire remonter la valeur de plusieurs comptes vers un seul qui l’est.',
    sanction:
      'Les comptes au-delà du deuxième sont fermés et leurs gains annulés. Le compte bénéficiaire perd ses récompenses de parrainage.',
  },
  {
    title: 'Le parrainage récompense un joueur, pas une inscription',
    body:
      'Le lien d’invitation sert à faire venir quelqu’un qui joue. C’est pour cela que le parrain n’est crédité qu’au moment où son filleul verrouille un premier équipage : fabriquer des comptes ne rapporte rien.',
    sanction:
      'Parrainages annulés et Berries retirées. En cas de volume, fermeture du compte.',
  },
  {
    title: 'Pas d’arnaque sur le Market',
    body:
      'Une carte s’échange contre des Berries, à l’intérieur du jeu, et rien d’autre. Toute vente contre un paiement extérieur, tout échange promis « après coup », toute usurpation d’identité pour obtenir une carte est une arnaque — y compris si l’autre joueur était d’accord.',
    sanction:
      'Annulation de l’échange quand elle est possible, blocage du Market, fermeture du compte en cas de récidive.',
  },
  {
    title: 'Un bug se signale, il ne s’exploite pas',
    body:
      'Si le jeu te donne des Berries, des coffres ou des cartes qu’il ne devait pas, ne recommence pas l’opération : signale-la. Répéter volontairement un défaut pour en tirer profit est traité comme de la triche, même si le jeu l’a autorisé.',
    sanction:
      'Retrait des gains obtenus. Signaler un défaut de bonne foi n’est jamais sanctionné.',
  },
  {
    title: 'Pas d’automatisation',
    body:
      'Scripts, robots, ou tout outil qui joue, ouvre des coffres ou achète à ta place. Le jeu tient en trois choix par semaine : il n’a rien à automatiser.',
    sanction: 'Fermeture du compte.',
  },
  {
    title: 'Pas de spoiler avant la sortie officielle',
    body:
      'Les résultats ne s’affichent qu’après la publication du chapitre, et c’est délibéré. Diffuser le contenu d’un chapitre en avance gâche le rendez-vous pour tout le monde.',
    sanction: 'Avertissement, puis fermeture du compte.',
  },
  {
    title: 'Ton compte n’est pas à prêter',
    body:
      'Ne partage ni ton mot de passe, ni tes codes de secours. Personne de l’équipe ne te les demandera jamais — un message qui le fait est une tentative de vol, quelle que soit sa mise en forme.',
    sanction:
      'Ce qui est fait depuis ton compte t’est imputable. Active la double authentification si tu tiens à ta collection.',
  },
];

export function HouseRules() {
  return (
    <section className="hb-card mt-6">
      <h2 className="font-display text-xl hb-ink">Règles du bord</h2>

      <p className="hb-muted mt-2 text-sm">
        Le jeu se joue à la loyale. Ces règles existent pour que ta place au
        classement veuille dire quelque chose.
      </p>

      {/* Deux protections s'appliquent à tout le monde, en permanence. Les
          annoncer ici évite qu'un joueur les découvre en butant dessus — et
          c'est ce que demande le §113. */}
      <ul className="hb-muted mt-3 space-y-1 text-xs">
        <li>
          • Les personnages du coffre d’arrivée ne s’échangent qu’après{' '}
          <strong>7 jours</strong>.
        </li>
        <li>
          • Le Market s’ouvre <strong>24 h</strong> après l’inscription.
        </li>
      </ul>

      <ul className="mt-4 space-y-2">
        {RULES.map((rule) => (
          <li key={rule.title}>
            <details className="hb-rule">
              <summary className="hb-rule__title">{rule.title}</summary>
              <p className="mt-2 text-sm">{rule.body}</p>
              <p className="hb-rule__sanction mt-2">{rule.sanction}</p>
            </details>
          </li>
        ))}
      </ul>

      <p className="hb-muted mt-4 border-t hb-border pt-3 text-xs">
        Un doute sur ce qui est permis ? Considère que ce n’est pas permis, et
        demande. Signaler un défaut ou un comportement douteux n’expose jamais
        celui qui le signale.
      </p>
    </section>
  );
}
