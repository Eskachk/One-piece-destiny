'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CardFilters } from './CardFilters';
import {
  CRITERES_PAR_DEFAUT,
  compterParRarete,
  trier,
  type Carte,
} from '@/domain/collection/tri';

/**
 * La collection possédée, avec de quoi la parcourir.
 *
 * ## Pourquoi les cartes arrivent déjà dessinées
 *
 * Chaque carte est rendue **par le serveur** puis passée ici en `ReactNode`.
 * Ce composant ne fait que choisir lesquelles montrer et dans quel ordre ; il
 * ne sait pas les dessiner et n'a pas à le savoir.
 *
 * Ce n'est pas un détail de style. `RarityCard` tire `CharacterArt`, qui tire
 * la table des signatures physiques — cent vingt-cinq descriptions détaillées.
 * Rendre les cartes ici les enverrait toutes au navigateur de chaque joueur,
 * pour un travail que le serveur a déjà fait. Le même piège avait été trouvé
 * dans le sélecteur d'équipage, qui importait le référentiel entier : 235 Ko
 * envoyés pour résoudre trois identifiants.
 *
 * Le tri n'a besoin que du nom et de la rareté. C'est tout ce qui traverse.
 */

export interface CarteRendue extends Carte {
  /** La carte, déjà dessinée par le serveur. */
  vue: ReactNode;
}

export function OwnedCollection({ cartes }: { cartes: CarteRendue[] }) {
  const [criteres, setCriteres] = useState(CRITERES_PAR_DEFAUT);

  const comptes = useMemo(() => compterParRarete(cartes), [cartes]);
  const visibles = useMemo(() => trier(cartes, criteres), [cartes, criteres]);

  return (
    <>
      <CardFilters
        criteres={criteres}
        onChange={setCriteres}
        comptes={comptes}
        total={cartes.length}
        affiches={visibles.length}
      />

      {visibles.length === 0 ? (
        <p className="hb-card mt-3 text-sm">
          Aucune carte ne correspond. Essaie un autre nom, ou remets la rareté
          sur « Toutes ».
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visibles.map((carte) => (
            <li key={carte.id}>{carte.vue}</li>
          ))}
        </ul>
      )}
    </>
  );
}
