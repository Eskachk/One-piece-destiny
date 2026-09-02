import type { Metadata, Viewport } from 'next';
import { Anton, Caveat } from 'next/font/google';
import Script from 'next/script';
import { AppShell } from '@/components/AppShell';
import { readDisplaySettings } from '@/lib/settings/store';
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
    description: 'Devine qui apparaîtra dans le prochain chapitre.',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * Langue et confort de lecture sont lus **ici**, au rendu serveur.
   *
   * Les appliquer côté navigateur ferait apparaître la page dans un état puis
   * dans l'autre : une phrase en français remplacée par sa traduction, une
   * animation qui démarre avant d'être coupée. Le premier rendu est déjà le
   * bon.
   *
   * `lang` n'est pas décoratif : il décide de la césure, de la prononciation
   * par un lecteur d'écran et de la langue proposée par le navigateur pour la
   * traduction automatique.
   */
  const display = await readDisplaySettings();

  return (
    <html
      lang={display.locale}
      // Réglage du joueur, distinct de `prefers-reduced-motion` : le système
      // dit une préférence générale, ceci dit un choix pour ce site. Les deux
      // coupent les animations, aucun n'annule l'autre.
      data-motion={display.reducedMotion ? 'reduced' : undefined}
      className={`${anton.variable} ${caveat.variable}`}
    >
      <body className="chart-grid">
        <AppShell>{children}</AppShell>

        {/*
          Le script AdSense n'est **pas** ici.

          Il y était, chargé pour tout le site. Avec les annonces automatiques,
          Google place alors des publicités — bandeaux, ancrages, interstitiels
          plein écran — sur **chaque** page où le script est présent. Un
          interstitiel par-dessus un champ de mot de passe, une page de paiement
          ou le Poste de commandement n'est pas une décision qu'on laisse à un
          tiers.

          Il voyage donc avec `AdBanner`, posé sur les seules pages de jeu.
          Voir `components/AdBanner.tsx`.
        */}

        {/*
          Mesure d'audience Vercel.

          Le script est appelé par son chemin plutôt que par le paquet
          `@vercel/analytics`. Deux raisons : il est servi par la plateforme
          elle-même sous le domaine du site — donc aucune requête tierce, et
          rien qu'un bloqueur de publicité ne coupe — et cela évite une
          dépendance de plus pour trois lignes de code.

          **Posé uniquement sur Vercel.** Ailleurs, `/_vercel/insights/script.js`
          n'existe pas : Next répond sa page 404 en HTML, et le navigateur
          journalise deux erreurs — un 404 et un refus de type MIME — sur
          *chaque* page. Vérifié en local : la console du développement était
          rouge en permanence, ce qui est le meilleur moyen de ne plus regarder
          les vraies erreurs.
        */}
        {process.env.VERCEL === '1' && (
          <Script
            id="vercel-analytics"
            defer
            strategy="afterInteractive"
            src="/_vercel/insights/script.js"
          />
        )}
      </body>
    </html>
  );
}
