import { AdSlot } from './AdSlot';

/**
 * Publicité : le script de la régie **et** l'emplacement, ensemble.
 *
 * ## Le script n'est plus ici
 *
 * Il est de retour dans la mise en page : c'est la méthode de validation du
 * site par Google, et le robot d'AdSense doit le trouver sur n'importe quelle
 * page — y compris l'écran de connexion, seul visible d'un visiteur non
 * authentifié.
 *
 * Les pages à écarter des annonces automatiques se règlent donc dans le
 * tableau de bord AdSense (exclusions de pages), pas ici. C'est le seul
 * mécanisme qui laisse la validation fonctionner tout en maîtrisant les
 * emplacements.
 *
 * ## L'emplacement manuel reste possible
 *
 * `NEXT_PUBLIC_ADSENSE_SLOT_BANNER` porte un identifiant créé dans le tableau
 * de bord AdSense — un numéro qu'aucun code ne peut deviner. Renseigné, un
 * bandeau maîtrisé s'affiche en plus, à un endroit choisi. Vide, seules les
 * annonces automatiques s'appliquent : mieux vaut aucun bandeau qu'un cadre
 * réservé qui ne se remplit jamais et décale la page pour rien.
 */
export function AdBanner() {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER;

  if (!slot) return null;
  return <AdSlot slot={slot} />;
}
