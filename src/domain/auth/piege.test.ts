import { describe, expect, it } from 'vitest';
import { PIEGE_CHAMP, estUnRobot } from './piege';

describe('piège à robots', () => {
  it('laisse passer un champ vide ou absent', () => {
    expect(estUnRobot(null)).toBe(false);
    expect(estUnRobot('')).toBe(false);
    // Un navigateur peut envoyer des espaces sur un champ jamais touché.
    expect(estUnRobot('   ')).toBe(false);
  });

  it('condamne toute valeur remplie', () => {
    expect(estUnRobot('Acme')).toBe(true);
  });

  it('ne porte pas un nom qui se devine', () => {
    // Un champ nommé « piege » ou « honeypot » se contourne à la lecture du
    // document. Le nom doit ressembler à un vrai champ de formulaire.
    expect(PIEGE_CHAMP).not.toMatch(/piege|honeypot|trap|bot/i);
  });
});
