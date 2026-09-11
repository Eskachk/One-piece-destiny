import Link from 'next/link';
import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { MainNav } from '@/components/MainNav';
import { traduire } from '@/lib/i18n';

/**
 * Politique de confidentialité (obligation Play Store, RGPD art. 13).
 *
 * ## Pourquoi cette page existe, et pourquoi elle est publique
 *
 * Le Play Store refuse la publication d'une application qui crée des comptes
 * sans politique de confidentialité **accessible par une URL publique**. Le
 * robot de Google la lit sans session : si elle était derrière l'écran de
 * connexion, il verrait l'écran de connexion et la fiche serait rejetée sans
 * que rien n'indique pourquoi. Cette page n'appelle donc aucune fonction de
 * session, et reste lisible d'un visiteur anonyme.
 *
 * La même obligation vient du RGPD (article 13) dès la collecte : le joueur
 * doit savoir ce qui est enregistré **avant** de créer son compte.
 *
 * ## Ce que ce texte n'est pas
 *
 * Ce n'est pas un texte modèle. Chaque donnée citée ci-dessous a été relevée
 * dans les migrations et le code de ce dépôt — `user_accounts`,
 * `account_events`, `oauth_identities`, `payment_intents`, `audit_log`,
 * `risk_assessments`. Une politique qui annonce moins que ce que la base
 * contient est une déclaration fausse, et c'est exactement ce que le
 * questionnaire « Sécurité des données » du Play Store fait vérifier.
 *
 * **À tenir à jour.** Ajouter une colonne qui touche au joueur, ou un
 * prestataire, sans passer par ici rend cette page inexacte — et une page de
 * confidentialité inexacte est pire que pas de page du tout.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return {
    title: t('privacy.meta.title'),
    description: t('privacy.meta.description'),
    alternates: { canonical: '/confidentialite' },
  };
}

/** Dernière révision. À modifier à chaque changement de fond. */
const MISE_A_JOUR = '7 septembre 2026';

/**
 * Adresse à laquelle un joueur exerce ses droits.
 *
 * Elle vient de l'environnement, et **elle n'a pas de valeur par défaut
 * inventée**. Une politique de confidentialité qui affiche une adresse
 * inexistante est pire qu'absente : elle promet un recours qui n'arrive nulle
 * part, et le RGPD comme le Play Store exigent un contact **joignable**.
 *
 * Sans `CONTACT_EMAIL`, la page reste publiable : elle renvoie alors vers les
 * paramètres du compte, plutôt que d'afficher une adresse fausse. C'est un
 * repli acceptable pour le RGPD, mais **pas suffisant pour le Play Store**,
 * qui attend un moyen de contact dédié — la variable doit donc être posée
 * avant de soumettre la fiche.
 */
const CONTACT = process.env.CONTACT_EMAIL?.trim() || null;

function Contact({ libelle }: { libelle: string }) {
  if (!CONTACT) {
    return (
      <Link className="hb-link" href="/parametres">
        {libelle}
      </Link>
    );
  }
  return (
    <a className="hb-link" href={`mailto:${CONTACT}`}>
      {CONTACT}
    </a>
  );
}

function Section({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hb-card mt-5 text-sm">
      <h2 className="font-display text-base">{titre}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

/**
 * La version anglaise est une traduction fidèle du texte français, section
 * par section. Les deux se modifient ensemble : une donnée ajoutée d'un côté
 * et pas de l'autre ferait de l'une des deux pages une déclaration fausse.
 */
export default async function Confidentialite() {
  const { locale } = await traduire();
  return locale === 'en' ? <PageEn /> : <PageFr />;
}

function PageFr() {
  return (
    <HarborScene variant="page" decor={false}>
      <p className="hb-eyebrow">Vie privée</p>
      <h1 className="hb-title mt-1">Ce que le jeu sait de toi</h1>

      <p className="hb-card mt-5 text-sm">
        One Piece Quest est un jeu de pronostics. Il a besoin d’un compte pour
        savoir à qui appartient un équipage et où te placer au classement — et
        de rien de plus. Cette page dit exactement ce qui est enregistré, pour
        quoi faire, et pendant combien de temps.
        <br />
        <span className="hb-ink-soft">Dernière mise à jour : {MISE_A_JOUR}.</span>
      </p>

      <Section titre="Qui est responsable">
        <p>
          Le jeu est édité à titre personnel par l’auteur de One Piece Quest.
          Pour toute question sur tes données, ou pour demander leur
          suppression, passe par <Contact libelle="tes paramètres" />.
        </p>
        <p className="hb-ink-soft">
          One Piece Quest est un projet de fans, sans lien avec Eiichiro Oda,
          Shueisha ni Toei Animation.
        </p>
      </Section>

      <Section titre="Ce qui est enregistré, et pourquoi">
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong>Adresse e-mail.</strong> Elle identifie ton compte, permet
            de le récupérer en cas de mot de passe oublié et d’envoyer les
            alertes que tu as demandées. Sans elle, un compte perdu l’est
            définitivement.
          </li>
          <li>
            <strong>Pseudonyme.</strong> Affiché publiquement au classement, sur
            le marché et dans les ligues. C’est toi qui le choisis : n’y mets
            pas ton nom si tu ne veux pas qu’il soit vu.
          </li>
          <li>
            <strong>Mot de passe.</strong> Jamais conservé. La base ne garde
            qu’une empreinte Argon2id, dont on ne peut pas revenir au mot de
            passe. Personne — l’administrateur compris — ne peut le lire.
          </li>
          <li>
            <strong>Date de naissance.</strong> Uniquement pour vérifier l’âge
            minimum et, en dessous, l’accord parental.
          </li>
          <li>
            <strong>Connexion Google</strong> (si tu l’utilises). Le jeu conserve
            ton adresse e-mail et l’identifiant stable que Google lui transmet.
            Aucun accès à tes contacts, ton agenda ou tes fichiers.
          </li>
          <li>
            <strong>Ton jeu.</strong> Équipages, scores, cartes, Berries,
            échanges sur le marché, ligues, réponses aux questions de chapitre.
            C’est le jeu lui-même.
          </li>
          <li>
            <strong>Adresse IP et journaux techniques.</strong> Conservés à la
            création du compte et lors d’événements sensibles (connexion,
            changement de mot de passe, achat). Ils servent à une seule chose :
            détecter les comptes multiples et la fraude. Ils ne servent ni à te
            profiler, ni à te géolocaliser.
          </li>
          <li>
            <strong>Achats.</strong> Si tu achètes des Berries, le paiement est
            traité par Stripe. <strong>Ton numéro de carte ne passe jamais par
            ce site et n’y est jamais enregistré.</strong> Le jeu ne garde que
            le montant, la date et un identifiant de transaction.
          </li>
        </ul>
      </Section>

      <Section titre="Ce qui n’est jamais collecté">
        <p>
          Pas de position géographique, pas de carnet d’adresses, pas de
          microphone, pas de caméra, pas de fichiers de ton téléphone. Ces trois
          dernières autorisations sont explicitement refusées par le site
          lui-même, en plus de ne pas être demandées.
        </p>
      </Section>

      <Section titre="Publicité">
        <p>
          Le jeu affiche des annonces fournies par Google AdSense, qui peut
          déposer des cookies et utiliser un identifiant publicitaire pour
          choisir les annonces. En Europe, un bandeau de consentement te
          demande ton accord avant tout traitement à des fins publicitaires, et
          tu peux le refuser.
        </p>
        <p>
          Les réglages de la publicité personnalisée de Google se modifient à
          tout moment sur{' '}
          <a
            className="hb-link"
            href="https://myadcenter.google.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            myadcenter.google.com
          </a>
          .
        </p>
      </Section>

      <Section titre="À qui les données sont transmises">
        <p>
          Aucune donnée n’est vendue, ni échangée. Elle est confiée aux seuls
          prestataires nécessaires au fonctionnement du jeu :
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Vercel</strong> — hébergement du site (serveurs en Europe).
          </li>
          <li>
            <strong>Supabase</strong> — base de données.
          </li>
          <li>
            <strong>Google</strong> — connexion Google et régie publicitaire.
          </li>
          <li>
            <strong>Stripe</strong> — paiements, si tu en fais.
          </li>
          <li>
            <strong>Le service d’envoi d’e-mails</strong> — pour les messages du
            jeu uniquement.
          </li>
        </ul>
      </Section>

      <Section titre="Combien de temps">
        <p>
          Ton compte et sa progression sont conservés tant que tu le gardes.
          Après suppression, les données de jeu sont effacées ; les traces
          techniques liées à la fraude et les justificatifs comptables des
          achats sont conservés le temps qu’impose la loi, puis effacés.
        </p>
      </Section>

      <Section titre="Tes droits">
        <p>
          Tu peux demander l’accès à tes données, leur correction, leur
          suppression, ou t’opposer à un traitement. La plupart des réglages
          sont directement dans{' '}
          <Link className="hb-link" href="/parametres">
            tes paramètres
          </Link>{' '}
          — notifications, apparence, sécurité. Pour le reste, passe par{' '}
          <Contact libelle="tes paramètres" />.
        </p>
        <p>
          Si une réponse ne te convient pas, tu peux saisir la CNIL —{' '}
          <a
            className="hb-link"
            href="https://www.cnil.fr"
            rel="noopener noreferrer"
            target="_blank"
          >
            cnil.fr
          </a>
          .
        </p>
      </Section>

      <Section titre="Enfants">
        <p>
          Le jeu n’est pas destiné aux enfants de moins de 13 ans. En dessous de
          l’âge requis par ton pays, un accord parental est demandé à
          l’inscription.
        </p>
      </Section>

      <div className="mt-5 flex flex-wrap gap-4">
        <Link href="/" className="hb-link text-sm">
          Retour à l’équipage
        </Link>
        <Link href="/parametres" className="hb-link text-sm">
          Mes paramètres
        </Link>
      </div>

      <MainNav />
    </HarborScene>
  );
}

function PageEn() {
  return (
    <HarborScene variant="page" decor={false}>
      <p className="hb-eyebrow">Privacy</p>
      <h1 className="hb-title mt-1">What the game knows about you</h1>

      <p className="hb-card mt-5 text-sm">
        One Piece Quest is a prediction game. It needs an account to know who a
        crew belongs to and where to place you on the leaderboard — and nothing
        more. This page says exactly what is stored, what for, and for how long.
        <br />
        <span className="hb-ink-soft">Last updated: 7 September 2026.</span>
      </p>

      <Section titre="Who is responsible">
        <p>
          The game is published personally by the author of One Piece Quest.
          For any question about your data, or to request its deletion, go
          through <Contact libelle="your settings" />.
        </p>
        <p className="hb-ink-soft">
          One Piece Quest is a fan project, unaffiliated with Eiichiro Oda,
          Shueisha or Toei Animation.
        </p>
      </Section>

      <Section titre="What is stored, and why">
        <ul className="ml-4 list-disc space-y-2">
          <li>
            <strong>Email address.</strong> It identifies your account, lets you
            recover it if you forget your password, and delivers the alerts you
            asked for. Without it, a lost account is lost for good.
          </li>
          <li>
            <strong>Display name.</strong> Shown publicly on the leaderboard, on
            the market and in leagues. You choose it: do not put your real name
            in it if you do not want it seen.
          </li>
          <li>
            <strong>Password.</strong> Never stored. The database only keeps an
            Argon2id hash, from which the password cannot be recovered. Nobody —
            the administrator included — can read it.
          </li>
          <li>
            <strong>Date of birth.</strong> Only to check the minimum age and,
            below it, parental consent.
          </li>
          <li>
            <strong>Google sign-in</strong> (if you use it). The game keeps your
            email address and the stable identifier Google passes along. No
            access to your contacts, calendar or files.
          </li>
          <li>
            <strong>Your game.</strong> Crews, scores, cards, Berries, market
            trades, leagues, answers to chapter questions. That is the game
            itself.
          </li>
          <li>
            <strong>IP address and technical logs.</strong> Kept at account
            creation and on sensitive events (sign-in, password change,
            purchase). They serve one purpose only: detecting multiple accounts
            and fraud. They are used neither to profile nor to locate you.
          </li>
          <li>
            <strong>Purchases.</strong> If you buy Berries, the payment is
            handled by Stripe. <strong>Your card number never goes through this
            site and is never stored on it.</strong> The game only keeps the
            amount, the date and a transaction identifier.
          </li>
        </ul>
      </Section>

      <Section titre="What is never collected">
        <p>
          No geographic location, no address book, no microphone, no camera, no
          files from your phone. The last three permissions are explicitly
          refused by the site itself, on top of never being requested.
        </p>
      </Section>

      <Section titre="Advertising">
        <p>
          The game shows ads served by Google AdSense, which may set cookies and
          use an advertising identifier to pick ads. In Europe, a consent banner
          asks for your agreement before any processing for advertising
          purposes, and you can decline.
        </p>
        <p>
          Google’s personalised advertising settings can be changed at any time
          on{' '}
          <a
            className="hb-link"
            href="https://myadcenter.google.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            myadcenter.google.com
          </a>
          .
        </p>
      </Section>

      <Section titre="Who the data is shared with">
        <p>
          No data is sold or exchanged. It is entrusted only to the providers
          the game needs to run:
        </p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Vercel</strong> — site hosting (servers in Europe).
          </li>
          <li>
            <strong>Supabase</strong> — database.
          </li>
          <li>
            <strong>Google</strong> — Google sign-in and ad network.
          </li>
          <li>
            <strong>Stripe</strong> — payments, if you make any.
          </li>
          <li>
            <strong>The email delivery service</strong> — for the game’s
            messages only.
          </li>
        </ul>
      </Section>

      <Section titre="For how long">
        <p>
          Your account and its progress are kept as long as you keep it. After
          deletion, game data is erased; technical traces tied to fraud and the
          accounting records of purchases are kept for as long as the law
          requires, then erased.
        </p>
      </Section>

      <Section titre="Your rights">
        <p>
          You can request access to your data, its correction, its deletion, or
          object to a processing. Most settings are directly in{' '}
          <Link className="hb-link" href="/parametres">
            your settings
          </Link>{' '}
          — notifications, appearance, security. For the rest, go through{' '}
          <Contact libelle="your settings" />.
        </p>
        <p>
          If an answer does not satisfy you, you can refer to the CNIL, the
          French data protection authority —{' '}
          <a
            className="hb-link"
            href="https://www.cnil.fr"
            rel="noopener noreferrer"
            target="_blank"
          >
            cnil.fr
          </a>
          .
        </p>
      </Section>

      <Section titre="Children">
        <p>
          The game is not intended for children under 13. Below the age required
          in your country, parental consent is requested at sign-up.
        </p>
      </Section>

      <div className="mt-5 flex flex-wrap gap-4">
        <Link href="/" className="hb-link text-sm">
          Back to the crew
        </Link>
        <Link href="/parametres" className="hb-link text-sm">
          My settings
        </Link>
      </div>

      <MainNav />
    </HarborScene>
  );
}
