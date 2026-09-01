import type { Metadata, Viewport } from 'next';
import { Anton, Caveat } from 'next/font/google';
import Script from 'next/script';
import { AppShell } from '@/components/AppShell';
import './globals.css';

/** SEO : titres uniques, Open Graph, canonical (cahier §106). */
export const metadata: Metadata = {
  title: {
    default: 'Grand Line Weekly — One Piece Quest',
    template: '%s — Grand Line Weekly',
  },
  description:
    'Le chapitre est le spectacle. Ta prédiction est le jeu. Choisis 3 personnages avant dimanche 23:59:59 et affronte le classement hebdomadaire.',
  openGraph: {
    title: 'Grand Line Weekly — One Piece Quest',
    description: 'Predict the next chapter.',
    type: 'website',
  },
  other: {
    // Identifiant d'éditeur AdSense. Il est aussi porté par le script
    // ci-dessous ; la balise sert à la vérification du site par Google, qui
    // lit le document sans exécuter le script.
    'google-adsense-account': 'ca-pub-9364111418812673',
  },
};

export const viewport: Viewport = {
  themeColor: '#071c2c',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Polices de la scène du port.
 *
 * `next/font` les **auto-héberge** : aucune requête vers Google au chargement,
 * donc pas de dépendance réseau tierce ni de saut de mise en page. C'est aussi
 * cohérent avec le travail de performance — une police externe annulerait une
 * partie du gain obtenu en retirant le référentiel du bundle.
 */
const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-poster',
  display: 'swap',
});

const caveat = Caveat({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-brush',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${anton.variable} ${caveat.variable}`}>
      <body className="chart-grid">
        <AppShell>{children}</AppShell>

        {/*
          Publicité AdSense.

          `afterInteractive` : le script part une fois la page utilisable. En
          `beforeInteractive` il retarderait le premier affichage pour un
          contenu qui n'est pas le produit — et l'accueil est justement ce
          qu'on a passé du temps à alléger.

          Les emplacements eux-mêmes sont posés page par page (`AdSlot`), pas
          ici : une régie chargée sans emplacement ne coûte qu'une requête,
          mais un bandeau posé dans la coquille apparaîtrait aussi sur les
          écrans de connexion et de paiement, où il n'a rien à faire.
        */}
        <Script
          id="adsense"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9364111418812673"
          crossOrigin="anonymous"
        />

        {/*
          Mesure d'audience Vercel.

          Le script est appelé par son chemin plutôt que par le paquet
          `@vercel/analytics`. Deux raisons : il est servi par la plateforme
          elle-même sous le domaine du site — donc aucune requête tierce, et
          rien qu'un bloqueur de publicité ne coupe — et cela évite une
          dépendance de plus pour trois lignes de code.

          Hors Vercel, `/_vercel/insights/script.js` n'existe pas : la requête
          échoue en 404 et rien d'autre ne se produit. C'est sans conséquence,
          et c'est pour cela que le script n'est pas conditionné.
        */}
        <Script
          id="vercel-analytics"
          defer
          strategy="afterInteractive"
          src="/_vercel/insights/script.js"
        />
      </body>
    </html>
  );
}
