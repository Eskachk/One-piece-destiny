import {
  ECONOMIC_WINDOW_MS,
  RAPID_TRANSFER_MS,
  RISK_LEVELS,
  SIGNAL_WEIGHTS,
  VELOCITY,
  type RiskLevel,
  type SignalName,
} from './config';

/**
 * Moteur de risque comportemental (cahier §43).
 *
 * **Fonction pure.** Elle reçoit des faits déjà rassemblés et rend une
 * évaluation. Trois conséquences, et chacune compte :
 *
 *   1. elle se teste sans base — les scénarios d'abus comme les scénarios
 *      légitimes sont rejouables à l'identique ;
 *   2. elle ne peut pas ralentir une route : elle ne fait aucune requête ;
 *   3. un litige se rejoue. Un joueur restreint à tort peut être réévalué sur
 *      les mêmes faits, et l'on voit exactement ce qui l'a fait basculer.
 *
 * Ce qu'elle **ne fait pas**, délibérément :
 *
 *   — elle ne bannit pas. Elle recommande, un humain tranche au-delà de la
 *     simple restriction économique ;
 *   — elle n'affirme jamais une fraude. Elle rend un score et des signaux,
 *     c'est-à-dire une probabilité assortie de ses motifs ;
 *   — elle n'identifie personne. Aucun signal ne cherche à savoir *qui* est
 *     derrière un compte, seulement si un groupe de comptes se comporte comme
 *     un dispositif d'extraction de valeur.
 */

export interface RiskSignal {
  name: SignalName;
  weight: number;
  /** Ce qui a déclenché le signal, pour l'administrateur. */
  detail: string;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  signals: RiskSignal[];
  /** Action proportionnée recommandée. */
  action: RiskAction;
}

/**
 * Réponses graduées (§24).
 *
 * `MONITOR` n'a **aucun effet visible** : c'est important. La majorité des
 * comptes signalés sont des joueurs ordinaires qui ont eu une semaine
 * inhabituelle, et ils ne doivent rien remarquer.
 */
export type RiskAction = 'NONE' | 'MONITOR' | 'REVIEW' | 'RESTRICT_ECONOMY';

export interface RiskInput {
  /** Âge du compte en millisecondes. */
  accountAgeMs: number;
  /** Comptes partageant le contexte technique d'inscription, celui-ci inclus. */
  accountsSharingContext: number;
  /** Coffres ouverts sur la fenêtre de vélocité. */
  chestsOpenedRecently: number;
  /** Le joueur a-t-il déjà verrouillé un équipage ? */
  hasLockedCrew: boolean;
  /** Filleuls du joueur, avec leur activité. */
  referrals: { hasLockedCrew: boolean; accountAgeMs: number }[];
  /** Transferts de valeur sortants sur la fenêtre économique. */
  outgoingTransfers: EconomicTransfer[];
  /** Transferts entrants, pour repérer un bénéficiaire commun. */
  incomingTransfers: EconomicTransfer[];
  now: Date;
}

export interface EconomicTransfer {
  /** Autre partie de l'échange. */
  counterpartyId: string;
  /** Berries échangées. */
  amount: number;
  at: Date;
  /** Le vendeur possédait-il la carte depuis peu ? */
  heldForMs: number | null;
  /** La carte venait-elle d'un coffre d'inscription ? */
  fromStarterChest: boolean;
  /** L'autre partie partage-t-elle le contexte technique du joueur ? */
  counterpartyRelated: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

function within(at: Date, now: Date, windowMs: number): boolean {
  return now.getTime() - at.getTime() <= windowMs;
}

/**
 * Évalue un compte.
 *
 * L'ordre des signaux n'a aucune importance sur le score — ils s'additionnent
 * — mais il en a pour la lecture : du plus technique au plus économique,
 * c'est-à-dire du plus faible au plus significatif.
 */
export function assessRisk(input: RiskInput): RiskAssessment {
  const signals: RiskSignal[] = [];

  const add = (name: SignalName, detail: string) =>
    signals.push({ name, weight: SIGNAL_WEIGHTS[name], detail });

  // --- Signaux techniques -------------------------------------------------
  if (input.accountAgeMs < DAY) {
    add('NEW_ACCOUNT', 'Compte de moins de 24 h.');
  }

  if (input.accountsSharingContext > VELOCITY.signup.max) {
    add(
      'RELATED_ACCOUNTS',
      `${input.accountsSharingContext} comptes créés depuis le même contexte réseau.`,
    );
  }

  if (input.chestsOpenedRecently > VELOCITY.chestOpening.max) {
    add(
      'RAPID_CHEST_OPENING',
      `${input.chestsOpenedRecently} coffres ouverts en une heure.`,
    );
  }

  // --- Signaux comportementaux --------------------------------------------
  //
  // « Ne joue pas » n'a de sens que passé le premier jour : un compte créé il
  // y a dix minutes n'a évidemment pas encore verrouillé d'équipage, et le lui
  // reprocher signalerait tous les nouveaux joueurs le jour de leur arrivée.
  if (!input.hasLockedCrew && input.accountAgeMs > DAY) {
    add('NO_GAMEPLAY', 'Aucun équipage verrouillé depuis la création.');
  }

  const inactiveReferrals = input.referrals.filter(
    (referral) => !referral.hasLockedCrew && referral.accountAgeMs > DAY,
  );
  if (
    input.referrals.length > VELOCITY.referral.max &&
    inactiveReferrals.length >= input.referrals.length / 2
  ) {
    add(
      'REFERRAL_CLUSTER',
      `${inactiveReferrals.length} filleuls sur ${input.referrals.length} n'ont jamais joué.`,
    );
  }

  // --- Signaux économiques ------------------------------------------------
  const recentOut = input.outgoingTransfers.filter((transfer) =>
    within(transfer.at, input.now, ECONOMIC_WINDOW_MS),
  );

  const rapid = recentOut.filter(
    (transfer) => transfer.heldForMs !== null && transfer.heldForMs < RAPID_TRANSFER_MS,
  );
  if (rapid.length >= 3) {
    add(
      'RAPID_VALUE_TRANSFER',
      `${rapid.length} cartes revendues moins de deux heures après leur obtention.`,
    );
  }

  // Bénéficiaire commun : le signal le plus lourd du dispositif, parce que
  // c'est exactement la forme que prend l'abus qu'on cherche — plusieurs
  // comptes, une seule destination.
  const beneficiaries = new Map<string, number>();
  for (const transfer of recentOut) {
    beneficiaries.set(
      transfer.counterpartyId,
      (beneficiaries.get(transfer.counterpartyId) ?? 0) + 1,
    );
  }
  const topBeneficiary = [...beneficiaries.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topBeneficiary && topBeneficiary[1] >= 3) {
    add(
      'COMMON_BENEFICIARY',
      `${topBeneficiary[1]} transferts vers un même compte.`,
    );
  }

  // Wash trading : la valeur revient d'où elle vient.
  const circular = recentOut.filter((out) =>
    input.incomingTransfers.some(
      (income) =>
        income.counterpartyId === out.counterpartyId &&
        within(income.at, input.now, ECONOMIC_WINDOW_MS),
    ),
  );
  if (circular.length >= 2) {
    add(
      'WASH_TRADING',
      `Échanges dans les deux sens avec ${new Set(circular.map((t) => t.counterpartyId)).size} compte(s).`,
    );
  }

  // Le trajet complet : carte de coffre d'inscription, revendue vite, à un
  // compte du même contexte. Les trois conditions ensemble, jamais séparément.
  const farming = recentOut.filter(
    (transfer) =>
      transfer.fromStarterChest &&
      transfer.counterpartyRelated &&
      transfer.heldForMs !== null &&
      transfer.heldForMs < RAPID_TRANSFER_MS,
  );
  if (farming.length >= 1) {
    add(
      'WELCOME_VALUE_FARMING',
      `${farming.length} carte(s) de coffre d'inscription transférée(s) rapidement vers un compte lié.`,
    );
  }

  // Plafond à 100 : sans lui, la graduation n'aurait plus de sens dès que six
  // signaux se cumulent.
  const score = Math.min(
    100,
    signals.reduce((total, signal) => total + signal.weight, 0),
  );

  return { score, level: levelOf(score), signals, action: actionOf(score) };
}

export function levelOf(score: number): RiskLevel {
  if (score >= RISK_LEVELS.HIGH_RISK) return 'HIGH_RISK';
  if (score >= RISK_LEVELS.RESTRICTED) return 'RESTRICTED';
  if (score >= RISK_LEVELS.REVIEW) return 'REVIEW';
  if (score >= RISK_LEVELS.LOW_RISK) return 'LOW_RISK';
  return 'NORMAL';
}

/**
 * Action recommandée.
 *
 * Aucun niveau ne suspend automatiquement. La suspension reste une décision
 * humaine, prise depuis le Fraud Center : une détection automatique se trompe,
 * une suspension automatique se trompe durablement.
 */
export function actionOf(score: number): RiskAction {
  const level = levelOf(score);
  switch (level) {
    case 'NORMAL':
      return 'NONE';
    case 'LOW_RISK':
      return 'MONITOR';
    case 'REVIEW':
      return 'REVIEW';
    case 'RESTRICTED':
    case 'HIGH_RISK':
      return 'RESTRICT_ECONOMY';
  }
}

/**
 * Message destiné au joueur restreint.
 *
 * Volontairement générique (§40). Détailler les signaux reviendrait à publier
 * le mode d'emploi du contournement — et à accuser nommément quelqu'un sur la
 * foi d'un calcul probabiliste.
 */
export const RESTRICTION_MESSAGE =
  'Certaines fonctions d’échange sont temporairement indisponibles sur ce compte. Elles se rouvriront d’elles-mêmes ; tu peux continuer à jouer normalement.';
