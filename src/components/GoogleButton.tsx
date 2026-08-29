import Link from 'next/link';

/**
 * Bouton « Continuer avec Google ».
 *
 * Un lien, pas un bouton de formulaire : le départ du flux OAuth est une
 * navigation vers `/api/auth/google`, qui pose les cookies `state` et PKCE
 * avant de rediriger. Un `<form>` n'apporterait rien et compliquerait le
 * comportement du bouton « précédent » du navigateur.
 *
 * Le logo est dessiné en SVG : aucune ressource externe à charger, donc rien
 * qui puisse être bloqué par la politique de sécurité de contenu.
 */
export function GoogleButton() {
  return (
    <>
      <p className="harbor__divider">ou</p>

      <Link href="/api/auth/google" className="harbor__google">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z"
          />
          <path
            fill="#34A853"
            d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.6-3.9-12.4-9.1H4.3v5.7C7.9 41.1 15.4 46 24 46z"
          />
          <path
            fill="#FBBC05"
            d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.2 2 20.5 2 24s.8 6.8 2.3 9.8l7.3-5.7z"
          />
          <path
            fill="#EA4335"
            d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.3 30 2 24 2 15.4 2 7.9 6.9 4.3 14.2l7.3 5.7c1.8-5.2 6.6-9.1 12.4-9.1z"
          />
        </svg>
        Continuer avec Google
      </Link>
    </>
  );
}
