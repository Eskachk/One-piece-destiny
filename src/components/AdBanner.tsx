import Script from 'next/script';
import { AdSlot } from './AdSlot';

/**
 * Publicité : le script de la régie **et** l'emplacement, ensemble.
 *
 * ## Pourquoi le script n'est plus dans la mise en page
 *
 * Il y était, chargé pour tout le site. C'était acceptable tant que les
 * emplacements étaient posés à la main : une régie sans emplacement ne coûte
 * qu'une requête.
 *
 * Avec les **annonces automatiques**, ça ne l'est plus. Google place alors les
 * annonces lui-même sur toute page où le script est présent — bandeaux,
 * ancrages, et interstitiels plein écran. Un interstitiel entre la saisie d'un
 * mot de passe et le tableau de bord d'administration, ou par-dessus une page
 * de paiement, n'est pas une décision qu'on laisse à un tiers.
 *
 * Le script voyage donc avec l'intention d'afficher une publicité. Il n'est
 * chargé que sur les pages de jeu, où ce composant est posé :
 *
 *   accueil · classement · collection · Marché · profil
 *
 * Et **jamais** ailleurs :
 *
 *   — connexion, inscription, mot de passe oublié, vérification d'adresse :
 *     ce sont les premiers écrans du produit, et une régie tierce n'a rien à
 *     charger à côté d'un champ de mot de passe ;
 *   — la boutique : mêler des annonces tierces à des achats réels brouille ce
 *     qui est vendu par le site et ce qui ne l'est pas ;
 *   — les paramètres et le Poste de commandement : aucune audience, et une
 *     publicité par-dessus un réglage de compte serait absurde.
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

  return (
    <>
      {/*
        `afterInteractive` : le script part une fois la page utilisable. En
        `beforeInteractive`, il retarderait le premier affichage pour un contenu
        qui n'est pas le produit.

        L'`id` dédoublonne : Next ne charge le script qu'une fois, même si
        plusieurs composants le déclarent au cours d'une navigation.
      */}
      <Script
        id="adsense"
        async
        strategy="afterInteractive"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9364111418812673"
        crossOrigin="anonymous"
      />

      {slot && <AdSlot slot={slot} />}
    </>
  );
}
