# 📖 Cours 08 — Glossaire de 60+ termes techniques

> 🎯 **Comment l'utiliser ?** Quand un mot te perd dans le code ou pendant l'oral, viens chercher ici. Définition simple + analogie + lien avec ton projet.

---

## A

### **Angular**
📖 Framework JavaScript de Google pour construire des SPA (Single Page Apps).
🍕 Un kit IKEA pour monter une UI.
💻 Tout `src/renderer/**`.

### **API (Application Programming Interface)**
📖 Ensemble de fonctions exposées pour permettre à un programme de parler à un autre.
🍕 Le menu du restaurant : ce que tu peux commander.
💻 `window.api` exposé par le preload, ou les méthodes Prisma comme `prisma.membre.create`.

### **Asynchrone**
📖 Une opération qui prend du temps et ne bloque pas le reste du programme.
🍕 Tu commandes une pizza : tu ne restes pas devant le four, tu fais autre chose et tu reviens quand la pizza est prête.
💻 Toutes les requêtes Prisma et les appels IPC sont asynchrones (préfixés par `async`).

### **`async` / `await`**
📖 Mots-clés JS pour gérer l'asynchrone proprement. `async` marque une fonction async, `await` attend qu'une Promise se résolve.
💻 Exemple : `async function f() { const x = await prisma.x.findMany(); }`

### **Auto-incrément**
📖 La DB choisit toute seule un id unique croissant pour chaque nouvelle ligne.
🍕 Le ticket de caisse numéroté : 001, 002, 003…
💻 `id Int @id @default(autoincrement())` dans `schema.prisma`.

---

## B

### **`BrowserWindow`**
📖 Classe Electron qui crée une fenêtre native avec Chromium dedans.
💻 `src/main/main.ts:23` — `new BrowserWindow({ width: 1280, ... })`.

### **Bundle**
📖 Fichier JS final résultant de la compilation/optimisation. Le navigateur charge le bundle au lieu de tous les fichiers source un par un.
🍕 Une valise faite : tu emportes UNE valise au lieu de 50 affaires éparpillées.
💻 Sortie de `ng build` dans `dist/renderer/browser/`.

---

## C

### **Cascade (ON DELETE)**
📖 Quand on supprime le parent, les enfants sont supprimés AUTOMATIQUEMENT.
🍕 Fermer son compte Netflix : l'historique part avec.
💻 `onDelete: Cascade` dans `prisma/schema.prisma` (ex: Membre → Inscription).

### **`computed()`**
📖 Valeur Angular dérivée d'un ou plusieurs signaux, en lecture seule, recalculée auto quand un signal change.
🍕 Une formule Excel `=A1*B1`.
💻 `membres-list.component.ts:91`.

### **`contextBridge`**
📖 API Electron pour exposer des fonctions du preload vers le renderer, de manière sécurisée et explicite.
🍕 Un passe-plat avec une grille : seuls les plats prévus passent.
💻 `src/preload/preload.ts:88` — `contextBridge.exposeInMainWorld('api', api)`.

### **`contextIsolation`**
📖 Option Electron qui isole le contexte JS du preload de celui du renderer.
🍕 Deux bureaux mitoyens avec cloison vitrée : on voit, on ne pique pas.
💻 `src/main/main.ts:29` — `contextIsolation: true`.

### **CRUD**
📖 Les 4 opérations sur des données : Create, Read, Update, Delete.

### **Cycle de vie (lifecycle hooks)**
📖 Méthodes appelées automatiquement par Angular à des moments précis : `ngOnInit` au démarrage, `ngOnDestroy` à la destruction…
💻 `ngOnInit` dans chaque composant Angular pour charger les données initiales.

---

## D

### **DOM (Document Object Model)**
📖 Représentation en arbre des éléments HTML dans le navigateur, manipulable en JS.
🍕 L'arbre généalogique des balises HTML.

### **Dependency Injection (DI)**
📖 Pattern où une classe REÇOIT ses dépendances au lieu de les CRÉER. Angular gère ça via `inject()`.
🍕 Tu commandes un café au lieu de planter un caféier.
💻 `inject(MembreService)` dans `membres-list.component.ts:77`.

---

## E

### **`effect()`**
📖 Fonction Angular qui exécute du code (side-effect) quand un signal qu'elle lit change.
🍕 Une alarme qui sonne quand le drapeau de la boîte aux lettres se lève.
💻 `membres-list.component.ts:105`.

### **Electron**
📖 Framework pour fabriquer des apps desktop avec HTML/CSS/JS, combinant Chromium et Node.js.
🍕 Un camion-pizzeria : moteur (Chromium) + cuisine (Node.js).
💻 Tout `src/main/**` et la config de fenêtre.

### **Enum**
📖 Liste fermée de valeurs autorisées pour un champ.
🍕 La case civilité : M./Mme/Autre — pas « licorne ».
💻 `enum StatutMembre { ACTIF SUSPENDU RESILIE }` dans `schema.prisma:34`.

### **`event.target`**
📖 Référence à l'élément HTML qui a déclenché un événement.
💻 `(event.target as HTMLInputElement).checked` dans `seances-list.component.ts` pour lire l'état d'une checkbox.

---

## F

### **FK (Foreign Key / clé étrangère)**
📖 Colonne d'une table qui pointe vers la PK d'une autre table.
🍕 Une plaque d'immatriculation qui pointe vers un véhicule du fichier de l'État.
💻 `coachId Int` dans `Cours` pointe vers `Coach.id`.

### **`findMany`, `findUnique`, `findFirst`**
📖 Méthodes Prisma pour lire :
- `findMany` : liste toutes les lignes qui matchent
- `findUnique` : cherche par PK ou champ @unique
- `findFirst` : première ligne qui matche une condition

### **FormBuilder**
📖 Service Angular qui simplifie la création de FormGroup.
💻 `inject(FormBuilder)` puis `this.fb.nonNullable.group({...})`.

### **FormGroup / FormControl**
📖 Objets Angular qui représentent un formulaire et ses champs.
💻 `membre-form.component.ts:90-103`.

---

## G

### **`@for`**
📖 Nouvelle syntaxe de boucle Angular 17+ dans les templates.
💻 `@for (m of membres(); track m.id) { <app-membre-row [membre]="m" /> }`.

### **`getRawValue()`**
📖 Méthode FormGroup pour extraire les valeurs courantes sous forme d'objet plain.

### **`groupBy`**
📖 Méthode Prisma pour grouper des lignes par colonne et appliquer des agrégats. SQL équivalent : `GROUP BY`.
💻 `src/main/ipc-handlers.ts:228` — `prisma.cours.groupBy({ by: ['coachId'], _count: { _all: true } })`.

---

## H

### **Handler**
📖 Fonction qui « gère » un événement ou un message. Dans notre contexte : `ipcMain.handle('canal', listener)` où `listener` est le handler.

### **`@if`**
📖 Nouvelle syntaxe conditionnelle Angular 17+. Remplace `*ngIf`.
💻 `@if (membres().length === 0) { <p>Vide</p> } @else { ... }`.

### **`include` (Prisma)**
📖 Option Prisma pour récupérer les relations imbriquées avec le résultat. ≈ JOIN.
💻 `findMany({ include: { coach: true, seances: true } })`.

### **`inject()`**
📖 Fonction Angular 14+ pour récupérer une instance d'un service injectable.
💻 `private readonly svc = inject(MembreService);`.

### **`input.required<T>()`**
📖 Propriété d'entrée OBLIGATOIRE d'un composant. Le parent DOIT la fournir.
💻 `membre-row.component.ts:40`.

### **Interface (TypeScript)**
📖 Définition d'une forme d'objet. Pas de code à l'exécution, juste du typage.
💻 `interface Membre { id: number; nom: string; ... }` dans `domain.types.ts`.

### **IPC (Inter-Process Communication)**
📖 Mécanisme pour faire communiquer deux processus distincts. Dans Electron : `ipcMain` / `ipcRenderer`.
🍕 Le passe-plat entre cuisine et salle.

### **`ipcMain.handle`**
📖 Côté main process : écoute un canal IPC et exécute une fonction quand un message arrive. Renvoie une Promise.

### **`ipcRenderer.invoke`**
📖 Côté preload : envoie un message sur un canal IPC et attend la réponse via Promise.

---

## J

### **JOIN (SQL)**
📖 Opération SQL pour combiner les lignes de plusieurs tables liées par une FK.
💻 Équivalent Prisma : `include`.

### **`JSON.stringify` / `JSON.parse`**
📖 Sérialisation/désérialisation JSON. Utilisé sous le capot par IPC pour transférer des données entre processus.

---

## L

### **Lazy loading**
📖 Chargement à la demande. Pour Angular routes : le bundle d'un composant n'est téléchargé qu'à la visite de la route.
💻 `loadComponent: () => import('./...')` dans `app.routes.ts`.

### **Linter**
📖 Outil qui analyse le code et signale les erreurs/mauvaises pratiques.

---

## M

### **Main process**
📖 Processus principal d'Electron, en Node.js, qui crée les fenêtres et gère le système.
🍕 Le chef en cuisine.
💻 `src/main/main.ts`.

### **Migration**
📖 Fichier SQL généré par Prisma à partir du schéma, qui décrit les changements à appliquer à la DB.
💻 `prisma/migrations/20260518170015_init/migration.sql`.

---

## N

### **N:M (plusieurs-à-plusieurs)**
📖 Relation entre deux tables où chaque ligne de chaque côté peut être liée à plusieurs lignes de l'autre. En SQL, on passe par une table de jonction.
💻 Membre ↔ Seance via `Inscription`.

### **`nodeIntegration: false`**
📖 Option Electron qui désactive `require()` et les API Node dans le renderer. Sécurité.

### **Node.js**
📖 Runtime JavaScript en dehors du navigateur, capable d'accéder au système de fichiers, au réseau, etc.

### **Nullable**
📖 Champ qui peut valoir null. En Prisma : `?` après le type. En TS : `string | null`.

---

## O

### **`onDelete`**
📖 Comportement Prisma/SQL définissant ce qui se passe quand le parent d'une FK est supprimé. Valeurs : `Cascade`, `Restrict`, `SetNull`, `NoAction`.

### **Optional chaining (`?.`)**
📖 Syntaxe TS/JS pour accéder à une propriété de manière safe : `a?.b?.c` renvoie undefined si `a` ou `b` est null/undefined.

### **`output<T>()`**
📖 Émetteur d'événement d'un composant Angular vers son parent.
💻 `membre-row.component.ts:43`.

### **ORM (Object-Relational Mapper)**
📖 Outil qui mappe des objets de code à des tables SQL.
🍕 Un traducteur entre toi (JS) et la DB (SQL).
💻 Prisma dans notre cas.

---

## P

### **Pipe (Angular)**
📖 Transformation appliquée à une valeur dans le template. Ex : `{{ date | date: 'dd/MM/yyyy' }}`, `{{ x | number: '1.0-1' }}`.

### **PK (Primary Key / clé primaire)**
📖 Identifiant unique d'une ligne dans une table.
💻 `id Int @id @default(autoincrement())`.

### **PK composite**
📖 Clé primaire formée de plusieurs colonnes.
💻 `@@id([membreId, seanceId])` dans `Inscription`.

### **Preload**
📖 Script Electron qui s'exécute avant la page, dans un contexte spécial, et fait le pont entre main et renderer.
🍕 Le serveur en livrée.
💻 `src/preload/preload.ts`.

### **Prisma**
📖 ORM TypeScript moderne qui génère un client typé à partir d'un schéma.
💻 `prisma/schema.prisma` + `src/main/prisma-client.ts`.

### **`PrismaClient`**
📖 Classe générée par Prisma à partir du schéma. C'est elle qui contient les méthodes `findMany`, `create`, etc.

### **`providedIn: 'root'`**
📖 Option d'`@Injectable` qui enregistre le service comme singleton dans l'injecteur racine.

### **Promise**
📖 Objet JS représentant le résultat futur d'une opération asynchrone.
🍕 Un ticket de retrait : tu auras ton truc plus tard.

### **Process**
📖 Instance d'un programme qui tourne avec sa propre mémoire et permissions.

---

## R

### **Renderer**
📖 Processus Electron qui affiche l'UI (Chromium). Isolé du système.
🍕 Les clients en salle.
💻 `src/renderer/**`.

### **Restrict (ON DELETE)**
📖 La suppression du parent est REFUSÉE tant qu'il a des enfants.
🍕 Tu veux quitter une équipe, on te dit : « finis d'abord tes projets ».
💻 `onDelete: Restrict` dans `schema.prisma:99` (Coach → Cours).

### **Reactive form**
📖 Formulaire Angular construit en TypeScript (FormGroup), opposé au template-driven.

### **`routerLink`**
📖 Directive Angular pour naviguer entre routes sans recharger.
💻 `<a routerLink="/membres">Membres</a>`.

### **`router-outlet`**
📖 Slot dans le template où Angular insère le composant de la route active.
💻 `<router-outlet />` dans `app.component.ts`.

---

## S

### **Sandbox**
📖 Environnement isolé pour exécuter du code dangereux sans risque pour le système.

### **Schéma**
📖 Description structurelle d'une base de données (tables, colonnes, relations).
💻 `prisma/schema.prisma`.

### **`select` (Prisma)**
📖 Option Prisma pour ne récupérer QUE les champs listés (whitelist). Opposé d'`include`.

### **Service (Angular)**
📖 Classe injectable contenant la logique métier réutilisable.
💻 `src/renderer/app/services/`.

### **`signal()`**
📖 Conteneur réactif Angular pour une valeur mutable.
🍕 Boîte aux lettres avec drapeau.
💻 `membres-list.component.ts:80`.

### **Singleton**
📖 Pattern où une classe n'a QU'UNE seule instance partagée.
🍕 Le président du pays.
💻 `prisma` dans `prisma-client.ts` ; tous les services Angular avec `providedIn: 'root'`.

### **SPA (Single Page Application)**
📖 App web qui ne recharge JAMAIS la page entière. Le routing change le contenu côté client.

### **SQL (Structured Query Language)**
📖 Langage standard pour interroger des bases relationnelles : `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

### **SQLite**
📖 Base SQL embarquée dans un seul fichier local. Pas de serveur.
💻 `prisma/dev.db`.

### **Standalone (Angular)**
📖 Composant qui s'importe lui-même ses dépendances, sans NgModule.
💻 `@Component({ standalone: true, imports: [...] })`.

### **Strict (TypeScript)**
📖 Mode TS qui active tous les checks (`noImplicitAny`, `strictNullChecks`, etc.).
💻 `"strict": true` dans `tsconfig.json:4`.

---

## T

### **Template (Angular)**
📖 HTML d'un composant avec syntaxe enrichie (`@if`, `@for`, `{{ }}`, `[prop]`, `(event)`).

### **Tree-shaking**
📖 Optimisation au build qui retire le code inutilisé du bundle final.

### **`try/catch`**
📖 Bloc JS pour intercepter une erreur (exception).
💻 Obligatoire dans tous les `ipcMain.handle` (exigence PDF).

### **TypeScript**
📖 Surcouche de JavaScript qui ajoute le typage statique.

---

## U

### **`update` (Prisma)**
📖 Méthode Prisma pour modifier une ligne. SQL : `UPDATE`.
💻 `prisma.membre.update({ where: { id }, data: {...} })`.

### **`update()` (Signal)**
📖 Méthode pour modifier un signal en fonction de sa valeur précédente.
💻 `this.membres.update(prev => prev.filter(m => m.id !== id))`.

### **`unknown`**
📖 Type TS qui force la vérification avant utilisation. Plus sûr que `any`.

### **UNIQUE**
📖 Contrainte SQL qui interdit les doublons sur une colonne.
💻 `email String @unique` dans `schema.prisma:63`.

---

## V

### **Validators (Angular)**
📖 Règles de validation prêtes à l'emploi pour les formulaires réactifs : `required`, `email`, `min`, `max`, `minLength`, `pattern`…

---

## W

### **`window.api`**
📖 Objet exposé sur le `window` global du renderer par le preload via `contextBridge.exposeInMainWorld('api', ...)`. Le SEUL point d'entrée vers le main.

---

## X / Y / Z

### **XSS (Cross-Site Scripting)**
📖 Faille de sécurité où un attaquant injecte du JS malicieux dans une page. Avec `nodeIntegration: false`, l'impact est limité au navigateur (pas au système).

### **Zone.js**
📖 Bibliothèque pour la détection de changements dans Angular (historique). Angular 19 avec signaux peut s'en passer (mode zoneless), mais on garde zone.js par défaut pour la compat.

---

## 🎯 Les 10 termes à connaître IMPÉRATIVEMENT à l'oral

1. **CRUD**
2. **PK / FK**
3. **Cascade / Restrict**
4. **JOIN / include**
5. **N:M / table de jonction explicite**
6. **signal / computed / effect**
7. **Singleton / providedIn: 'root'**
8. **contextBridge / contextIsolation**
9. **IPC (invoke + handle)**
10. **ORM / Prisma**

Si tu sais expliquer ces 10 termes avec leur analogie, **tu es prêt**. 💪
