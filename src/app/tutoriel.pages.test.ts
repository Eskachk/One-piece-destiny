import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TUTORIELS, type PageTutoriel } from '@/domain/tutoriel';

/**
 * Garde-fou : chaque onglet du jeu montre sa visite guidée, dans **toutes**
 * ses branches de rendu.
 *
 * ## Le défaut que ce test attrape, et qui s'est déjà produit
 *
 * Les pages sortent par plusieurs `return` : le classement en a trois — aucun
 * chapitre publié, verrou anti-spoiler, rendu normal — et le marché deux.
 * C'est exactement la forme qui avait rendu les ligues privées injoignables :
 * le panneau n'était rendu que dans le dernier retour, donc invisible pendant
 * toute la semaine où l'on en avait besoin.
 *
 * Une visite guidée oubliée dans une branche a la même conséquence, en pire :
 * elle manquerait précisément au joueur qui arrive avant le premier chapitre,
 * c'est-à-dire au joueur le plus neuf du jeu.
 *
 * Le test lit la source. C'est grossier, et c'est assumé : le défaut n'est pas
 * dans une fonction, il est dans la forme du composant, et rien de plus fin ne
 * l'attraperait.
 */

const ONGLETS: { page: PageTutoriel; fichier: string }[] = [
  { page: 'accueil', fichier: 'page.tsx' },
  { page: 'classement', fichier: 'classement/page.tsx' },
  { page: 'collection', fichier: 'collection/page.tsx' },
  { page: 'market', fichier: 'market/page.tsx' },
  { page: 'boutique', fichier: 'boutique/page.tsx' },
  { page: 'profil', fichier: 'profil/page.tsx' },
];

const lire = (fichier: string) => readFileSync(join(__dirname, fichier), 'utf8');

describe('visites guidées, une par onglet', () => {
  it('couvre les six onglets, sans en inventer un septième', () => {
    expect(ONGLETS.map((o) => o.page).sort()).toEqual(Object.keys(TUTORIELS.fr).sort());
  });

  it.each(ONGLETS)('$page rend sa visite dans chaque branche', ({ page, fichier }) => {
    const source = lire(fichier);

    // Une branche = un rendu où le joueur voit la barre de navigation. Compter
    // les `return` serait fragile ; la barre, elle, est présente dans chaque
    // sortie réelle de la page et dans aucune autre.
    const branches = source.split('<Nav />').length - 1;
    const visites = source.split(`<Tutorial page="${page}" />`).length - 1;

    expect(branches, `${fichier} : aucune barre de navigation trouvée`).toBeGreaterThanOrEqual(1);
    expect(visites, `${fichier} : ${visites} visite(s) pour ${branches} branche(s)`).toBe(branches);
  });

  it.each(ONGLETS)('$page ne nomme pas la visite d’un autre onglet', ({ page, fichier }) => {
    // Un copier-coller entre deux pages donnerait au joueur la visite du
    // marché sur la boutique, sans que rien ne casse : la page s'afficherait,
    // le texte serait faux, et la clé de stockage aussi — la vraie visite ne
    // se rouvrirait jamais.
    const source = lire(fichier);
    for (const autre of Object.keys(TUTORIELS.fr)) {
      if (autre === page) continue;
      expect(source.includes(`<Tutorial page="${autre}" />`), `${fichier} → ${autre}`).toBe(false);
    }
  });
});
