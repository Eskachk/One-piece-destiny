/**
 * Écran d'attente du Poste de commandement.
 *
 * Sans ce fichier, les pages d'administration héritaient de l'écran d'attente
 * du jeu (`app/loading.tsx`) : un décor de port ensoleillé et la barre
 * d'onglets Équipage / Classement / Collection… au-dessus d'un outil interne.
 * C'était faux à deux titres — l'administration n'a pas cette navigation, et
 * elle n'a pas ce fond.
 *
 * Volontairement minimal : cet écran est vu quelques centaines de
 * millisecondes par une seule personne. Le soigner davantage serait du temps
 * pris sur ce que voient les joueurs.
 */
export default function AdminLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8" aria-busy="true">
      <span className="sr-only">Chargement du Poste de commandement…</span>

      <div className="hb-skeleton" style={{ width: '8rem', height: '0.7rem' }} />
      <div
        className="hb-skeleton mt-3"
        style={{ width: '14rem', height: '2rem' }}
      />

      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((tile) => (
          <div
            key={tile}
            className="rounded-lg border border-turquoise/20 bg-navy/40 p-3"
          >
            <div
              className="hb-skeleton"
              style={{ width: '60%', height: '0.6rem' }}
            />
            <div
              className="hb-skeleton mt-2"
              style={{ width: '40%', height: '1.2rem' }}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
