/**
 * Les îles du produit, et ce qui les rend reconnaissables.
 *
 * Chaque destination emprunte la direction artistique d'un arc. Une première
 * version se contentait d'un dégradé de ciel et d'un motif de points : la
 * teinte changeait, mais rien ne disait *où* l'on était. Une île se reconnaît
 * à sa silhouette, pas à sa couleur.
 *
 * ## Ce que cette table contient
 *
 * Le **découpage par route**, les **noms** affichés, et la liste des
 * **éléments** dessinés pour chaque île. Cette liste n'est pas décorative : elle
 * est la spécification de `components/islands/IslandDecor.tsx`, et sert à
 * vérifier qu'un décor n'a pas dérivé de ce qu'il prétend représenter.
 *
 * ## Contrainte §122
 *
 * Aucun visuel de l'œuvre. Ce sont des **silhouettes géométriques** — un torii
 * est deux montants et deux traverses, une pagode est trois trapèzes
 * empilés — dessinées en SVG et en dégradés CSS. Rien n'est décalqué, rien
 * n'est téléchargé.
 *
 * ## Contrainte de lisibilité
 *
 * Les palettes restent **claires**. Le texte des pages intérieures est en encre
 * marine ; l'Île des hommes-poissons est à dix mille mètres de fond, mais la
 * peindre en abysses rendrait la page illisible. On garde la lumière de la
 * Forêt aux Coraux plutôt que l'obscurité de la fosse.
 */

export type IslandId =
  | 'harbor'
  | 'alabasta'
  | 'drum'
  | 'dressrosa'
  | 'fishman'
  | 'wano'
  | 'logue'
  | 'sabaody'
  | 'hq';

export interface Island {
  id: IslandId;
  /** Nom affiché, quand la page le mentionne. */
  name: string;
  /** Éléments réellement dessinés. Sert de cahier des charges au décor. */
  elements: readonly string[];
}

export const ISLANDS: Record<IslandId, Island> = {
  harbor: {
    id: 'harbor',
    name: 'Le port, à l’aube',
    elements: [
      'soleil levant et rayons tournants',
      'mer et deux rangs de vagues',
      'pont de bois, mât et cordage',
      'chapeau de paille et Éternal Pose posés sur les planches',
    ],
  },

  dressrosa: {
    id: 'dressrosa',
    name: 'Dressrosa',
    elements: [
      'arcades du Colisée Corrida',
      'toits de tuiles en enfilade, à l’espagnole',
      'moulins à vent des collines',
      'confettis et pétales en suspension',
      'champ de fleurs au premier plan',
    ],
  },

  fishman: {
    id: 'fishman',
    name: 'L’Île des hommes-poissons',
    elements: [
      'rayons de lumière filtrés depuis la surface',
      'bulle géante qui enferme l’île',
      'racines et couronne de l’Arbre Eve',
      'coraux et anémones',
      'chapelets de bulles qui montent',
      'bancs de poissons en silhouette',
    ],
  },

  wano: {
    id: 'wano',
    name: 'Le Pays des Wa',
    elements: [
      'torii rouge',
      'toits de pagode à trois étages',
      'mont enneigé au lointain',
      'cerisiers et pétales portés par le vent',
      'lanternes suspendues',
    ],
  },

  logue: {
    id: 'logue',
    name: 'Logue Town',
    elements: [
      'échafaud de pierre, place centrale',
      'toits de tuiles et cheminées du port',
      'phare et girouette',
      'ciel d’orage, éclair lointain',
      'gouttes de pluie',
    ],
  },

  sabaody: {
    id: 'sabaody',
    name: 'L’archipel de Sabaody',
    elements: [
      'troncs de mangroves géantes',
      'racines aériennes qui plongent',
      'bulles de résine, grandes et irisées',
      'feuillage haut qui filtre la lumière',
    ],
  },

  alabasta: {
    id: 'alabasta',
    name: 'Alabasta',
    elements: [
      'dunes en enfilade',
      'palais aux dômes et à l’obélisque',
      'palmiers isolés',
      'sable poussé par le vent, en continu',
    ],
  },

  drum: {
    id: 'drum',
    name: 'Le royaume de Drum',
    elements: [
      'sommets enneigés des Drum Rockies',
      'château perché sur la crête',
      'sapins alourdis de neige',
      'neige qui tombe, en continu',
    ],
  },

  hq: {
    id: 'hq',
    name: 'Poste de commandement',
    elements: [
      'aucun décor : on a quitté le jeu',
      'gris neutre, pour que la rupture se voie',
    ],
  },
};

/**
 * Île d'une route. L'ordre compte : le plus spécifique d'abord.
 *
 * Table unique, partagée par le décor (rendu côté serveur, page par page) et
 * par la palette (posée côté client sur la coquille). Deux tables auraient fini
 * par diverger, et l'on aurait vu Wano avec le ciel de Dressrosa.
 */
const ROUTES: readonly (readonly [string, IslandId])[] = [
  ['/classement', 'dressrosa'],
  ['/collection', 'fishman'],
  ['/market', 'wano'],
  ['/boutique', 'logue'],
  ['/profil', 'sabaody'],
  // Paramètres et profil partageaient Sabaody : deux pages, une seule
  // identité. Drum donne à l'écran de réglages la sienne — et la neige qui
  // tombe est ce qui va le mieux à une page où l'on ne fait que régler.
  ['/parametres', 'drum'],
  ['/admin', 'hq'],
];

export function islandOf(pathname: string): IslandId {
  for (const [prefix, island] of ROUTES) {
    if (pathname.startsWith(prefix)) return island;
  }
  // L'accueil : Alabasta. C'est la page où l'on compose son équipage, la plus
  // fréquentée, et la seule qui n'avait aucune île à elle — le décor du port
  // appartient à l'écran de connexion.
  return pathname === '/' ? 'alabasta' : 'harbor';
}
