'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { HarborScene } from '@/components/HarborScene';
import { MainNav } from '@/components/MainNav';

/**
 * Écran d'erreur (cahier §55, §60, §111).
 *
 * **Ce qui se passait sans ce fichier.** Toutes les pages du jeu sont en
 * `force-dynamic` et lisent la base ; chaque méthode du dépôt lève sur erreur.
 * Une coupure de Supabase, un jeton expiré, un chapitre corrompu — et Next
 * rendait sa page par défaut : fond blanc, « Application error: a client-side
 * exception has occurred », en anglais, sans navigation et sans issue. Le
 * joueur n'avait ni le nom du jeu sous les yeux, ni un lien pour en sortir :
 * seul le bouton retour du navigateur permettait de continuer.
 *
 * Une panne arrive ; sortir du produit ne devrait pas en découler.
 *
 * ## Ce que l'écran ne dit pas
 *
 * Ni `error.message`, ni la pile. Le message d'une erreur serveur porte des
 * noms de table, des identifiants, parfois un fragment de requête : c'est de
 * la reconnaissance offerte à qui provoque la panne exprès. Next le sait et
 * remplace déjà le message par un texte neutre en production — on ne compte
 * pas dessus, on ne l'affiche pas.
 *
 * Le `digest` est affiché, lui, et c'est tout l'inverse : c'est un condensat
 * sans contenu, que le joueur peut recopier et qui permet de retrouver la
 * trace exacte dans le journal du serveur.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // La console du navigateur, pas l'écran : de quoi diagnostiquer si l'on
    // est devant l'appareil, sans rien exposer sur la page.
    console.error('Erreur de rendu :', error);
  }, [error]);

  return (
    <HarborScene variant="page" decor={false}>
      <h1 className="hb-title">Le pont a tangué</h1>

      <p className="hb-card mt-5 text-sm">
        Quelque chose s&apos;est mal passé pendant le chargement de cette page.
        Rien n&apos;est perdu : ton équipage, ta collection et tes Berries sont
        enregistrés.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {/* `reset` refait le rendu de la route sans recharger l'application :
            c'est le geste juste pour une panne passagère — un aller-retour de
            base qui a expiré — et il évite de repartir de l'écran d'accueil. */}
        <button type="button" onClick={reset} className="hb-btn">
          Réessayer
        </button>
        <Link href="/" className="hb-link self-center text-sm">
          Retour à l&apos;équipage
        </Link>
      </div>

      {error.digest && (
        <p className="hb-muted mt-6 text-xs">
          Code de l&apos;incident : <span className="font-mono">{error.digest}</span>
        </p>
      )}

      <MainNav />
    </HarborScene>
  );
}
