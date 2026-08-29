import { describe, expect, it } from 'vitest';
import { assessRisk, levelOf, type RiskInput } from './engine';
import { RISK_LEVELS, SIGNAL_WEIGHTS } from './config';

const now = new Date('2026-08-29T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(now.getTime() - ms);

/** Compte ordinaire : ancien, actif, sans flux économique. */
const base: RiskInput = {
  accountAgeMs: 60 * DAY,
  accountsSharingContext: 1,
  chestsOpenedRecently: 2,
  hasLockedCrew: true,
  referrals: [],
  outgoingTransfers: [],
  incomingTransfers: [],
  now,
};

const names = (input: RiskInput) => assessRisk(input).signals.map((s) => s.name);

describe('moteur de risque — cas légitimes (§32)', () => {
  it('ne signale rien sur un joueur ordinaire', () => {
    const result = assessRisk(base);
    expect(result.score).toBe(0);
    expect(result.level).toBe('NORMAL');
    expect(result.action).toBe('NONE');
  });

  it('un foyer partageant une connexion n’est pas restreint', () => {
    // Le cas le plus important de tout le fichier. Deux frères, une box :
    // c'est le faux positif que le dispositif doit refuser de produire.
    const famille = assessRisk({ ...base, accountsSharingContext: 4 });

    expect(famille.signals.map((s) => s.name)).toContain('RELATED_ACCOUNTS');
    expect(famille.action).not.toBe('RESTRICT_ECONOMY');
  });

  it('aucun signal isolé n’atteint le seuil de restriction', () => {
    // Traduction arithmétique de la règle « same IP != fraud ». Si un poids
    // venait à franchir ce seuil, un seul signal suffirait à restreindre un
    // compte — exactement ce que le cadrage interdit.
    for (const [name, weight] of Object.entries(SIGNAL_WEIGHTS)) {
      expect(weight, name).toBeLessThan(RISK_LEVELS.RESTRICTED);
    }
  });

  it('ne reproche pas à un compte neuf de ne pas encore jouer', () => {
    const inscrit = assessRisk({
      ...base,
      accountAgeMs: 10 * 60 * 1000,
      hasLockedCrew: false,
    });
    expect(inscrit.signals.map((s) => s.name)).not.toContain('NO_GAMEPLAY');
  });

  it('un échange déséquilibré isolé entre amis ne déclenche rien', () => {
    const cadeau = assessRisk({
      ...base,
      outgoingTransfers: [
        {
          counterpartyId: 'ami',
          amount: 1,
          at: ago(HOUR),
          heldForMs: 30 * DAY,
          fromStarterChest: false,
          counterpartyRelated: false,
        },
      ],
    });
    expect(cadeau.level).toBe('NORMAL');
  });

  it('un joueur très actif n’est pas suspect par son volume', () => {
    const actif = assessRisk({
      ...base,
      chestsOpenedRecently: 25,
      outgoingTransfers: Array.from({ length: 6 }, (_, i) => ({
        counterpartyId: `acheteur-${i}`, // acheteurs tous différents
        amount: 4_000,
        at: ago(i * DAY),
        heldForMs: 10 * DAY,
        fromStarterChest: false,
        counterpartyRelated: false,
      })),
    });
    expect(actif.action).not.toBe('RESTRICT_ECONOMY');
  });
});

describe('moteur de risque — abus (§31)', () => {
  it('détecte la ferme de comptes alimentant un compte principal', () => {
    // Le scénario du critère de réussite (§43) : des comptes fabriqués, des
    // coffres, aucune partie jouée, tout la valeur vers une seule adresse.
    const alt = assessRisk({
      ...base,
      accountAgeMs: 3 * HOUR,
      accountsSharingContext: 20,
      hasLockedCrew: false,
      outgoingTransfers: Array.from({ length: 4 }, (_, i) => ({
        counterpartyId: 'compte-principal',
        amount: 5_000,
        at: ago(i * 10 * 60 * 1000),
        heldForMs: 5 * 60 * 1000,
        fromStarterChest: true,
        counterpartyRelated: true,
      })),
    });

    expect(alt.level).toBe('HIGH_RISK');
    expect(alt.action).toBe('RESTRICT_ECONOMY');
    expect(alt.signals.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        'RELATED_ACCOUNTS',
        'RAPID_VALUE_TRANSFER',
        'COMMON_BENEFICIARY',
        'WELCOME_VALUE_FARMING',
      ]),
    );
  });

  it('détecte une ferme de parrainage', () => {
    expect(
      names({
        ...base,
        referrals: Array.from({ length: 20 }, () => ({
          hasLockedCrew: false,
          accountAgeMs: 3 * DAY,
        })),
      }),
    ).toContain('REFERRAL_CLUSTER');
  });

  it('ne signale pas un parrain dont les filleuls jouent vraiment', () => {
    const honnete = assessRisk({
      ...base,
      referrals: Array.from({ length: 20 }, () => ({
        hasLockedCrew: true,
        accountAgeMs: 30 * DAY,
      })),
    });
    expect(honnete.signals.map((s) => s.name)).not.toContain('REFERRAL_CLUSTER');
  });

  it('détecte des échanges circulaires', () => {
    const wash = assessRisk({
      ...base,
      outgoingTransfers: [
        {
          counterpartyId: 'complice',
          amount: 9_000,
          at: ago(2 * DAY),
          heldForMs: 5 * DAY,
          fromStarterChest: false,
          counterpartyRelated: false,
        },
        {
          counterpartyId: 'complice',
          amount: 9_000,
          at: ago(DAY),
          heldForMs: 5 * DAY,
          fromStarterChest: false,
          counterpartyRelated: false,
        },
      ],
      incomingTransfers: [
        {
          counterpartyId: 'complice',
          amount: 9_000,
          at: ago(3 * DAY),
          heldForMs: null,
          fromStarterChest: false,
          counterpartyRelated: false,
        },
      ],
    });
    expect(wash.signals.map((s) => s.name)).toContain('WASH_TRADING');
  });

  it('ignore les transferts sortis de la fenêtre d’observation', () => {
    const ancien = assessRisk({
      ...base,
      outgoingTransfers: Array.from({ length: 5 }, () => ({
        counterpartyId: 'compte-principal',
        amount: 5_000,
        at: ago(90 * DAY),
        heldForMs: 60 * 1000,
        fromStarterChest: true,
        counterpartyRelated: true,
      })),
    });
    expect(ancien.level).toBe('NORMAL');
  });
});

describe('score et graduation', () => {
  it('plafonne à 100', () => {
    const extreme = assessRisk({
      accountAgeMs: HOUR,
      accountsSharingContext: 50,
      chestsOpenedRecently: 500,
      hasLockedCrew: false,
      referrals: Array.from({ length: 30 }, () => ({
        hasLockedCrew: false,
        accountAgeMs: 5 * DAY,
      })),
      outgoingTransfers: Array.from({ length: 10 }, () => ({
        counterpartyId: 'principal',
        amount: 9_000,
        at: ago(HOUR),
        heldForMs: 60_000,
        fromStarterChest: true,
        counterpartyRelated: true,
      })),
      incomingTransfers: Array.from({ length: 5 }, () => ({
        counterpartyId: 'principal',
        amount: 100,
        at: ago(2 * HOUR),
        heldForMs: null,
        fromStarterChest: false,
        counterpartyRelated: false,
      })),
      now,
    });
    expect(extreme.score).toBe(100);
  });

  it('respecte l’ordre des niveaux', () => {
    expect(levelOf(0)).toBe('NORMAL');
    expect(levelOf(29)).toBe('NORMAL');
    expect(levelOf(30)).toBe('LOW_RISK');
    expect(levelOf(50)).toBe('REVIEW');
    expect(levelOf(70)).toBe('RESTRICTED');
    expect(levelOf(85)).toBe('HIGH_RISK');
  });

  it('conserve le motif de chaque signal : un score sans motif n’est pas exploitable', () => {
    const result = assessRisk({ ...base, accountsSharingContext: 9 });
    for (const signal of result.signals) {
      expect(signal.detail.length).toBeGreaterThan(0);
    }
  });

  it('ne suspend jamais automatiquement', () => {
    const extreme = assessRisk({
      ...base,
      accountsSharingContext: 99,
      hasLockedCrew: false,
      outgoingTransfers: Array.from({ length: 9 }, () => ({
        counterpartyId: 'principal',
        amount: 9_000,
        at: ago(HOUR),
        heldForMs: 1_000,
        fromStarterChest: true,
        counterpartyRelated: true,
      })),
    });
    // La suspension reste une décision humaine, prise depuis le Fraud Center.
    expect(extreme.action).toBe('RESTRICT_ECONOMY');
  });
});
