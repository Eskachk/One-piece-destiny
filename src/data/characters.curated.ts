/**
 * Personnages écrits à la main — **source de vérité éditoriale**.
 *
 * Ce fichier est la base sur laquelle `scripts/import-characters.mjs` greffe
 * l'import. Le séparer rend la régénération idempotente : une première version
 * relisait `characters.ts`, donc le second passage prenait le résultat de
 * l'import pour de la saisie manuelle et ne changeait plus rien.
 *
 * Leurs liens narratifs — mentorat, rivalité, famille — demandent une lecture
 * de l'œuvre (§9.2) et ne se déduisent d'aucune donnée d'API.
 *
 * Ce fichier ne contient que des données saisies à la main : identifiants,
 * affiliations et liens narratifs. Aucun visuel ni aucune page de manga n'est
 * embarqué (cahier §122) — l'illustration est un placeholder généré.
 *
 * `presenceExpectation` est une estimation éditoriale révisée chaque semaine.
 * `rarity` sert uniquement la collection, jamais le score (cahier §25).
 */

import type { Character } from '../domain/types';

export const CURATED_CHARACTERS: Character[] = [
  {
    id: 'luffy',
    name: 'Monkey D. Luffy',
    rarity: 'LEGENDARY',
    affiliations: ['Mugiwara', 'Worst Generation'],
    relations: [
      { to: 'zoro', kind: 'CREW' },
      { to: 'nami', kind: 'CREW' },
      { to: 'sanji', kind: 'CREW' },
      { to: 'law', kind: 'ALLIANCE' },
      { to: 'koby', kind: 'FAMILY' },
    ],
    abilities: ['Haki des Rois', 'Fruit du démon'],
    presenceExpectation: 'HIGH',
  },
  {
    id: 'zoro',
    name: 'Roronoa Zoro',
    rarity: 'LEGENDARY',
    affiliations: ['Mugiwara', 'Worst Generation'],
    relations: [
      { to: 'luffy', kind: 'CREW' },
      { to: 'sanji', kind: 'RIVALRY' },
      { to: 'mihawk', kind: 'MENTOR' },
    ],
    abilities: ['Haki armement', 'Trois sabres'],
    presenceExpectation: 'HIGH',
  },
  {
    id: 'nami',
    name: 'Nami',
    rarity: 'EPIC',
    affiliations: ['Mugiwara'],
    relations: [
      { to: 'luffy', kind: 'CREW' },
      { to: 'robin', kind: 'CREW' },
    ],
    abilities: ['Navigation', 'Climat'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'sanji',
    name: 'Vinsmoke Sanji',
    rarity: 'EPIC',
    affiliations: ['Mugiwara', 'Germa'],
    relations: [
      { to: 'luffy', kind: 'CREW' },
      { to: 'zoro', kind: 'RIVALRY' },
    ],
    abilities: ['Haki observation', 'Combat'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'robin',
    name: 'Nico Robin',
    rarity: 'EPIC',
    affiliations: ['Mugiwara'],
    relations: [
      { to: 'luffy', kind: 'CREW' },
      { to: 'nami', kind: 'CREW' },
    ],
    abilities: ['Fruit du démon', 'Archéologie'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'chopper',
    name: 'Tony Tony Chopper',
    rarity: 'RARE',
    affiliations: ['Mugiwara'],
    relations: [{ to: 'luffy', kind: 'CREW' }],
    abilities: ['Médecine', 'Fruit du démon'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'usopp',
    name: 'Usopp',
    rarity: 'RARE',
    affiliations: ['Mugiwara', 'Grand Fleet'],
    relations: [
      { to: 'luffy', kind: 'CREW' },
      { to: 'bartolomeo', kind: 'ALLIANCE' },
    ],
    abilities: ['Haki observation', 'Tir'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'jinbe',
    name: 'Jinbe',
    rarity: 'EPIC',
    affiliations: ['Mugiwara'],
    relations: [{ to: 'luffy', kind: 'CREW' }],
    abilities: ['Haki armement', 'Combat'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'law',
    name: 'Trafalgar Law',
    rarity: 'LEGENDARY',
    affiliations: ['Heart Pirates', 'Worst Generation'],
    relations: [
      { to: 'luffy', kind: 'ALLIANCE' },
      { to: 'kid', kind: 'RIVALRY' },
    ],
    abilities: ['Haki armement', 'Fruit du démon'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'kid',
    name: 'Eustass Kid',
    rarity: 'EPIC',
    affiliations: ['Kid Pirates', 'Worst Generation'],
    relations: [{ to: 'law', kind: 'RIVALRY' }],
    abilities: ['Haki armement', 'Fruit du démon'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'bonney',
    name: 'Jewelry Bonney',
    rarity: 'EPIC',
    affiliations: ['Worst Generation'],
    relations: [{ to: 'kuma', kind: 'FAMILY' }],
    abilities: ['Fruit du démon'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'kuma',
    name: 'Bartholomew Kuma',
    rarity: 'LEGENDARY',
    affiliations: ['Révolutionnaires'],
    relations: [
      { to: 'bonney', kind: 'FAMILY' },
      { to: 'dragon', kind: 'FACTION' },
    ],
    abilities: ['Fruit du démon'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'dragon',
    name: 'Monkey D. Dragon',
    rarity: 'LEGENDARY',
    affiliations: ['Révolutionnaires'],
    relations: [
      { to: 'luffy', kind: 'FAMILY' },
      { to: 'sabo', kind: 'FACTION' },
    ],
    abilities: ['Inconnu'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'sabo',
    name: 'Sabo',
    rarity: 'EPIC',
    affiliations: ['Révolutionnaires'],
    relations: [
      { to: 'luffy', kind: 'FAMILY' },
      { to: 'dragon', kind: 'FACTION' },
    ],
    abilities: ['Haki des Rois', 'Fruit du démon'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'koby',
    name: 'Koby',
    rarity: 'RARE',
    affiliations: ['Marine', 'SWORD'],
    relations: [
      { to: 'luffy', kind: 'FAMILY' },
      { to: 'garp', kind: 'MENTOR' },
      { to: 'helmeppo', kind: 'CREW' },
    ],
    abilities: ['Haki observation'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'helmeppo',
    name: 'Helmeppo',
    rarity: 'COMMON',
    affiliations: ['Marine', 'SWORD'],
    relations: [{ to: 'koby', kind: 'CREW' }],
    abilities: ['Combat'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'garp',
    name: 'Monkey D. Garp',
    rarity: 'LEGENDARY',
    affiliations: ['Marine'],
    relations: [
      { to: 'koby', kind: 'MENTOR' },
      { to: 'luffy', kind: 'FAMILY' },
      { to: 'akainu', kind: 'FACTION' },
    ],
    abilities: ['Haki armement'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'akainu',
    name: 'Sakazuki',
    rarity: 'LEGENDARY',
    affiliations: ['Marine'],
    relations: [{ to: 'garp', kind: 'FACTION' }],
    abilities: ['Fruit du démon', 'Haki armement'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'mihawk',
    name: 'Dracule Mihawk',
    rarity: 'LEGENDARY',
    affiliations: ['Cross Guild'],
    relations: [
      { to: 'zoro', kind: 'MENTOR' },
      { to: 'buggy', kind: 'ALLIANCE' },
      { to: 'crocodile', kind: 'ALLIANCE' },
    ],
    abilities: ['Haki armement', 'Escrime'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'buggy',
    name: 'Buggy',
    rarity: 'EPIC',
    affiliations: ['Cross Guild'],
    relations: [
      { to: 'mihawk', kind: 'ALLIANCE' },
      { to: 'crocodile', kind: 'ALLIANCE' },
    ],
    abilities: ['Fruit du démon'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'crocodile',
    name: 'Crocodile',
    rarity: 'EPIC',
    affiliations: ['Cross Guild'],
    relations: [
      { to: 'mihawk', kind: 'ALLIANCE' },
      { to: 'buggy', kind: 'ALLIANCE' },
    ],
    abilities: ['Fruit du démon'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'bartolomeo',
    name: 'Bartolomeo',
    rarity: 'RARE',
    affiliations: ['Grand Fleet'],
    relations: [
      { to: 'usopp', kind: 'ALLIANCE' },
      { to: 'luffy', kind: 'ALLIANCE' },
    ],
    abilities: ['Fruit du démon'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'shanks',
    name: 'Shanks',
    rarity: 'MYTHIC',
    affiliations: ['Red Hair Pirates', 'Yonko'],
    relations: [{ to: 'luffy', kind: 'MENTOR' }],
    abilities: ['Haki des Rois', 'Escrime'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'perona',
    name: 'Perona',
    rarity: 'RARE',
    affiliations: ['Cross Guild'],
    relations: [{ to: 'mihawk', kind: 'FACTION' }],
    abilities: ['Fruit du démon'],
    presenceExpectation: 'LOW',
  },
];

/** Index par identifiant, utilisé par le moteur de score. */
