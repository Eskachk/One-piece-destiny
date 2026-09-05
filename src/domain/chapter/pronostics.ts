/**
 * Pronostics secondaires (§73, dans l'esprit des missions).
 *
 * ## Le problème qu'ils règlent
 *
 * Le jeu tient en **une décision par semaine**, prise en trente secondes le
 * dimanche. Entre la publication et le verrouillage suivant, rien n'appelle le
 * joueur à revenir : la collection et le Marché existent, mais ils ne sont pas
 * datés. Un pronostic ouvert du lundi au dimanche donne une deuxième raison de
 * passer, et une deuxième chose à discuter avec ses amis.
 *
 * ## Pourquoi le bonus est en Berries, et jamais en points
 *
 * C'est la question qui décide de tout le reste, et le cahier y répond déjà
 * trois fois :
 *
 *   §25  la rareté ne touche jamais le score ;
 *   §48  la monnaie n'achète jamais la victoire ;
 *   §72  les récompenses compétitives restent équitables.
 *
 * Et `missions.ts` énonce la règle en toutes lettres pour un cas identique :
 * « les récompenses sont en Berries et en coffres, **jamais en points de
 * score** ». Un pronostic secondaire est une mission avec une échéance
 * hebdomadaire ; il n'y a aucune raison qu'il obéisse à une autre règle.
 *
 * Ajouter des points, ce serait aussi rouvrir six versions de moteur de score
 * — v1 à v6, toutes rejouables (§78) — pour une pièce d'appoint. Le classement
 * doit continuer de mesurer une seule chose : la qualité de la prédiction sur
 * le chapitre.
 *
 * Passer par les Berries **n'affaiblit pas** l'incitation : ils achètent des
 * coffres, donc de la collection, qui est la moitié du jeu.
 *
 * ## Le calibrage
 *
 * Cent Berries par bonne réponse, trois questions au plus — trois cents au
 * total, soit exactement le socle de participation hebdomadaire.
 *
 * L'ordre de grandeur est délibéré. Au-dessus, un joueur qui répond bien mais
 * joue mal gagnerait davantage qu'un Top 100, et le pronostic secondaire
 * deviendrait le jeu principal. En dessous, personne ne se déplacerait.
 *
 * Une question à deux choix rapporte cent cinquante Berries en moyenne à qui
 * répond au hasard : c'est le prix d'entrée, pas la récompense. La compétence
 * double la mise.
 */

/** Nombre de questions par chapitre. Au-delà, ce n'est plus un à-côté. */
export const MAX_QUESTIONS = 3;

/** Ce que rapporte une bonne réponse. */
export const BONUS_PAR_BONNE_REPONSE = 100;

export const PROMPT_MIN = 8;
export const PROMPT_MAX = 120;
export const OPTION_MAX = 40;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;

export interface Question {
  id: string;
  /** L'intitulé, tel qu'il s'affiche. */
  prompt: string;
  options: string[];
  /**
   * Index de la bonne réponse, ou `null` tant que le chapitre n'est pas publié.
   *
   * ⚠️ **Ce champ ne doit jamais atteindre le navigateur avant la
   * publication** (§3). Une réponse connue d'avance est un spoiler du
   * chapitre, au même titre que la liste des apparitions.
   */
  answer: number | null;
}

export type RefusQuestion =
  | 'INTITULE_COURT'
  | 'INTITULE_LONG'
  | 'PAS_ASSEZ_D_OPTIONS'
  | 'TROP_D_OPTIONS'
  | 'OPTION_VIDE'
  | 'OPTIONS_IDENTIQUES';

export type VerdictQuestion =
  | { valide: true; prompt: string; options: string[] }
  | { valide: false; raison: RefusQuestion };

/**
 * Valide l'intitulé et les choix d'une question.
 *
 * Les options sont **dédupliquées à la comparaison, pas à l'enregistrement** :
 * deux choix identiques ne sont pas une liste plus courte, c'est une question
 * mal écrite, et l'administrateur doit la corriger plutôt que de la voir
 * silencieusement raccourcie.
 */
export function validerQuestion(
  promptBrut: string,
  optionsBrutes: readonly string[],
): VerdictQuestion {
  const prompt = promptBrut.trim().replace(/\s+/g, ' ');

  if (prompt.length < PROMPT_MIN) return { valide: false, raison: 'INTITULE_COURT' };
  if (prompt.length > PROMPT_MAX) return { valide: false, raison: 'INTITULE_LONG' };

  const options = optionsBrutes.map((o) => o.trim().replace(/\s+/g, ' '));

  if (options.some((o) => o.length === 0)) {
    return { valide: false, raison: 'OPTION_VIDE' };
  }
  if (options.length < MIN_OPTIONS) {
    return { valide: false, raison: 'PAS_ASSEZ_D_OPTIONS' };
  }
  if (options.length > MAX_OPTIONS) {
    return { valide: false, raison: 'TROP_D_OPTIONS' };
  }
  if (options.some((o) => o.length > OPTION_MAX)) {
    return { valide: false, raison: 'INTITULE_LONG' };
  }

  const distinctes = new Set(options.map((o) => o.toLocaleLowerCase('fr')));
  if (distinctes.size !== options.length) {
    return { valide: false, raison: 'OPTIONS_IDENTIQUES' };
  }

  return { valide: true, prompt, options };
}

export function decrireRefusQuestion(raison: RefusQuestion): string {
  switch (raison) {
    case 'INTITULE_COURT':
      return `L'intitulé doit faire au moins ${PROMPT_MIN} caractères.`;
    case 'INTITULE_LONG':
      return `L'intitulé ou une option dépasse la longueur autorisée.`;
    case 'PAS_ASSEZ_D_OPTIONS':
      return `Il faut au moins ${MIN_OPTIONS} choix.`;
    case 'TROP_D_OPTIONS':
      return `Pas plus de ${MAX_OPTIONS} choix.`;
    case 'OPTION_VIDE':
      return 'Un choix est vide.';
    case 'OPTIONS_IDENTIQUES':
      return 'Deux choix sont identiques.';
  }
}

export interface ReponseJoueur {
  questionId: string;
  choice: number;
}

/**
 * Berries gagnés par un joueur sur les pronostics d'un chapitre.
 *
 * Fonction pure, et c'est ce qui la rend rejouable : republier un chapitre
 * corrigé (§79) redonne exactement le même bonus.
 *
 * Une question **sans réponse validée** ne rapporte rien et n'enlève rien —
 * l'administrateur peut avoir oublié d'en trancher une, et ce n'est pas au
 * joueur de le payer.
 */
export function bonusDe(
  reponses: readonly ReponseJoueur[],
  questions: readonly Question[],
): number {
  const corrections = new Map(
    questions
      .filter((q) => q.answer !== null)
      .map((q) => [q.id, q.answer as number]),
  );

  let bonnes = 0;
  for (const reponse of reponses) {
    if (corrections.get(reponse.questionId) === reponse.choice) bonnes += 1;
  }

  return bonnes * BONUS_PAR_BONNE_REPONSE;
}

/**
 * Les questions telles qu'on peut les envoyer au navigateur avant publication.
 *
 * La bonne réponse est **retirée**, pas masquée par l'affichage : ce qui part
 * dans la charge d'une page rendue par le serveur est lisible par n'importe
 * qui ouvre les outils de développement. C'est la même règle que pour les
 * apparitions du chapitre en cours (§3).
 */
export function sansReponse(questions: readonly Question[]): Question[] {
  return questions.map((question) => ({ ...question, answer: null }));
}
