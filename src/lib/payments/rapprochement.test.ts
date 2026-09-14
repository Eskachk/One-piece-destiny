import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

/**
 * Le rapprochement au retour en boutique, à prestataire simulé.
 *
 * Ce qui est vérifié ici n'est pas le règlement lui-même — il a son propre
 * chemin, le même que le webhook — mais le **branchement** : quelles sessions
 * on interroge, ce qu'on fait d'une réponse « payée », d'une réponse « pas
 * encore », d'un prestataire injoignable, et le ménage des sessions périmées.
 */

const retrievePayment = vi.fn();
const reglerPaiement = vi.fn();
const requetes: { table: string; op: string; args: unknown[] }[] = [];
let ouvertes: { id: string; product_id: string; provider_ref: string }[] = [];

/** Un constructeur de requête chaînable, qui note ce qu'on lui demande. */
function chaine(table: string) {
  const journal = { table, op: '', args: [] as unknown[] };
  requetes.push(journal);
  const q: Record<string, unknown> = {};
  const etape =
    (nom: string) =>
    (...args: unknown[]) => {
      journal.args.push([nom, ...args]);
      if (nom === 'update' || nom === 'select') journal.op = nom;
      return q;
    };
  for (const nom of ['update', 'select', 'eq', 'lt', 'gte', 'not', 'order']) q[nom] = etape(nom);
  q.limit = (...args: unknown[]) => {
    journal.args.push(['limit', ...args]);
    return Promise.resolve({ data: ouvertes });
  };
  // Un `await` sur la chaîne d'update : il faut qu'elle soit « thenable ».
  q.then = (res: (v: unknown) => void) => res({ data: null, error: null });
  return q;
}

vi.mock('@/lib/supabase-admin', () => ({ db: () => ({ from: chaine }) }));
vi.mock('@/lib/payments/reglement', () => ({ reglerPaiement: (...a: unknown[]) => reglerPaiement(...a) }));
vi.mock('@/lib/payments/provider', () => ({
  paymentsState: () => ({
    enabled: true,
    mode: 'test',
    provider: { name: 'stripe', retrievePayment: (...a: unknown[]) => retrievePayment(...a) },
  }),
}));

const { rapprocherRetour } = await import('./rapprochement');

const JOUEUR = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  retrievePayment.mockReset();
  reglerPaiement.mockReset();
  requetes.length = 0;
  ouvertes = [];
});

describe('rapprocherRetour', () => {
  it('ne rapproche rien quand aucune session n’est ouverte', async () => {
    expect(await rapprocherRetour(JOUEUR)).toEqual({ etat: 'rien' });
    expect(retrievePayment).not.toHaveBeenCalled();
  });

  it('commence par clore les sessions périmées de ce joueur seulement', async () => {
    await rapprocherRetour(JOUEUR);
    const menage = requetes.find((r) => r.op === 'update');
    expect(menage?.table).toBe('payment_intents');
    expect(menage?.args).toEqual(
      expect.arrayContaining([
        ['update', { status: 'CANCELLED' }],
        ['eq', 'player_id', JOUEUR],
        ['eq', 'status', 'CREATED'],
        expect.arrayContaining(['lt', 'created_at']),
      ]),
    );
  });

  it('crédite une session payée par le même règlement que le webhook', async () => {
    ouvertes = [{ id: 'int-1', product_id: 'berries_pouch', provider_ref: 'cs_1' }];
    retrievePayment.mockResolvedValue({
      eventId: 'cs_1',
      intentId: null,
      productId: 'berries_pouch',
      amountCents: 499,
      currency: 'eur',
      status: 'paid',
    });
    reglerPaiement.mockResolvedValue({ issue: 'CREDITE', productId: 'berries_pouch', playerId: JOUEUR });

    expect(await rapprocherRetour(JOUEUR)).toEqual({ etat: 'credite', productId: 'berries_pouch' });
    // L'intention est la nôtre, forcée dans l'événement, et la source est nommée.
    expect(reglerPaiement).toHaveBeenCalledWith(
      expect.objectContaining({ intentId: 'int-1', status: 'paid' }),
      'stripe',
      'retour',
    );
  });

  it('dit « crédité » si le webhook est passé avant', async () => {
    ouvertes = [{ id: 'int-1', product_id: 'chest_pack_small', provider_ref: 'cs_1' }];
    retrievePayment.mockResolvedValue({ eventId: 'cs_1', intentId: 'int-1', productId: 'chest_pack_small', amountCents: 299, currency: 'eur', status: 'paid' });
    reglerPaiement.mockResolvedValue({ issue: 'DEJA', productId: 'chest_pack_small', playerId: JOUEUR });

    expect(await rapprocherRetour(JOUEUR)).toEqual({ etat: 'credite', productId: 'chest_pack_small' });
  });

  it('attend quand la session n’est pas encore payée', async () => {
    ouvertes = [{ id: 'int-1', product_id: 'berries_pouch', provider_ref: 'cs_1' }];
    retrievePayment.mockResolvedValue({ eventId: 'cs_1', intentId: 'int-1', productId: 'berries_pouch', amountCents: 499, currency: 'eur', status: 'unpaid' });

    expect(await rapprocherRetour(JOUEUR)).toEqual({ etat: 'attente' });
    expect(reglerPaiement).not.toHaveBeenCalled();
  });

  it('ne bloque pas la page si le prestataire est injoignable', async () => {
    ouvertes = [
      { id: 'int-1', product_id: 'berries_pouch', provider_ref: 'cs_1' },
      { id: 'int-2', product_id: 'berries_hold', provider_ref: 'cs_2' },
    ];
    retrievePayment
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ eventId: 'cs_2', intentId: 'int-2', productId: 'berries_hold', amountCents: 999, currency: 'eur', status: 'paid' });
    reglerPaiement.mockResolvedValue({ issue: 'CREDITE', productId: 'berries_hold', playerId: JOUEUR });

    expect(await rapprocherRetour(JOUEUR)).toEqual({ etat: 'credite', productId: 'berries_hold' });
  });

  it('ne crédite pas ce que le règlement refuse', async () => {
    ouvertes = [{ id: 'int-1', product_id: 'berries_pouch', provider_ref: 'cs_1' }];
    retrievePayment.mockResolvedValue({ eventId: 'cs_1', intentId: 'int-1', productId: 'berries_pouch', amountCents: 1, currency: 'eur', status: 'paid' });
    reglerPaiement.mockResolvedValue({ issue: 'REFUSE', reason: 'Montant inattendu : 1 au lieu de 499.' });

    expect(await rapprocherRetour(JOUEUR)).toEqual({ etat: 'attente' });
  });
});
