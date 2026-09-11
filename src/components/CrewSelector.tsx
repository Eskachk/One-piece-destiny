'use client';

import { CardFilters } from './CardFilters';
import type { Recurrence } from '@/domain/chapter/recurrence';
import { useT } from '@/components/LocaleProvider';
import { decrireRecurrenceT, libellePresence, libelleRarete } from '@/domain/i18n/libelles';
import {
  CRITERES_PAR_DEFAUT,
  comptesParAttribut,
  compterParRarete,
  trier,
  type GroupeAttributs,
} from '@/domain/collection/tri';
import { attempt } from './attempt';
import Link from 'next/link';

import { useMemo, useState, useTransition } from 'react';
import { saveCrew } from '@/app/actions/crew';
import { teamRisk, type RiskBand } from '@/domain/risk';
import type { Character } from '@/domain/types';

/**
 * Sélection de l'équipage (cahier §55).
 *
 * La hiérarchie UX est Action → Information → Stratégie → Détail (§110) :
 * on voit d'abord les 3 emplacements, puis ce qu'ils impliquent.
 *
 * Aucune fonctionnalité ne dépend du survol (§59) et rien ici ne révèle de
 * donnée post-chapitre (§3).
 */

const CREW_SIZE = 3;

const RISK_STYLES: Record<RiskBand, { label: string; className: string }> = {
  SAFE: { label: 'SAFE', className: 'hb-risk hb-risk--safe' },
  LOW: { label: 'LOW', className: 'hb-risk hb-risk--safe' },
  MEDIUM: { label: 'MEDIUM', className: 'hb-risk hb-risk--mid' },
  HIGH: { label: 'HIGH', className: 'hb-risk hb-risk--high' },
  EXTREME: { label: 'EXTREME', className: 'hb-risk hb-risk--max' },
};

/**
 * Un personnage possédé, augmenté de ses attributs.
 *
 * Les attributs sont calculés par le serveur et voyagent en identifiants
 * courts. Ils ne sont pas rangés dans `Character` : c'est un type de domaine,
 * et ceci est une commodité d'affichage.
 */
export type PersonnagePossede = Character & {
  attributs?: readonly string[];
  /**
   * Présence dans les derniers chapitres publiés.
   *
   * C'est **l'information qui décide** sur cet écran. Le joueur y choisit trois
   * personnages pour la semaine à venir ; sans savoir lesquels paraissent
   * d'habitude, il tire au sort.
   */
  recurrence?: Recurrence;
};

export function CrewSelector({
  locked,
  savedCrewIds = [],
  authenticated = false,
  chapterNumber,
  owned,
  attributs = [],
}: {
  locked: boolean;
  /** Équipage déjà enregistré, rendu côté serveur. */
  savedCrewIds?: string[];
  /** Un équipage ne peut être enregistré que par un joueur connecté. */
  authenticated?: boolean;
  chapterNumber: number;
  /**
   * Personnages **possédés**, seuls alignables.
   *
   * Fournis par le serveur : la liste n'est pas dérivée côté client, et le
   * serveur revalide de toute façon la propriété à l'enregistrement — ce que
   * le navigateur affiche n'a jamais valeur d'autorisation (§99).
   */
  owned: PersonnagePossede[];
  /**
   * Catalogue des pastilles de filtre, construit par le serveur.
   *
   * Il ne se déduit pas ici : `attributesOf` tire la table des signatures
   * physiques, trois mille lignes qu'un composant client n'a aucune raison de
   * recevoir — c'est le même piège que l'import de `CHARACTER_INDEX` corrigé
   * plus haut.
   */
  attributs?: GroupeAttributs[];
}) {
  // L'équipage enregistré est résolu depuis `owned`, pas depuis le
  // référentiel complet.
  //
  // Ce composant importait `CHARACTER_INDEX`, ce qui embarquait les 790
  // personnages dans le bundle client — 235 Ko envoyés à chaque joueur pour
  // résoudre trois identifiants. Un composant client ne doit recevoir que ce
  // dont il a besoin.
  const [crew, setCrew] = useState<Character[]>(() => {
    const byId = new Map(owned.map((character) => [character.id, character]));
    return savedCrewIds
      .map((id) => byId.get(id))
      .filter((c): c is Character => c !== undefined);
  });
  const [picking, setPicking] = useState(false);
  const [criteres, setCriteres] = useState(CRITERES_PAR_DEFAUT);
  const [feedback, setFeedback] = useState<
    { kind: 'ok' | 'error'; message: string } | null
  >(null);
  const { t, tn, tradMessage } = useT();
  const [pending, startTransition] = useTransition();

  const risk = useMemo(() => teamRisk(crew), [crew]);
  const comptes = useMemo(
    () => compterParRarete(owned, criteres),
    [owned, criteres],
  );
  const visibles = useMemo(() => trier(owned, criteres), [owned, criteres]);
  const comptesAttributs = useMemo(
    () => comptesParAttribut(owned, criteres),
    [owned, criteres],
  );
  const complete = crew.length === CREW_SIZE;

  const toggle = (character: Character) => {
    if (locked) return;
    setFeedback(null);
    setCrew((current) => {
      if (current.some((c) => c.id === character.id)) {
        return current.filter((c) => c.id !== character.id);
      }
      if (current.length >= CREW_SIZE) return current;
      return [...current, character];
    });
  };

  const submit = () => {
    startTransition(async () => {
      // Le serveur revalide tout : composition, existence des personnages et
      // échéance. Cette vérification-ci n'est que du confort d'interface.
      const result = await attempt(saveCrew(crew.map((c) => c.id)));
      setFeedback(
        result.ok
          ? { kind: 'ok', message: t('crew.saved') }
          : { kind: 'error', message: tradMessage(result.error) ?? result.error },
      );
    });
  };

  return (
    <section className="mt-8">
      <h2 className="hb-title mt-6" style={{ fontSize: '1.55rem' }}>{t('crew.title')}</h2>
      <p className="hb-muted mt-1 text-sm">{t('crew.subtitle')}</p>

      {/* Les 3 emplacements — l'action avant tout le reste. */}
      <ul className="mt-5 grid grid-cols-3 gap-3 md:grid-cols-6">
        {Array.from({ length: CREW_SIZE }, (_, slot) => {
          const character = crew[slot];
          return (
            <li key={slot}>
              <button
                type="button"
                onClick={() => (character ? toggle(character) : setPicking(true))}
                disabled={locked}
                className="hb-slot"
              >
                {character ? (
                  <>
                    <span className="text-sm font-bold">
                      {character.name}
                    </span>
                    <span className="hb-legend mt-1">
                      {libelleRarete(t, character.rarity)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl" style={{ color: 'rgba(20,41,79,.28)' }}>???</span>
                    <span className="hb-legend mt-2">
                      {t('crew.slot.pick')}
                    </span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Risk Meter (cahier §11) — calculé uniquement sur des données
          d'avant-chapitre, donc sans spoiler possible. */}
      {crew.length > 0 && (
        <div className="hb-card mt-5">
          <div className="flex items-baseline justify-between">
            <span className="hb-legend">
              {t('crew.risk')}
            </span>
            <span
              className={`font-mono text-sm font-bold ${RISK_STYLES[risk.band].className}`}
            >
              {RISK_STYLES[risk.band].label}
            </span>
          </div>
          <div
            className="hb-gauge mt-3"
            role="meter"
            aria-valuenow={risk.value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('crew.risk.aria')}
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-turquoise via-treasure to-danger"
              style={{ width: `${risk.value}%` }}
            />
          </div>

          <ul className="hb-muted mt-3 space-y-1 text-xs">
            {crew.map((character) => (
              <li key={character.id} className="flex justify-between">
                <span>{character.name}</span>
                <span className="hb-muted">
                  {t('crew.risk.presence', {
                    niveau: libellePresence(t, character.presenceExpectation).toLowerCase(),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!locked && !authenticated && (
        <p className="hb-card mt-4 text-center text-sm">
          <Link href="/login" className="hb-link">
            {t('crew.signInToSave')}
          </Link>{' '}
          {t('crew.signInToSaveRest')}
        </p>
      )}

      {!locked && authenticated && (
        <div className="mt-5">
          <button
            type="button"
            onClick={submit}
            disabled={!complete || pending}
            aria-busy={pending}
            className="hb-btn mt-4"
          >
            {pending ? t('crew.saving') : t('crew.save')}
          </button>
          {!complete && (
            <p className="hb-muted mt-2 text-center text-xs">
              {tn('crew.pickMore', CREW_SIZE - crew.length)}
            </p>
          )}
        </div>
      )}

      {/* Partage de la prédiction (cahier §69). La carte ne montre aucun
          score : elle circule avant la sortie du chapitre. */}
      {feedback?.kind === 'ok' && complete && (
        <Link
          href={`/share/${chapterNumber}/${crew.map((c) => c.id).join(',')}`}
          className="hb-btn hb-btn--ghost mt-3"
        >
          {t('crew.share')}
        </Link>
      )}

      {feedback && (
        <p
          role="status"
          className={`mt-3 text-center text-sm ${
            feedback.kind === 'ok' ? 'hb-ok' : 'hb-ko'
          }`}
        >
          {feedback.message}
        </p>
      )}

      {/* Roster. Ouvert à la demande pour garder la home simple (§55). */}
      {picking && !locked && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="hb-legend">
              {t('crew.roster', { n: owned.length })}
            </h3>
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="hb-link text-xs"
            >
              {t('crew.roster.close')}
            </button>
          </div>
          {owned.length === 0 ? (
            <p className="hb-card mt-3 text-sm">{t('crew.roster.empty')}</p>
          ) : owned.length <= CREW_SIZE ? (
            <p className="hb-muted mt-3 text-xs">
              {tn('crew.roster.few', owned.length, { slots: CREW_SIZE })}
            </p>
          ) : null}

          {/* La recherche n'apparaît qu'au-delà d'une poignée de cartes :
              trois filtres au-dessus de quatre personnages occupent plus de
              place que ce qu'ils servent à trouver. */}
          {owned.length > 8 && (
            <CardFilters
              criteres={criteres}
              onChange={setCriteres}
              comptes={comptes}
              total={owned.length}
              affiches={visibles.length}
              nom="character"
              attributs={attributs}
              comptesAttributs={comptesAttributs}
            />
          )}

          {visibles.length === 0 && owned.length > 0 && (
            <p className="hb-card mt-3 text-sm">{t('crew.roster.noMatch')}</p>
          )}

          <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {visibles.map((character) => {
              const selected = crew.some((c) => c.id === character.id);
              const full = crew.length >= CREW_SIZE && !selected;
              return (
                <li key={character.id}>
                  <button
                    type="button"
                    onClick={() => toggle(character)}
                    disabled={full}
                    aria-pressed={selected}
                    className={`hb-pick${selected ? ' hb-pick--on' : ''}`}
                  >
                    <span className="block text-sm font-semibold">
                      {character.name}
                    </span>
                    <span className="hb-legend mt-0.5 block">
                      {libelleRarete(t, character.rarity)}
                    </span>
                    {/* Le rapport se lit d'un coup d'œil et sert à comparer
                        deux candidats ; la phrase complète reste pour qui
                        écoute la page (§111). */}
                    {character.recurrence && character.recurrence.observes > 0 && (
                      <span
                        className={`hb-recurrence${character.recurrence.vus === 0 ? ' hb-recurrence--nulle' : ''}`}
                        title={decrireRecurrenceT(t, character.recurrence)}
                      >
                        <span aria-hidden="true">
                          📖 {character.recurrence.vus}/{character.recurrence.observes}
                        </span>
                        <span className="sr-only">
                          {decrireRecurrenceT(t, character.recurrence)}
                        </span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
