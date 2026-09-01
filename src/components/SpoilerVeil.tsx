/**
 * Voile anti-spoiler personnel.
 *
 * À ne pas confondre avec le verrou du §3, qui est **systémique** : celui-là
 * empêche tout le monde de voir les apparitions avant la publication, et rien
 * ne le désactive. Ce voile-ci intervient **après** la publication, et ne
 * concerne que le joueur qui l'a demandé : il n'a peut-être pas encore lu le
 * chapitre.
 *
 * ## Pourquoi `<details>` et pas un état React
 *
 * L'élément est natif : il fonctionne sans JavaScript, se déplie au clavier,
 * s'annonce correctement aux lecteurs d'écran, et le navigateur le rouvre à un
 * retour arrière. Un bouton maison aurait demandé de réimplémenter les quatre,
 * et en aurait probablement raté deux.
 *
 * Le contenu masqué reste **présent dans le document**. C'est acceptable ici et
 * ça ne le serait pas au §3 : après publication, ces résultats sont publics —
 * le voile épargne les yeux, il ne protège pas un secret. Avant publication,
 * rien n'est envoyé du tout, et c'est le serveur qui s'en charge.
 */
export function SpoilerVeil({
  active,
  label,
  children,
}: {
  /** Voile demandé dans les paramètres. Faux : le contenu s'affiche tel quel. */
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (!active) return <>{children}</>;

  return (
    <details className="hb-veil">
      <summary className="hb-veil__summary">
        <span aria-hidden="true">🙈</span>
        <span>{label}</span>
      </summary>
      <div className="hb-veil__body">{children}</div>
    </details>
  );
}
