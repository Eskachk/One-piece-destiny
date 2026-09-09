/**
 * Fabrique toutes les icônes du produit à partir d'une seule image source.
 *
 *     npm run icones
 *
 * ## Pourquoi un script plutôt que sept exports à la main
 *
 * Le jeu a besoin de sept fichiers, à cinq tailles, avec **trois traitements
 * différents** — et chacun a une règle qu'on ne devine pas :
 *
 *   — les icônes `any` et le favicon gardent le carré aux angles arrondis et
 *     ses coins transparents, tels que le navigateur les attend ;
 *   — les icônes `maskable` doivent remplir le carré **jusqu'aux bords** et
 *     tenir leur dessin dans un cercle de sûreté ;
 *   — l'icône Apple et celle du Play Store ne tolèrent **aucune
 *     transparence** : iOS compose sur du noir, et le Play Store refuse le
 *     fichier.
 *
 * Refaits à la main à chaque changement de logo, ces sept fichiers auraient
 * divergé dès la deuxième fois — et l'erreur ne se voit qu'une fois
 * l'application installée sur un téléphone.
 *
 * ## Le cercle de sûreté, et pourquoi 72 %
 *
 * Android rogne jusqu'à 20 % de chaque bord d'une icône masquable pour
 * l'adapter à la forme du lanceur — cercle, goutte, écusson selon le
 * constructeur. Le dessin doit donc tenir dans un cercle de 80 % de diamètre.
 *
 * Mesuré sur la source : les bois du chapeau sont les points les plus
 * éloignés du centre, à 586 px sur 1254. Pour qu'ils restent dans le cercle,
 * la largeur du dessin ne peut pas dépasser 73,7 % de celle de l'icône. D'où
 * 72 % — la marge est mince mais c'est bien une marge, et la calculer valait
 * mieux que de choisir un nombre rond au jugé.
 */
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');
const sharp = createRequire(join(RACINE, 'package.json'))('sharp');

const SOURCE = join(ICI, 'source.png');

/**
 * Le carré arrondi dans la source, et le dessin qu'il contient.
 *
 * Relevés sur `source.png` en cherchant les pixels opaques puis les pixels
 * nettement plus clairs que le fond. Ils sont écrits ici plutôt que
 * recalculés : une nouvelle source demandera de les reprendre, et un chiffre
 * en dur qu'il faut corriger vaut mieux qu'une détection qui se trompe en
 * silence sur une image au cadrage différent.
 */
const CARRE = { left: 50, top: 48, width: 1150, height: 1150 };
const DESSIN = { left: 86, top: 285, width: 1080, height: 686 };

/** Le fond de la source, relevé au pixel : un noir très légèrement bleuté. */
const FOND = { r: 10, g: 9, b: 12 };

/** Le dessin ne dépasse pas 72 % de la largeur — voir l'en-tête. */
const SURETE = 0.72;
/** Apple et le Play Store n'appliquent pas de rognage : le dessin peut respirer. */
const PLEIN = 0.82;

/** Le carré arrondi, coins transparents compris, à la taille demandée. */
async function iconeSimple(taille, sortie) {
  await sharp(SOURCE)
    .extract(CARRE)
    .resize(taille, taille, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(sortie);
  return `${sortie} — carré arrondi, ${taille}px`;
}

/**
 * Un carré plein bord : fond opaque, dessin centré à l'échelle voulue.
 *
 * Ni le Play Store ni iOS n'acceptent la transparence — le premier refuse le
 * fichier, le second composerait sur du blanc. Deux étapes sont nécessaires,
 * et la première seule ne suffit pas : voir le commentaire sur `removeAlpha`.
 */
async function iconePleine(taille, echelle, sortie) {
  const largeur = Math.round(taille * echelle);
  const hauteur = Math.round((largeur * DESSIN.height) / DESSIN.width);

  const dessin = await sharp(SOURCE)
    .extract(DESSIN)
    .resize(largeur, hauteur)
    .png()
    .toBuffer();

  await sharp({
    create: { width: taille, height: taille, channels: 4, background: { ...FOND, alpha: 1 } },
  })
    .composite([
      {
        input: dessin,
        left: Math.round((taille - largeur) / 2),
        top: Math.round((taille - hauteur) / 2),
      },
    ])
    .flatten({ background: FOND })
    // `flatten` compose sur le fond mais **garde le canal alpha**, désormais
    // uniformément opaque. Le Play Store refuse un PNG qui en porte un, même
    // inutile : il faut le retirer explicitement.
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(sortie);

  return `${sortie} — plein bord, ${taille}px, dessin à ${Math.round(echelle * 100)} %`;
}

if (!existsSync(SOURCE)) {
  throw new Error(`Source introuvable : ${SOURCE}`);
}

for (const dossier of ['public/icons', 'src/app', 'android']) {
  mkdirSync(join(RACINE, dossier), { recursive: true });
}
const vers = (...p) => join(RACINE, ...p);

const faits = await Promise.all([
  // Manifeste, `purpose: any` — le navigateur affiche l'image telle quelle.
  iconeSimple(192, vers('public', 'icons', 'icon-192.png')),
  iconeSimple(512, vers('public', 'icons', 'icon-512.png')),

  // Manifeste, `purpose: maskable` — Android rogne, donc plein bord.
  iconePleine(192, SURETE, vers('public', 'icons', 'icon-maskable-192.png')),
  iconePleine(512, SURETE, vers('public', 'icons', 'icon-maskable-512.png')),

  // Favicon de l'onglet.
  iconeSimple(192, vers('src', 'app', 'icon.png')),

  // iOS : pas de transparence, l'arrondi est appliqué par le système.
  iconePleine(180, PLEIN, vers('src', 'app', 'apple-icon.png')),

  // Fiche Play Store : 512, sans alpha, sinon le paquet est refusé.
  iconePleine(512, PLEIN, vers('android', 'store_icon.png')),
]);

for (const ligne of faits) console.log('✓', ligne);
