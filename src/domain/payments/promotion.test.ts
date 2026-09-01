import { describe, expect, it } from 'vitest';
import { CATALOG } from './catalog';
import {
  LAUNCH_DISCOUNT,
  effectivePriceCents,
  isDiscounted,
  launchWindow,
} from './promotion';

const LAUNCH = new Date('2026-09-15T10:00:00.000Z');
const at = (hours: number) =>
  new Date(LAUNCH.getTime() + hours * 60 * 60 * 1000);

describe('offre de lancement', () => {
  it('n’existe pas tant que la date n’est pas configurée', () => {
    // Le bon défaut : mieux vaut ne rien annoncer qu'une remise dont on ne
    // sait pas quand elle finit.
    const fenetre = launchWindow(new Date(), null);

    expect(fenetre.active).toBe(false);
    expect(fenetre.endsAt).toBeNull();
    expect(
      effectivePriceCents(CATALOG.chest_pack_small, new Date(), fenetre),
    ).toBe(CATALOG.chest_pack_small.priceCents);
  });

  it('ne s’ouvre pas avant l’heure', () => {
    expect(launchWindow(at(-1), LAUNCH).active).toBe(false);
  });

  it('couvre exactement sept jours', () => {
    expect(launchWindow(at(0), LAUNCH).active).toBe(true);
    expect(launchWindow(at(24 * 7 - 1), LAUNCH).active).toBe(true);
    // La borne haute est exclue : à l'instant précis du septième jour, c'est
    // fini. Sans quoi l'offre durerait une seconde de trop, ce qui n'est pas
    // grave — mais « sept jours » doit vouloir dire sept jours.
    expect(launchWindow(at(24 * 7), LAUNCH).active).toBe(false);
  });

  it('décompte les jours restants', () => {
    expect(launchWindow(at(0), LAUNCH).daysLeft).toBe(7);
    expect(launchWindow(at(24 * 6 + 1), LAUNCH).daysLeft).toBe(1);
    expect(launchWindow(at(24 * 8), LAUNCH).daysLeft).toBe(0);
  });

  it('remise les coffres, et eux seuls', () => {
    const fenetre = launchWindow(at(1), LAUNCH);

    expect(isDiscounted(CATALOG.chest_pack_small, at(1), fenetre)).toBe(true);
    expect(isDiscounted(CATALOG.royal_chest, at(1), fenetre)).toBe(true);

    // Étendre la remise à tout le catalogue en ferait un solde général, ce qui
    // n'est pas ce que le bandeau annonce.
    expect(isDiscounted(CATALOG.berries_pouch, at(1), fenetre)).toBe(false);
    expect(isDiscounted(CATALOG.character_shanks, at(1), fenetre)).toBe(false);
  });

  it('applique exactement la remise annoncée', () => {
    const fenetre = launchWindow(at(1), LAUNCH);
    const plein = CATALOG.chest_pack_large.priceCents;

    expect(effectivePriceCents(CATALOG.chest_pack_large, at(1), fenetre)).toBe(
      Math.floor(plein * (1 - LAUNCH_DISCOUNT)),
    );
  });

  it('n’arrondit jamais au-dessus du prix affiché', () => {
    // Un prix promotionnel supérieur d'un centime au prix barré serait une
    // faute visible par le seul client qui compte : celui qui paie.
    const fenetre = launchWindow(at(1), LAUNCH);

    for (const produit of Object.values(CATALOG)) {
      expect(
        effectivePriceCents(produit, at(1), fenetre),
      ).toBeLessThanOrEqual(produit.priceCents);
    }
  });

  it('revient au prix plein une fois l’offre passée', () => {
    const apres = at(24 * 8);
    const fenetre = launchWindow(apres, LAUNCH);

    expect(effectivePriceCents(CATALOG.chest_pack_small, apres, fenetre)).toBe(
      CATALOG.chest_pack_small.priceCents,
    );
  });
});
