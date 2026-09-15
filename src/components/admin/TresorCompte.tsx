'use client';

import { useState, useTransition } from 'react';
import { ajusterTresorAction } from '@/app/actions/admin';
import { CHARACTER_INDEX } from '@/data/characters';
import type { Tresor } from '@/lib/admin/tresor';

/**
 * Le trésor d'un compte, et le formulaire pour l'ajuster.
 *
 * Deux moitiés. En haut, ce que le compte détient — c'est ce qu'on regarde
 * quand un joueur signale un bug de duplication, ou quand on soupçonne un
 * compte d'en profiter. En bas, l'ajustement : des quantités **relatives**
 * (« −3 coffres », pas « 4 coffres »), un motif obligatoire, et le résultat
 * de l'action affiché tel que le serveur le renvoie — solde compris.
 *
 * Le formulaire demande confirmation avant de reprendre quoi que ce soit :
 * une reprise se remarque tout de suite côté joueur, et n'a pas de bouton
 * « annuler ».
 */
const RARETES: [string, string][] = [
  ['COMMON', 'communs'],
  ['RARE', 'rares'],
  ['EPIC', 'épiques'],
  ['LEGENDARY', 'légendaires'],
  ['MYTHIC', 'mythiques'],
];

export function TresorCompte({ playerId, tresor }: { playerId: string; tresor: Tresor }) {
  const [berries, setBerries] = useState('0');
  const [chests, setChests] = useState('0');
  const [royal, setRoyal] = useState('0');
  const [motif, setMotif] = useState('');
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const delta = {
    berries: Number(berries) || 0,
    chests: Number(chests) || 0,
    royalChests: Number(royal) || 0,
  };
  const reprend = delta.berries < 0 || delta.chests < 0 || delta.royalChests < 0;
  const vide = delta.berries === 0 && delta.chests === 0 && delta.royalChests === 0;

  const envoyer = () => {
    if (
      reprend &&
      !window.confirm('Tu vas reprendre une partie du trésor de ce joueur. Confirmer ?')
    ) {
      return;
    }
    startTransition(async () => {
      setRetour(null);
      const result = await ajusterTresorAction(playerId, delta, motif);
      setRetour(result.ok ? { ok: true, texte: result.message } : { ok: false, texte: result.error });
      if (result.ok) {
        setBerries('0');
        setChests('0');
        setRoyal('0');
        setMotif('');
      }
    });
  };

  return (
    <section className="mt-6 rounded-xl border border-treasure/30 bg-navy/40 p-5">
      <h2 className="text-xs uppercase tracking-widest text-parchment/60">Trésor du compte</h2>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div>
          <dt className="text-parchment/60">Berries</dt>
          <dd className="font-mono text-lg text-treasure">{tresor.berries.toLocaleString('fr-FR')}</dd>
          {tresor.pendingBerries > 0 && (
            <dd className="text-[11px] text-parchment/60">
              + {tresor.pendingBerries.toLocaleString('fr-FR')} en attente
            </dd>
          )}
        </div>
        <div>
          <dt className="text-parchment/60">Coffres à ouvrir</dt>
          <dd className="font-mono text-lg text-parchment">{tresor.unopenedChests}</dd>
          <dd className="text-[11px] text-parchment/60">{tresor.chestsOpened} ouverts au total</dd>
        </div>
        <div>
          <dt className="text-parchment/60">Coffres royaux</dt>
          <dd className="font-mono text-lg text-parchment">{tresor.royalChests}</dd>
        </div>
        <div>
          <dt className="text-parchment/60">Fragments</dt>
          <dd className="font-mono text-lg text-parchment">{tresor.shards}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-turquoise/10 bg-abyss/30 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-parchment/90">
            <span className="font-mono">{tresor.cards}</span> cartes
          </span>
          {RARETES.map(([rarete, libelle]) =>
            tresor.cardsByRarity[rarete] ? (
              <span key={rarete} className="text-xs text-parchment/70">
                {tresor.cardsByRarity[rarete]} {libelle}
              </span>
            ) : null,
          )}
          <span className="text-xs text-parchment/70">{tresor.purchases} achat{tresor.purchases > 1 ? 's' : ''} en boutique</span>
        </div>
        {tresor.recent.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-parchment/70">
            {tresor.recent.map((c) => (
              <li key={`${c.characterId}-${c.serialCode ?? c.at}`} className="flex flex-wrap gap-x-3">
                <span className="text-parchment/90">{CHARACTER_INDEX.get(c.characterId)?.name ?? c.characterId}</span>
                {c.serialCode && <span className="font-mono">{c.serialCode}</span>}
                {c.source && <span>{c.source}</span>}
                {c.at && <span className="font-mono">{new Date(c.at).toLocaleDateString('fr-FR')}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-parchment/60">
          Les cartes ne s’ajustent pas ici : chacune a un numéro de série et un
          historique de propriété.
        </p>
      </div>

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
      >
        <h3 className="text-xs uppercase tracking-widest text-parchment/60">
          Ajuster — en plus ou en moins, jamais sous zéro
        </h3>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {(
            [
              ['Berries', berries, setBerries, 100],
              ['Coffres', chests, setChests, 1],
              ['Coffres royaux', royal, setRoyal, 1],
            ] as const
          ).map(([libelle, valeur, poser, pas]) => (
            <label key={libelle} className="block text-xs text-parchment/70">
              {libelle}
              <input
                type="number"
                step={pas}
                value={valeur}
                onChange={(e) => poser(e.target.value)}
                className="mt-1 w-full rounded-lg border border-turquoise/30 bg-abyss/60 px-2 py-1.5 font-mono text-sm text-parchment"
              />
            </label>
          ))}
        </div>
        <label className="mt-3 block text-xs text-parchment/70">
          Motif — obligatoire, journalisé, envoyé au joueur
          <input
            type="text"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            minLength={8}
            maxLength={300}
            placeholder="Ex. : reprise de 12 coffres dupliqués le 14/09 (incident #3)"
            className="mt-1 w-full rounded-lg border border-turquoise/30 bg-abyss/60 px-2 py-1.5 text-sm text-parchment"
          />
        </label>
        <button
          type="submit"
          disabled={pending || vide || motif.trim().length < 8}
          className={`transition-quick mt-3 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-70 ${
            reprend ? 'bg-orange text-abyss' : 'bg-treasure text-abyss'
          }`}
        >
          {pending ? 'Un instant…' : reprend ? 'Reprendre' : 'Donner'}
        </button>
        {retour && (
          <p role="status" className={`mt-3 text-sm ${retour.ok ? 'text-turquoise' : 'text-orange'}`}>
            {retour.texte}
          </p>
        )}
      </form>
    </section>
  );
}
