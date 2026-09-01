import { describe, expect, it } from 'vitest';
import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  canonicalHandle,
  checkHandle,
  fallbackHandle,
  normalizeHandle,
} from './handle';

describe('pseudo de joueur', () => {
  it('accepte un pseudo ordinaire', () => {
    expect(checkHandle('Shanks').valid).toBe(true);
    expect(checkHandle('zoro.main').valid).toBe(true);
    expect(checkHandle('Océane_92').valid).toBe(true);
  });

  it('accepte les accents', () => {
    // Refuser « Océane » dans un produit francophone serait absurde.
    expect(checkHandle('Aurélie').valid).toBe(true);
    expect(checkHandle('Frédéric-1').valid).toBe(true);
  });

  it('borne la longueur', () => {
    expect(checkHandle('a'.repeat(HANDLE_MIN_LENGTH - 1)).issue).toBe('TOO_SHORT');
    expect(checkHandle('a'.repeat(HANDLE_MAX_LENGTH + 1)).issue).toBe('TOO_LONG');
  });

  it('refuse la ponctuation aux extrémités', () => {
    expect(checkHandle('.shanks').issue).toBe('EDGES');
    expect(checkHandle('shanks_').issue).toBe('EDGES');
  });

  it('refuse ce qui usurperait une autorité du produit', () => {
    // Un joueur nommé « Admin » sur une annonce du Marché est une usurpation à
    // coût nul.
    expect(checkHandle('admin').issue).toBe('RESERVED');
    expect(checkHandle('Mod.era.teur').issue).toBe('RESERVED');
    expect(checkHandle('S-U-P-P-O-R-T').issue).toBe('RESERVED');

    // Les noms de l'œuvre, eux, ne trompent personne.
    expect(checkHandle('Luffy').valid).toBe(true);
  });

  it('compresse les espaces plutôt que de refuser la saisie', () => {
    expect(normalizeHandle('  Roi  des  mers  ')).toBe('Roidesmers');
    expect(checkHandle(' Nico Robin ').valid).toBe(true);
  });

  it('rend identiques les pseudos qui se lisent pareil', () => {
    // C'est ce qui empêche `Sh_anks` de se faire passer pour `Shanks` sur une
    // annonce du Marché.
    expect(canonicalHandle('Shanks')).toBe(canonicalHandle('S-h-a-n-k-s'));
    expect(canonicalHandle('Océane')).toBe(canonicalHandle('oceane'));
    expect(canonicalHandle('zoro.main')).toBe(canonicalHandle('ZoroMain'));
  });

  it('distingue deux pseudos réellement différents', () => {
    expect(canonicalHandle('nami')).not.toBe(canonicalHandle('nano'));
  });

  it('tire un pseudo de repli qui ne vient pas de l’adresse e-mail', () => {
    // Le pseudo est public ; l'adresse ne l'est pas. Le repli de la connexion
    // Google ne doit rien en reprendre.
    let graine = 0;
    const random = () => {
      graine += 0.37;
      return graine % 1;
    };

    for (let i = 0; i < 50; i += 1) {
      const pseudo = fallbackHandle(random);
      expect(checkHandle(pseudo).valid, pseudo).toBe(true);
      expect(pseudo).not.toContain('@');
    }
  });
});
