# GymManager

Application de bureau de **gestion de salle de sport** :
membres, coachs, cours, séances, inscriptions, abonnements et tableau de bord statistique.

> Projet pédagogique — Electron + Angular standalone + Prisma SQLite, en TypeScript strict.

---

## Stack

- **Desktop** : Electron 33
- **Frontend** : Angular 19 standalone (sans NgModule, control flow `@for`/`@if`, signaux)
- **Backend embarqué** : Node.js + Prisma 6 (ORM) + SQLite (fichier local `prisma/dev.db`)
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
