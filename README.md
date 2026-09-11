# Portail Fournisseurs & Relances

Portail remplaçant les échanges email dispersés entre acheteurs et fournisseurs : suivi de
commandes, confirmations ligne par ligne, gestion documentaire (avec expiration et blocage de
réception), scorecard de performance, et relances automatiques groupées.

**URL de démonstration :** _à compléter après déploiement Vercel_
**Compte acheteur de démo :** `achats@demo.local` / `Demo1234!`
**Accès fournisseur :** via lien personnel généré depuis l'espace acheteur (voir jeu de données de
démo dans `demo-data/export.json`, ou générer un nouveau lien depuis l'UI).

---

## 1. Stack technique

| Besoin | Choix | Pourquoi |
|---|---|---|
| Framework fullstack | **Next.js 15** (App Router, Server Actions) | Un seul projet pour l'UI, l'API et les jobs planifiés ; déploiement Vercel natif. |
| Base de données | **PostgreSQL (Supabase)** via **Prisma** | Gratuit sans carte bancaire, migrations lisibles, types générés. |
| Stockage documents | **Supabase Storage** (bucket privé) | Même plateforme que la DB, un seul compte à créer, URLs signées à durée limitée. |
| Email transactionnel | **Resend** | Gratuit (100/jour), domaine de test `onboarding@resend.dev` sans configuration DNS. |
| Automatisations | **Cron Vercel + API routes internes** (pas n8n) | Voir §4 — remplacement documenté du sujet, mêmes fonctionnalités livrées. |
| UI | **Tailwind CSS 4 + shadcn/ui (Base UI)** | Composants accessibles, design cohérent, léger. |
| Auth acheteur | Mot de passe (bcrypt) + JWT en cookie httpOnly (`jose`) | Simple, stateless, suffisant pour une équipe interne. |
| Auth fournisseur | Lien magique (token opaque haché) + session révocable en base | Aucun mot de passe fournisseur, expiration et révocation contrôlées par l'acheteur. |
| i18n | Dictionnaires FR/EN maison | Pas de dépendance lourde, préférence mémorisée en base (Buyer/Supplier.locale). |

Les versions de `next`, `prisma` et `@prisma/client` sont **volontairement figées sur des
releases stables** (15.5.25 / 6.19.3) plutôt que "latest" : au moment du développement, `latest`
résolvait vers des pré-versions (Next 16 canary, Prisma 8 RC) sans binaire natif Windows
disponible, ce qui cassait `next dev`/`next build`. Documenté ici pour ne pas être "corrigé" par
erreur lors d'une mise à jour future sans vérifier la disponibilité des binaires.

## 2. Installation locale

### Prérequis
- Node.js 20+
- Un projet Supabase (Postgres + Storage), gratuit — [supabase.com](https://supabase.com), connexion via GitHub
- Un compte Resend, gratuit — [resend.com](https://resend.com), connexion via GitHub

### Étapes

```bash
npm install
cp .env.example .env   # puis renseigner les vraies valeurs (voir détail dans le fichier)
npx prisma migrate dev --name init   # crée les tables
npm run db:seed                       # jeu de données de démonstration
npm run dev                           # http://localhost:3000
```

Dans Supabase, créer manuellement un bucket **privé** nommé `documents` (Storage → New bucket)
avant le premier upload.

### Connexion à Supabase : deux URLs de base de données

Le plan gratuit Supabase ne fournit plus de connexion directe IPv4 sans add-on payant. Le projet
utilise donc deux chaînes de connexion (voir `.env.example`) :
- `DATABASE_URL` : le **pooler en mode transaction** (port 6543) — utilisé par l'application à
  l'exécution (compatible avec le pooling serverless).
- `DIRECT_URL` : le **même hôte pooler, mais en mode session** (port 5432) — utilisé uniquement
  par `prisma migrate`, qui a besoin de *prepared statements* que le mode transaction ne supporte
  pas. Configuré via `prisma.config.ts` (qui ne s'applique qu'à la CLI, jamais au client Prisma
  utilisé par l'app).

### Scripts utiles

```bash
npm run db:studio         # explorateur de données Prisma Studio
npm run db:export-demo    # régénère demo-data/export.json depuis la base actuelle
npm run smoke-test        # test de bout en bout (Playwright) contre le serveur dev local
```

## 3. Architecture

```
app/
  acheteur/connexion/          page + server action de login (public)
  acheteur/(protected)/        layout avec garde requireBuyer() ; dashboard, commandes,
                                fournisseurs, validations, scorecard
  fournisseur/lien-expire/     page publique (lien invalide/expiré)
  fournisseur/(protected)/     layout avec garde requireSupplierSession() ; liste de
                                commandes scopée au fournisseur, détail + confirmation + upload
  f/[token]/                   résolution du lien magique -> pose le cookie de session -> redirect
  api/cron/daily/              automatisations planifiées (protégé par CRON_SECRET)
  api/documents/[id]/download/ URL signée à la demande, scoping acheteur/fournisseur
lib/
  auth/                        buyer.ts (JWT), supplier.ts (magic link + session DB),
                                guards.ts (barrière d'autorisation réelle), crypto.ts, cookie-names.ts
  automations/                 w1-relance.ts, w3-documents.ts, digest-guard.ts (anti-doublon)
  i18n/                        dictionaries.ts, locale.ts
  prisma.ts, storage.ts, email.ts, documents.ts, scorecard.ts, validations.ts
prisma/schema.prisma           modèle de données complet (voir §5)
prisma/seed.ts                 jeu de données de démonstration
workflows/*.json                export documentaire des 3 workflows (W1/W2/W3)
demo-data/export.json          export du jeu de données de démo
scripts/smoke-test.ts          test de bout en bout Playwright
```

### Sécurité : pourquoi deux niveaux de garde ?

Le `middleware.ts` (Edge Runtime) ne fait qu'un **contrôle de présence de cookie** pour rediriger
immédiatement un visiteur non connecté, sans latence serveur. Ce n'est **pas** la barrière de
sécurité réelle : Prisma ne peut pas tourner en Edge Runtime, donc la vérification qui compte
(signature JWT + expiration pour l'acheteur, lookup en base + statut de révocation pour le
fournisseur) est faite dans `lib/auth/guards.ts`, appelée par chaque layout/page protégée, dans le
runtime Node. Toute requête Prisma est ensuite scopée explicitement par l'identité extraite de
cette session (jamais par un paramètre d'URL fourni par le client).

Les tokens de lien magique et de session fournisseur ne sont **jamais stockés en clair** : seul
leur hash SHA-256 l'est (`lib/auth/crypto.ts`). Une conséquence assumée : une relance automatique
ne peut pas "retrouver" l'ancien lien pour le renvoyer (impossible à partir d'un hash) — elle en
génère un nouveau à la place (voir `lib/automations/w1-relance.ts`).

## 4. Automatisations : remplacement de n8n (choix justifié)

Le sujet suggère n8n, mais précise explicitement que **les technologies listées sont des
suggestions, pas une liste imposée**, à condition d'expliquer le remplacement et de livrer le même
niveau fonctionnel. Choix retenu : **exécution native** (API routes Next.js + Cron Vercel), pour
deux raisons :

1. **Fiabilité gratuite** : héberger n8n gratuitement sans carte bancaire et sans qu'il se mette en
   veille (Render/Railway coupent les workers gratuits après inactivité) n'est pas réaliste pour un
   service qui doit tourner quotidiennement en production.
2. **Un seul projet à déployer** : pas de second service à maintenir, pas de webhook à sécuriser
   entre deux plateformes.

Le dossier `workflows/` documente les 3 workflows (déclencheur, étapes, fichier
d'implémentation) dans un schéma JSON propre au projet — pas un export n8n simulé, ce qui aurait
été trompeur puisque n8n n'exécute rien ici.

- **W1 — Commande émise** : création → lien magique → email d'invitation (immédiat) → si non
  ouvert après 3 jours, relance groupée quotidienne (`lib/automations/w1-relance.ts`).
- **W2 — Date décalée** : proposition fournisseur → notification immédiate à l'acheteur → écran de
  diff ancien/nouveau → validation/rejet → mise à jour planning (temps réel, pas de cron).
- **W3 — Document expirant** : cron quotidien recalcule les statuts (J-15 / J-5 / expiré),
  relance groupée par fournisseur, escalade avec copie acheteur à J-5, blocage de réception si
  expiré (`lib/automations/w3-documents.ts`).

Le cron unique (`app/api/cron/daily/route.ts`, `vercel.json`, 06h00 quotidien) est protégé par
`CRON_SECRET` : Vercel injecte automatiquement cet en-tête `Authorization: Bearer <secret>` pour
les jobs planifiés, ce qui empêche un déclenchement public de la route.

Une garde anti-doublon (`lib/automations/digest-guard.ts`) empêche de renvoyer la même relance à un
même fournisseur plus d'une fois toutes les 20h, même si le cron est déclenché plusieurs fois.

## 5. Modèle de données (résumé)

- `Buyer` / `Supplier` — comptes internes / externes, langue préférée persistée.
- `Order` / `OrderLine` — commande et lignes (quantité, prix, dates, statut).
- `OrderLineHistory` — historique de chaque changement de champ (ancien/nouveau) avec statut de
  validation acheteur : c'est ce qui alimente l'écran de diff et la règle "toute modification
  affiche ancien/nouveau et demande validation".
- `MagicLink` / `OrderAccessLog` / `SupplierSession` — lien fournisseur, journal d'accès (traçage
  d'un lien transféré), session dérivée révocable.
- `Document` — facture pro forma / certificat / packing list, statut dérivé de la date
  d'expiration, chaîne de remplacement (`replacesId`).
- `AlertDigest` — trace des relances groupées envoyées (anti-doublon + audit).

## 6. Cas limites traités

| Cas | Traitement |
|---|---|
| **Lien transféré** | Chaque accès est journalisé (IP + user-agent) dans `OrderAccessLog`. Le lien reste valide jusqu'à expiration (usage multi-session toléré), mais l'acheteur voit le nombre d'ouvertures et d'IP distinctes sur la fiche fournisseur — traçabilité plutôt que blocage, un lien pouvant légitimement être consulté par plusieurs personnes chez le fournisseur. |
| **Confirmation partielle** | `confirmedQuantity < quantity` → statut `partially_confirmed`, sans bloquer les autres lignes de la commande. |
| **Commande annulée** | Statut `cancelled` propagé à toutes les lignes ; le portail fournisseur affiche un bandeau lecture-seule et masque les actions. |
| **Document de remplacement** | Un nouvel upload peut référencer (`replacesId`) l'ancien document, qui passe `superseded`. Si le document expiré était la cause d'un blocage de réception, le blocage est levé automatiquement. |
| **Fournisseur en deux devises** | `currency` est porté par la commande (pas par le fournisseur seul, qui a juste une devise par défaut) ; aucune conversion automatique n'est effectuée — chaque montant reste affiché dans sa devise d'origine. |

## 7. Limites connues et compromis assumés

- **Ponctualité (scorecard)** : faute d'un module de réception des marchandises dans le périmètre,
  la ponctualité est dérivée du statut final de la ligne (confirmée telle quelle = à l'heure ; date
  décalée ou litige = à risque), pas d'une date de livraison réelle. Documenté dans
  `lib/scorecard.ts`.
- **Blocage de réception** : géré au niveau de la commande entière (toutes les lignes), pas
  document-à-ligne précisément — le sujet ne précise pas quel type de document bloque quelle ligne.
- **Relance W1** : ne peut pas renvoyer le lien magique d'origine (jamais stocké en clair, par
  design de sécurité) ; elle en génère un nouveau.
- **Vulnérabilités npm résiduelles** (`npm audit`) : limitées à des dépendances de *build/dev*
  (PostCSS via Next 15, tooling interne de Prisma CLI) — pas de code exposé en runtime de
  production. Le correctif automatique forcerait une bascule vers Next 16 / Prisma 8 (encore en
  pré-version au moment du développement), refusée pour la stabilité du projet (voir §1).
- **Devises** : pas de taux de change ; le scorecard agrège par fournisseur sans convertir les
  montants entre devises.

**Difficulté rencontrée au déploiement** : le premier déploiement Vercel plantait en production
(500 sur toute route touchant la base) avec `PrismaClientInitializationError: could not locate the
Query Engine for runtime "rhel-openssl-3.0.x"`. Cause : le générateur Prisma "prisma-client" (sortie
personnalisée `lib/generated/prisma`) ne garantissait pas de façon fiable l'inclusion du moteur natif
dans le bundle de la fonction serverless, même avec `binaryTargets` et `outputFileTracingIncludes`
explicites. Diagnostiqué via les logs runtime Vercel, confirmé en reproduisant le build de
production en local avec les mêmes variables d'environnement. Résolu en repassant au générateur
classique `prisma-client-js` (sortie par défaut dans `node_modules/@prisma/client`), pour lequel
Next.js/Vercel ont un traitement dédié bien établi.

## 8. Tests réalisés

Le script `scripts/smoke-test.ts` (Playwright, navigateur réel) exécute un parcours de bout en
bout contre une instance locale : connexion acheteur, ouverture d'une commande, validation d'un
diff fournisseur, création d'une commande, résolution d'un lien magique fournisseur, confirmation
d'une ligne. Il a aussi servi, pendant le développement, à vérifier manuellement : l'upload de
document vers Supabase Storage (fichier réellement présent dans le bucket), le téléchargement via
URL signée avec contrôle d'accès (401 sans session, 403 hors périmètre), le comportement responsive
(390px, menu mobile) sur les deux espaces, et le déclenchement réel du cron (emails envoyés via
Resend, statuts de documents recalculés).

```bash
npm run db:seed      # état de données connu
npm run smoke-test    # nécessite `npm run dev` lancé dans un autre terminal
```

## 9. Déploiement

Voir instructions détaillées fournies séparément pour : création des comptes Vercel/Supabase/Resend
(OAuth GitHub, sans carte bancaire), configuration des variables d'environnement sur Vercel,
déploiement, et invitation du dépôt GitHub privé.

## 10. IA

Ce projet a été développé avec l'assistance de Claude Code. Toutes les décisions d'architecture,
les compromis documentés en §7 et le code livré ont été revus et sont assumés par l'auteur.
