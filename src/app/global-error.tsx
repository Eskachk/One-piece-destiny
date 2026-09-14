'use client';

/**
 * Dernier filet : l'erreur qui survient dans la mise en page racine.
 *
 * `error.tsx` attrape ce qui casse dans une page ; il est rendu **à
 * l'intérieur** de la mise en page, et ne peut donc rien pour elle. Sans ce
 * fichier, une panne dans `layout.tsx` — fournisseur de langue, lecture des
 * réglages — laissait Next servir sa page blanche par défaut, en anglais,
 * sans style et sans issue.
 *
 * Il rend son propre `<html>` : rien de la mise en page n'est disponible ici,
 * pas même la feuille de style, d'où les couleurs écrites en dur. Pas de
 * dictionnaire non plus — le fournisseur de langue est ce qui vient de
 * tomber ; le français est la langue par défaut du jeu.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0a090c',
          color: '#f4e7cf',
          fontFamily: 'system-ui, sans-serif',
          padding: '1.5rem',
        }}
      >
        <main style={{ maxWidth: '26rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.75rem' }}>Le pont a tangué</h1>
          <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
            Quelque chose s’est mal passé au chargement. Rien n’est perdu : ton
            équipage, ta collection et tes Berries sont enregistrés.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.25rem',
              padding: '0.7rem 1.4rem',
              borderRadius: '999px',
              border: 0,
              background: '#f5c542',
              color: '#0a090c',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', opacity: 0.6 }}>
              Code de l’incident : <code>{error.digest}</code>
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
