import { AdSlot } from './AdSlot';

/**
 * Bandeau publicitaire des pages de jeu.
 *
 * ## Pourquoi l'identifiant d'emplacement vient de l'environnement
 *
 * Le script AdSense identifie l'éditeur ; l'**emplacement**, lui, est créé
 * dans le tableau de bord AdSense et porte un identifiant qu'aucun code ne
 * peut deviner. Écrire un numéro au hasard ne produirait pas une annonce mais
 * un cadre vide et une erreur dans la console de chaque joueur.
 *
 * Tant que `NEXT_PUBLIC_ADSENSE_SLOT_BANNER` n'est pas renseigné, le bandeau
 * **ne s'affiche pas du tout**. C'est délibéré : mieux vaut aucune publicité
 * qu'un rectangle réservé qui ne se remplit jamais et qui décale la page pour
 * rien.
 *
 * Le préfixe `NEXT_PUBLIC_` est nécessaire — la valeur est lue par le
 * navigateur. Elle n'a rien de secret : elle apparaît de toute façon dans le
 * balisage servi à tout le monde.
 *
 * ## Où il n'apparaît pas
 *
 * Ni sur les écrans d'authentification, ni sur la boutique, ni dans le
 * poste de commandement. Voir `AdSlot` pour le raisonnement.
 */
export function AdBanner() {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER;
  if (!slot) return null;

  return <AdSlot slot={slot} />;
}
