import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'One Piece Quest — devine qui apparaîtra dans le prochain chapitre';

/**
 * Carte de partage du site.
 *
 * ## Ce qui manquait
 *
 * Les pages de partage d'équipage avaient la leur ; le site lui-même n'en avait
 * aucune. Un lien vers l'accueil collé dans une conversation, un message ou un
 * résultat de recherche s'affichait donc en texte nu — un titre, une ligne de
 * description, et rien qui se reconnaisse.
 *
 * C'est aussi ce que Google et les réseaux lisent pour associer une image à
 * un site. Le favicon dit qui l'on est dans un onglet ; cette carte le dit
 * partout ailleurs.
 *
 * ## Pourquoi elle est fabriquée et non dessinée
 *
 * `next/og` la compose côté serveur, sans dépendance externe ni service tiers.
 * Le jour où le nom ou la marque change, il n'y a pas d'export à refaire dans
 * un logiciel de dessin : la carte suit le code.
 *
 * Le chapeau est lu depuis `public/` et incorporé en base64. Une URL absolue
 * marcherait en production et échouerait en local, où l'image se demanderait à
 * elle-même une adresse qu'elle ne connaît pas encore.
 */

const ABYSS = '#071c2c';
const NAVY = '#0e3045';
const TURQUOISE = '#25c7c5';
const PARCHMENT = '#f5e8c8';
const FLAG = '#e0374a';

export default function SiteImage() {
  const chapeau = readFileSync(join(process.cwd(), 'public', 'chapeau-chopper.png'));
  const src = `data:image/png;base64,${chapeau.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(150deg, ${NAVY} 0%, ${ABYSS} 70%)`,
          color: PARCHMENT,
          position: 'relative',
        }}
      >
        {/* Une lueur, pour que le fond ne soit pas un aplat. Les cartes de
            partage s'affichent en petit : c'est le contraste général qu'on
            perçoit, pas le détail. */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: 320,
            width: 560,
            height: 560,
            borderRadius: 560,
            background: 'rgba(37, 199, 197, 0.16)',
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={330} height={214} />

        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 900,
            letterSpacing: 6,
            marginTop: 26,
          }}
        >
          ONE PIECE QUEST
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 22,
            fontSize: 32,
            color: TURQUOISE,
            letterSpacing: 1,
          }}
        >
          Devine qui apparaîtra dans le prochain chapitre
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 34,
            padding: '12px 30px',
            borderRadius: 999,
            background: FLAG,
            color: '#fff6e4',
            fontSize: 27,
            fontWeight: 700,
          }}
        >
          3 personnages · avant dimanche 23:59
        </div>
      </div>
    ),
    size,
  );
}
