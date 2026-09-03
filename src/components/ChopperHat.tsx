/**
 * Le chapeau, en marque et en attente.
 *
 * ## Deux usages, deux fichiers
 *
 * Le dessin fixe sert de **marque** : il remplace la roue de gouvernail en tête
 * de la scène d'entrée, et Next le sert aussi en favicon depuis
 * `app/icon.png`. Le dessin animé sert d'**attente** : c'est le seul endroit du
 * produit où l'on demande au joueur de patienter, donc le seul où une
 * animation gagne sa place au lieu de distraire.
 *
 * ## Le poids, et ce qu'on en a fait
 *
 * Le GIF d'origine pèse 629 Ko pour 44 images. Sur un écran d'attente, c'est
 * une contradiction : la chose qui fait patienter demanderait elle-même à être
 * attendue, et sur une connexion moyenne elle arriverait après la page qu'elle
 * annonce.
 *
 * Il est ramené à onze images et 47 Ko. Ce n'est pas une dégradation : cette
 * animation est un « boil » de doodle — ce frémissement des traits qu'on
 * obtient justement en répétant une poignée de dessins. Onze images à 120 ms
 * font huit images par seconde, la cadence exacte du procédé.
 *
 * ## Animations réduites (§60)
 *
 * Un GIF ne se met pas en pause en CSS : `prefers-reduced-motion` n'a aucune
 * prise dessus une fois qu'il est dans la page. Le seul moyen honnête de
 * respecter le réglage est de **ne pas le télécharger**, ce que `<picture>`
 * permet — le navigateur choisit la source avant de demander quoi que ce soit.
 * D'où le repli en image fixe plutôt qu'une classe CSS qui ne ferait rien.
 */

/** Dimensions natives des deux fichiers d'attente, pour réserver la place. */
const ATTENTE = { width: 200, height: 116 } as const;

/**
 * La marque du site.
 *
 * @param className classes de mise en page — la taille se règle ici, pas dans
 *                  l'attribut `width`, qui ne sert qu'à réserver la place
 *                  avant le téléchargement.
 */
export function HatMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/chapeau-chopper.png"
      alt=""
      aria-hidden="true"
      width={400}
      height={259}
      className={className}
      // La marque est en haut de la première page vue : la charger paresseusement
      // la ferait apparaître après le titre, ce qui se remarque.
      loading="eager"
      decoding="async"
    />
  );
}

/**
 * Le chapeau qui frémit, pendant que la page arrive.
 *
 * Aucun texte : l'écran d'attente porte déjà son annonce pour les lecteurs
 * d'écran (`aria-busy` et un intitulé masqué). En ajouter un second ferait
 * lire deux fois la même chose.
 */
export function HatLoader({ className }: { className?: string }) {
  return (
    <picture>
      <source srcSet="/chapeau-chopper-fixe.png" media="(prefers-reduced-motion: reduce)" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/chapeau-chopper.gif"
        alt=""
        aria-hidden="true"
        width={ATTENTE.width}
        height={ATTENTE.height}
        className={className}
        loading="eager"
        decoding="async"
      />
    </picture>
  );
}
