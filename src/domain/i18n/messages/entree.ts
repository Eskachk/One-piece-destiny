/**
 * Écrans d'entrée : connexion, inscription, mot de passe oublié, confirmation.
 *
 * Les clés `auth.err.*` reprennent **mot pour mot** les messages que rend le
 * service d'authentification. Ce n'est pas un doublon : c'est ce qui permet à
 * `messageServeur` (dans `lib/i18n.ts`) de retrouver la clé d'un message par
 * recherche inverse, sans que le service ait à connaître la langue. Un message
 * modifié dans le service sans l'être ici retombe simplement sur le français —
 * et `entree.test.ts` le signale.
 */
export const ENTREE = {
  fr: {
    'auth.login.title': 'Connexion',
    'auth.login.tagline': 'L’aube d’une aventure.',
    'auth.login.meta': 'Connexion',
    'auth.register.title': 'Embarque',
    'auth.register.tagline': 'Le chapitre est le spectacle.',
    'auth.register.meta': 'Embarque — crée ton équipage',
    'auth.register.description':
      'Rejoins One Piece Quest : choisis 3 personnages avant dimanche 23:59, marque des points quand ils apparaissent dans le chapitre, et grimpe au classement hebdomadaire. Gratuit.',
    'auth.register.ogTitle': 'Embarque — One Piece Quest',
    'auth.register.ogDescription':
      'Choisis 3 personnages avant dimanche. Marque des points quand ils apparaissent.',

    'auth.field.handle': 'Pseudo',
    'auth.field.handlePlaceholder': 'Ton nom de pirate',
    'auth.field.handleHint':
      'Visible au classement et sur le Marché. {min} à {max} caractères, modifiable dans les paramètres.',
    'auth.field.company': 'Société',
    'auth.field.email': 'Adresse e-mail',
    'auth.field.emailPlaceholder': 'capitaine@exemple.fr',
    'auth.field.password': 'Mot de passe',
    'auth.field.newPassword': 'Nouveau mot de passe',
    'auth.field.showPassword': 'Afficher le mot de passe',
    'auth.field.hidePassword': 'Masquer le mot de passe',
    'auth.field.passwordHint':
      '{min} caractères minimum. Une phrase que tu retiens vaut mieux qu’un mot compliqué.',
    'auth.field.passwordMin': '{min} caractères minimum.',

    'auth.action.signIn': 'Se connecter',
    'auth.action.signUp': 'S’inscrire',
    'auth.action.createAccount': 'Créer mon compte',
    'auth.action.pending': 'Un instant…',
    'auth.action.forgot': 'Mot de passe oublié ?',
    'auth.action.google': 'Continuer avec Google',
    'auth.action.or': 'ou',
    'auth.action.backToLogin': 'Retour à la connexion',
    'auth.action.backToGame': 'Retour au jeu',
    'auth.action.myProfile': 'Mon profil',
    'auth.action.sendLink': 'Envoyer le lien',
    'auth.action.sending': 'Envoi…',
    'auth.action.changePassword': 'Changer mon mot de passe',
    'auth.action.saving': 'Enregistrement…',
    'auth.action.newLink': 'Demander un nouveau lien',

    'auth.meta.hasCrew': 'Déjà un équipage ?',
    'auth.meta.noAccount': 'Pas encore de compte ?',

    'auth.forgot.title': 'Cap perdu',
    'auth.forgot.tagline': 'On t’envoie un lien valable une heure.',
    'auth.forgot.meta': 'Mot de passe oublié',

    'auth.reset.meta': 'Nouveau mot de passe',
    'auth.reset.title': 'Nouveau mot de passe',
    'auth.reset.expired':
      'Ce lien est invalide ou a expiré. Les liens ne valent qu’une heure et ne servent qu’une fois.',
    'auth.reset.sessionsClosed': 'Toutes tes sessions ouvertes seront fermées.',

    'auth.verify.meta': 'Confirmation d’adresse',
    'auth.verify.ok': 'Adresse confirmée',
    'auth.verify.ko': 'Confirmation impossible',
    'auth.verify.body':
      '{email} est bien la tienne. C’est cette adresse qui recevra les liens de réinitialisation et les alertes de sécurité.',
    'auth.verify.incomplete': 'Lien incomplet.',

    // Échecs Google, volontairement courts et non spécifiques : détailler
    // l'état interne offrirait un oracle pour tester l'existence d'un compte.
    'auth.google.annule': 'Connexion Google annulée.',
    'auth.google.etat': 'Requête expirée ou invalide. Réessaie.',
    'auth.google.incomplet': 'Réponse Google incomplète. Réessaie.',
    'auth.google.echange': 'Google n’a pas confirmé cette connexion.',
    'auth.google.compte': 'Impossible d’ouvrir ce compte.',
    'auth.google.indisponible': 'La connexion Google n’est pas configurée.',
    'auth.google.generic': 'Connexion impossible.',

    // Messages du service, mot pour mot.
    'auth.err.invalid': 'Identifiants invalides.',
    'auth.err.invalidRegister': 'Pseudo, adresse e-mail ou mot de passe invalide.',
    'auth.err.handleTaken': 'Ce pseudo est déjà pris.',
    'auth.err.createFailed': 'Création du compte impossible.',
    'auth.err.createFailedEmail': 'Impossible de créer ce compte. Essaie une autre adresse.',
    'auth.err.tooMany': 'Trop de tentatives. Réessaie dans quelques minutes.',
    'auth.err.updateFailed': 'Mise à jour impossible.',
    'auth.err.resetInvalid':
      'Ce lien est invalide ou a expiré. Demande une nouvelle réinitialisation.',
    'auth.err.verifyInvalid':
      'Ce lien est invalide ou a expiré. Demande-en un nouveau depuis ton profil.',
    'auth.err.verifyFailed': 'Vérification impossible.',
    'auth.err.dbMissing': 'Base de données non configurée.',
    'auth.err.resetSent':
      'Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.',
    'auth.err.resetBad': 'Lien ou mot de passe invalide.',

    // Pseudo, par code — `checkHandle` rend un code, pas un message.
    'auth.handle.TOO_SHORT': 'Le pseudo fait au moins {n} caractères.',
    'auth.handle.TOO_LONG': 'Le pseudo fait au plus {n} caractères.',
    'auth.handle.CHARACTERS': 'Lettres, chiffres, tiret, point et souligné seulement.',
    'auth.handle.EDGES': 'Le pseudo commence et finit par une lettre ou un chiffre.',
    'auth.handle.RESERVED': 'Ce pseudo est réservé. Choisis-en un autre.',

    // Politique de mot de passe, par code.
    'auth.pw.TOO_SHORT': 'Le mot de passe doit faire au moins {n} caractères.',
    'auth.pw.TOO_LONG': 'Le mot de passe ne peut pas dépasser {n} caractères.',
    'auth.pw.COMMON': 'Ce mot de passe est trop courant.',
    'auth.pw.REPEATED_CHARACTER': 'Évite de répéter indéfiniment le même caractère.',
    'auth.pw.CONTAINS_EMAIL': 'Le mot de passe ne doit pas contenir ton adresse e-mail.',
  },
  en: {
    'auth.login.title': 'Sign in',
    'auth.login.tagline': 'The dawn of an adventure.',
    'auth.login.meta': 'Sign in',
    'auth.register.title': 'All aboard',
    'auth.register.tagline': 'The chapter is the show.',
    'auth.register.meta': 'All aboard — build your crew',
    'auth.register.description':
      'Join One Piece Quest: pick 3 characters before Sunday 23:59, score points when they appear in the chapter, and climb the weekly ranking. Free.',
    'auth.register.ogTitle': 'All aboard — One Piece Quest',
    'auth.register.ogDescription':
      'Pick 3 characters before Sunday. Score points when they appear.',

    'auth.field.handle': 'Display name',
    'auth.field.handlePlaceholder': 'Your pirate name',
    'auth.field.handleHint':
      'Shown on the ranking and the Market. {min} to {max} characters, changeable in settings.',
    'auth.field.company': 'Company',
    'auth.field.email': 'Email address',
    'auth.field.emailPlaceholder': 'captain@example.com',
    'auth.field.password': 'Password',
    'auth.field.newPassword': 'New password',
    'auth.field.showPassword': 'Show password',
    'auth.field.hidePassword': 'Hide password',
    'auth.field.passwordHint':
      'At least {min} characters. A sentence you remember beats a complicated word.',
    'auth.field.passwordMin': 'At least {min} characters.',

    'auth.action.signIn': 'Sign in',
    'auth.action.signUp': 'Sign up',
    'auth.action.createAccount': 'Create my account',
    'auth.action.pending': 'One moment…',
    'auth.action.forgot': 'Forgot your password?',
    'auth.action.google': 'Continue with Google',
    'auth.action.or': 'or',
    'auth.action.backToLogin': 'Back to sign-in',
    'auth.action.backToGame': 'Back to the game',
    'auth.action.myProfile': 'My profile',
    'auth.action.sendLink': 'Send the link',
    'auth.action.sending': 'Sending…',
    'auth.action.changePassword': 'Change my password',
    'auth.action.saving': 'Saving…',
    'auth.action.newLink': 'Request a new link',

    'auth.meta.hasCrew': 'Already have a crew?',
    'auth.meta.noAccount': 'No account yet?',

    'auth.forgot.title': 'Lost bearings',
    'auth.forgot.tagline': 'We’ll send you a link valid for one hour.',
    'auth.forgot.meta': 'Forgot password',

    'auth.reset.meta': 'New password',
    'auth.reset.title': 'New password',
    'auth.reset.expired':
      'This link is invalid or has expired. Links are valid for one hour and can only be used once.',
    'auth.reset.sessionsClosed': 'All your open sessions will be closed.',

    'auth.verify.meta': 'Email confirmation',
    'auth.verify.ok': 'Address confirmed',
    'auth.verify.ko': 'Confirmation failed',
    'auth.verify.body':
      '{email} is yours. This is the address that will receive reset links and security alerts.',
    'auth.verify.incomplete': 'Incomplete link.',

    'auth.google.annule': 'Google sign-in cancelled.',
    'auth.google.etat': 'Request expired or invalid. Try again.',
    'auth.google.incomplet': 'Incomplete reply from Google. Try again.',
    'auth.google.echange': 'Google did not confirm this sign-in.',
    'auth.google.compte': 'This account could not be opened.',
    'auth.google.indisponible': 'Google sign-in is not configured.',
    'auth.google.generic': 'Sign-in failed.',

    'auth.err.invalid': 'Invalid credentials.',
    'auth.err.invalidRegister': 'Invalid display name, email address or password.',
    'auth.err.handleTaken': 'This name is already taken.',
    'auth.err.createFailed': 'The account could not be created.',
    'auth.err.createFailedEmail': 'This account could not be created. Try another address.',
    'auth.err.tooMany': 'Too many attempts. Try again in a few minutes.',
    'auth.err.updateFailed': 'Update failed.',
    'auth.err.resetInvalid': 'This link is invalid or has expired. Request a new reset.',
    'auth.err.verifyInvalid':
      'This link is invalid or has expired. Request a new one from your profile.',
    'auth.err.verifyFailed': 'Verification failed.',
    'auth.err.dbMissing': 'Database not configured.',
    'auth.err.resetSent':
      'If an account exists for this address, a reset link has just been sent.',
    'auth.err.resetBad': 'Invalid link or password.',

    'auth.handle.TOO_SHORT': 'The name must be at least {n} characters long.',
    'auth.handle.TOO_LONG': 'The name cannot exceed {n} characters.',
    'auth.handle.CHARACTERS': 'Letters, digits, dash, dot and underscore only.',
    'auth.handle.EDGES': 'The name must start and end with a letter or a digit.',
    'auth.handle.RESERVED': 'This name is reserved. Choose another one.',

    'auth.pw.TOO_SHORT': 'The password must be at least {n} characters long.',
    'auth.pw.TOO_LONG': 'The password cannot exceed {n} characters.',
    'auth.pw.COMMON': 'This password is too common.',
    'auth.pw.REPEATED_CHARACTER': 'Avoid repeating the same character over and over.',
    'auth.pw.CONTAINS_EMAIL': 'The password must not contain your email address.',
  },
} as const;
