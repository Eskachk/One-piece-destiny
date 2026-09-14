import { describe, expect, it } from 'vitest';
import { masquerEmail } from './masquage';

describe('masquerEmail', () => {
  it('garde deux lettres et le domaine', () => {
    expect(masquerEmail('amine.capitaine@gmail.com')).toBe('am•••@gmail.com');
  });

  it('ne garde qu’une lettre sur une partie locale courte', () => {
    expect(masquerEmail('abc@x.fr')).toBe('a•••@x.fr');
  });

  it('ne laisse rien passer d’une adresse malformée', () => {
    expect(masquerEmail('pas-une-adresse')).toBe('•••');
    expect(masquerEmail('@domaine.fr')).toBe('•••');
  });

  it('rend null pour rien', () => {
    expect(masquerEmail(null)).toBeNull();
    expect(masquerEmail(undefined)).toBeNull();
    expect(masquerEmail('')).toBeNull();
  });
});
