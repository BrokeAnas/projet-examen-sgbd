# GymManager

Application de bureau de **gestion de salle de sport** :
membres, coachs, cours, séances, inscriptions, abonnements et tableau de bord statistique.

> Projet pédagogique — Electron + Angular standalone + Prisma SQLite, en TypeScript strict.

---

## Stack

- **Desktop** : Electron 33
- **Frontend** : Angular 19 standalone (sans NgModule, control flow `@for`/`@if`, signaux)
- **Backend embarqué** : Node.js + Prisma 6 (ORM) + SQLite (fichier local `prisma/dev.db`)
- **Langage** : TypeScript en mode `strict: true` partout, **0 `any` côté domaine**
- **Bundler renderer** : `@angular/build`
- **Communication** : IPC sécurisé via `contextBridge` + `ipcMain.handle` / `ipcRenderer.invoke`

---

## Prérequis

- Node.js **≥ 20** (testé sur Node 24)
- npm ≥ 10
- macOS, Windows ou Linux

---

## Installation — étape par étape

```bash
# 1. Installer les dépendances (déclenche prisma generate automatiquement)
npm install

# 2. Créer la base de données SQLite + appliquer la migration initiale
npm run prisma:migrate
# Si le CLI demande un nom, accepter "init".

# 3. Peupler la base avec des données de démo
npm run seed

# 4. Lancer l'application (build complet + electron)
npm run start
```

Une fenêtre Electron s'ouvre avec l'application.

> Si tu modifies le code : relance simplement `npm run start` pour rebuilder.

---

## Architecture

```
gym-manager/
├── prisma/
│   ├── schema.prisma          # Schéma DB commenté (modèles, relations, onDelete)
│   ├── seed.ts                # Peuplement de démo
│   └── dev.db                 # Base SQLite locale (gitignorée)
├── src/
│   ├── main/                  # PROCESSUS PRINCIPAL (Node)
│   │   ├── main.ts            # createWindow + cycle de vie Electron
│   │   ├── ipc-handlers.ts    # Handlers IPC CRUD pour TOUTES les tables + stats
│   │   └── prisma-client.ts   # Singleton PrismaClient
│   ├── preload/
│   │   └── preload.ts         # contextBridge.exposeInMainWorld('api', …)
│   └── renderer/              # PROCESSUS RENDERER (Angular)
│       ├── app/
│       │   ├── components/    # 9 composants standalone
│       │   ├── services/      # 7 services injectables (providedIn:'root')
│       │   ├── models/        # Interfaces TypeScript (domain + api)
│       │   ├── app.component.ts
│       │   └── app.routes.ts
│       ├── main.ts            # bootstrapApplication + provideRouter
│       ├── index.html
│       └── styles.css
├── docs/
│   ├── schema.md              # Schéma Mermaid + table des relations
│   └── schema.drawio          # Schéma au format draw.io (livrable PDF 3.1)
├── dist/                      # Builds (gitignoré)
├── angular.json
├── tsconfig.json              # tsconfig Angular (strict + strictTemplates)
├── tsconfig.main.json         # tsconfig du main process
├── tsconfig.preload.json      # tsconfig du preload
├── tsconfig.app.json          # tsconfig hérité pour Angular CLI
├── package.json
└── README.md
```

### Schéma de communication

```
┌─────────────────┐   ipcRenderer.invoke    ┌──────────────────┐   Prisma  ┌────────┐
│  Renderer       │ ──────────────────────► │  Main process    │ ────────► │ SQLite │
│  (Angular UI)   │                         │  (Node + Prisma) │           │ dev.db │
│                 │ ◄────────────────────── │                  │ ◄──────── │        │
└─────────────────┘   IpcResponse<T>        └──────────────────┘           └────────┘
       ▲
       │ window.api exposé par le preload (contextBridge)
       ▼
┌─────────────────┐
│   preload.ts    │  ← isolation totale du renderer (sécurité)
└─────────────────┘
```

---

## Fonctionnalités

L'application implémente le **CRUD complet sur les 7 tables** conformément au PDF section 2.2 :

| Table | Page | Opérations UI |
|---|---|---|
| Membre | `/membres` + `/membres/nouveau` + `/membres/:id/modifier` | Create, Read, Update, Delete |
| Coach | `/coachs` | Create (formulaire inline), Read, Update (édition ligne), Delete |
| Cours | `/cours` | Create (avec select coach), Read, Delete (Update via API) |
| Salle | `/salles` | Create, Read, Update (édition ligne), Delete |
| Seance | `/seances` | Create, Read, Delete (et inscription management) |
| Inscription (N:M) | inline dans `/seances` | Create (inscrire), Update (présence), Delete (désinscrire) |
| Abonnement | `/abonnements` | Create, Read, Delete (Update via API) |

Page **statistiques** dédiée (`/statistiques`) avec :
- Comptage des membres actifs (`prisma.membre.count`)
- Cours par coach (`prisma.cours.groupBy`)
- 5 prochaines séances avec join (`include: { cours: { include: { coach: true } } }`)
- Taux de remplissage moyen

---

## Conformité au PDF de remise — Annexe 5.1 (Angular)

| # | Notion (PDF) | Fichier:Ligne |
|---|---|---|
| 1 | Composants standalone (≥ 3) — **on en a 9** | `src/renderer/app/components/*` |
| 2 | Interfaces TypeScript | `src/renderer/app/models/domain.types.ts` |
| 3 | `signal()` | `membres-list.component.ts`, `coachs-list.component.ts`, `salles-list.component.ts`, etc. |
| 4 | `computed()` | `membres-list.component.ts` (`nombreMembresActifs`), `statistiques.component.ts` (`pourcentageActifs`), `salles-list.component.ts` (`capaciteTotale`), `abonnements-list.component.ts` (`chiffreAffaires`) |
| 5 | `@for` / `@if` | Partout (toutes les listes) |
| 6 | Service + DI via `inject()` | Tous les composants — ex: `membres-list.component.ts` |
| 7 | Singleton `providedIn: 'root'` | Les 7 services dans `src/renderer/app/services/` |
| 8 | `input.required<T>()` | `membre-row.component.ts` ligne 38 |
| 9 | `output<T>()` | `membre-row.component.ts` ligne 41 |
| 10 | Formulaire réactif | `membre-form.component.ts`, `coachs-list.component.ts`, `salles-list.component.ts`, `cours-list.component.ts`, `seances-list.component.ts`, `abonnements-list.component.ts` |
| 11 | Routage (≥ 2 routes) — **on en a 10** | `app.routes.ts` |
| 12 | RouterLink | `app.component.ts` (7 liens de navigation) |
| 13 | `effect()` (BONUS) | `membres-list.component.ts` ligne 101 |

## Conformité au PDF de remise — Annexe 5.2 (Prisma)

| # | Notion (PDF) | Fichier:Ligne |
|---|---|---|
| 1 | 7+ modèles | `prisma/schema.prisma` : Membre, Coach, Cours, Salle, Seance, Inscription, Abonnement |
| 2 | Clé primaire `@id @default(autoincrement())` | Sur chaque modèle |
| 3 | Relation 1:N + foreignKey + onDelete | `Coach→Cours` (Restrict), `Cours→Seance` (Cascade), `Salle→Seance` (Restrict), `Membre→Abonnement` (Cascade) |
| 4 | Table N:M avec `@@id([aId, bId])` | `Inscription` ligne ~165 du `schema.prisma` |
| 5 | `onDelete: Cascade` OU `Restrict` | Les deux sont utilisés, **justifiés en commentaires** dans `schema.prisma` |
| 6 | `include` (JOIN) | `ipc-handlers.ts` : `cours:listerTous`, `membres:obtenirParId`, `statistiques:obtenir` |
| 7 | Agrégat / comptage visible dans l'UI | `statistiques.component.ts` (count + groupBy + taux moyen) |
| 8 | CRUD complet sur ≥ 1 entité | **Implémenté sur les 7 tables** via les handlers IPC + UI |
| 9 | Champs optionnels (recommandé) | `description String?` et `equipements String?` dans `schema.prisma` |
| 10 | Enum Prisma (bonus) | `enum StatutMembre`, `enum TypeAbonnement` dans `schema.prisma` |

## Conformité au PDF de remise — Annexe 5.3 (Architecture Electron)

| # | Notion (PDF) | Fichier |
|---|---|---|
| Main process | crée BrowserWindow, charge l'app | `src/main/main.ts` |
| Preload | `contextBridge` + `ipcRenderer.invoke` | `src/preload/preload.ts` |
| Renderer | App Angular via l'API preload uniquement | `src/renderer/**` |
| IPC | `ipcMain.handle` + `ipcRenderer.invoke` | `ipc-handlers.ts` (main) + `preload.ts` (renderer) |
| `npm run start` | Une seule commande | `package.json` |
| SQLite local | `provider = "sqlite"` | `prisma/schema.prisma` |

---

## Questions piégeuses à anticiper à l'oral

**Q : Pourquoi `Cascade` ici et `Restrict` là ?**
- `Cascade` quand le parent donne tout son sens à l'enfant. Ex : si on supprime un Membre, ses Inscriptions n'ont plus de sens.
- `Restrict` quand l'entité enfant est une dépendance opérationnelle qu'il faut résoudre AVANT. Ex : supprimer un Coach qui anime encore des Cours ferait perdre l'info pédagogique.

**Q : `include` vs `select` en Prisma ?**
- `include` : récupère le modèle PRINCIPAL en entier + les relations imbriquées en plus.
- `select` : ne renvoie QUE les champs listés (whitelist). Plus performant.

**Q : Pourquoi une table de jonction `Inscription` EXPLICITE ?**
Parce qu'on veut stocker des champs SUR la relation (`dateInscription`, `presence`). Une N:M implicite (`Seance[]` ↔ `Membre[]`) crée une table cachée sans colonnes additionnelles possibles.

**Q : Équivalent SQL d'une relation Prisma ?**
Chaque `@relation(fields: [coachId], references: [id], onDelete: Restrict)` ⇒
```sql
FOREIGN KEY (coachId) REFERENCES Coach(id) ON DELETE RESTRICT
```

**Q : `signal()` vs `computed()` ?**
- `signal(x)` : VALEUR mutable, source de vérité. Modifié via `.set()` ou `.update()`.
- `computed(() => ...)` : valeur DÉRIVÉE en lecture seule, recalculée AUTOMATIQUEMENT quand un signal qu'elle lit change.

**Q : Rôle du preload et de `contextIsolation: true` ?**
Le preload est le SEUL pont autorisé entre Node (puissant) et le JS de l'UI (potentiellement vulnérable au XSS). `contextIsolation: true` garantit que le `window` du renderer ne peut PAS appeler `require('fs')` ni manipuler les API Node. Le renderer ne voit QUE ce que `contextBridge.exposeInMainWorld` a explicitement exposé.

**Q : Pourquoi `providedIn: 'root'` = singleton ?**
Angular crée le service dans l'injecteur RACINE. Toute l'application reçoit la MÊME instance via `inject()`.

**Q : Clé primaire composite sur Inscription ?**
`@@id([membreId, seanceId])` ⇒ SQL : `PRIMARY KEY (membreId, seanceId)`. Garantit qu'un membre ne peut s'inscrire qu'UNE seule fois à une séance donnée.

---

## Scripts npm

| Commande | Effet |
|---|---|
| `npm install` | Installe les dépendances + génère le client Prisma (`postinstall`) |
| `npm run prisma:migrate` | Crée la migration initiale et la DB `prisma/dev.db` |
| `npm run prisma:generate` | Régénère le client Prisma (après modification du schema) |
| `npm run seed` | Peuple la DB avec des données de démo |
| `npm run build` | Build complet (main + preload + renderer Angular) |
| `npm run start` | Build + lance Electron |
| `npm run electron:only` | Lance Electron sans rebuilder (si build déjà fait) |

---

## En cas de pépin

- **« Cannot find module @prisma/client »** → `npm install` puis `npm run prisma:generate`
- **« Database file not found »** → `npm run prisma:migrate` n'a pas été exécuté
- **Page blanche dans Electron** → ouvre les DevTools (décommenter la ligne dans `src/main/main.ts`) et regarde la console
- **Modification du `schema.prisma`** → `npm run prisma:migrate` pour appliquer + `npm run prisma:generate`
