# 📖 Cours 02 — Le main process (le « chef en cuisine »)

> 🎯 **Objectif** : à la fin, tu dois pouvoir expliquer chaque ligne de `main.ts`, `prisma-client.ts` et un handler IPC type.

---

## 1. Concepts à connaître AVANT

### 📖 Process (processus)

Un **process** est une instance d'un programme qui tourne sur l'OS. Chaque process a sa propre mémoire et ses propres permissions.

🍕 **Analogie** : un process, c'est un **employé du restaurant**. Le chef en cuisine a accès aux couteaux. Le serveur a accès aux tables. Aucun des deux ne peut faire le travail de l'autre.

### 📖 Asynchrone / `async` / `await` / Promise

🍕 **Analogie de la pizza** : tu commandes une pizza. Tu pourrais rester planté devant le four à attendre (= **synchrone**, bloquant). Ou tu fais autre chose en attendant et tu viens chercher la pizza quand elle sonne (= **asynchrone**).

- **Promise** : c'est la « promesse » de te livrer un résultat plus tard. Genre un ticket de retrait.
- **`async`** devant une fonction : « cette fonction peut être asynchrone, elle renverra une Promise ».
- **`await`** : « attends que cette Promise soit résolue avant de continuer ».

```ts
async function chercherMembres() {
  const liste = await prisma.membre.findMany();   // on attend ici
  console.log(liste);                              // s'exécute APRÈS
}
```

### 📖 Singleton

Une seule et même instance d'un objet pour toute l'application.

🍕 **Analogie** : il n'y a qu'**un seul président** dans un pays. Tout le monde se réfère à lui, pas à des copies différentes.

### 📖 IPC (Inter-Process Communication)

Comment deux processus différents communiquent entre eux. Dans Electron, c'est par messages : on envoie un message sur un « canal », l'autre processus écoute ce canal.

🍕 **Analogie** : c'est le **passe-plat** entre la cuisine et la salle, avec une sonnette.

---

## 2. Le fichier `src/main/prisma-client.ts`

📂 Lignes 1-15.

```ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});
```

### Ligne par ligne :

**`import { PrismaClient } from '@prisma/client';`**
> On importe la classe `PrismaClient` du paquet `@prisma/client`. Ce paquet a été généré automatiquement par `prisma generate` à partir de notre `schema.prisma`. Il contient des TYPES TypeScript pour chacun de nos 7 modèles.

**`export const prisma = new PrismaClient({ log: ['warn', 'error'] });`**
> On crée UNE instance de PrismaClient et on l'exporte. Tous les autres fichiers du main qui importent `prisma` recevront cette MÊME instance. C'est le pattern **singleton**.

🎯 **Pourquoi un singleton ?**

Chaque `new PrismaClient()` ouvre un **pool de connexions** à la base. Si tu en crées 50, tu gaspilles 50 connexions et tu risques des fuites mémoire. Une seule instance = un seul pool = propre.

🗣️ **Phrase à dire** : *« J'instancie PrismaClient une seule fois et je l'exporte. C'est le pattern singleton, pour ne pas multiplier les connexions à la DB. »*

❓ **Question piège** : *« Et si tu mettais ton `prisma-client.ts` dans le renderer ? »*
> Mauvaise idée. PrismaClient utilise Node.js (file system, etc.). Le renderer ne peut pas l'exécuter (et c'est voulu, sécurité). Prisma ne doit vivre QUE dans le main process.

---

## 3. Le fichier `src/main/main.ts` — ligne par ligne

📂 Fichier complet : 76 lignes.

### Bloc 1 : les imports (lignes 15-18)

```ts
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { prisma } from './prisma-client';
```

**`import { app, BrowserWindow } from 'electron';`**
> On importe deux objets du paquet `electron` :
> - `app` : le contrôleur du cycle de vie de l'application (démarrer, quitter, écouter les événements).
> - `BrowserWindow` : la classe pour créer une fenêtre visible à l'écran.

**`import * as path from 'path';`**
> Module Node.js standard pour manipuler les chemins de fichiers. `path.join(...)` assemble un chemin proprement (avec `/` sur Mac/Linux, `\` sur Windows).

**`import { registerIpcHandlers } from './ipc-handlers';`**
> On importe notre propre fonction qui enregistrera tous les `ipcMain.handle(...)` (les 32 canaux IPC).

**`import { prisma } from './prisma-client';`**
> Le singleton Prisma — pour pouvoir le déconnecter proprement avant de fermer l'app.

---

### Bloc 2 : la fonction `createWindow()` (lignes 20-46)

```ts
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'GymManager',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, '..', '..', 'preload', 'preload', 'preload.js'),
    },
  });

  const indexPath = path.join(__dirname, '..', '..', 'renderer', 'browser', 'index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
```

**`let mainWindow: BrowserWindow | null = null;`**
> On déclare une variable qui contiendra notre fenêtre. Au démarrage elle est `null`. `BrowserWindow | null` est un type UNION TypeScript : la variable peut contenir soit une BrowserWindow, soit null.

**`mainWindow = new BrowserWindow({ width: 1280, height: 800, ... })`**
> On crée la fenêtre. Largeur 1280, hauteur 800 pixels. Le titre s'affiche dans la barre de fenêtre.

🚨 **La clé `webPreferences` est CRUCIALE pour la sécurité** :

**`contextIsolation: true`**
> Le `window` du renderer est ISOLÉ du `window` du preload. C'est ce qui empêche le renderer de tripatouiller les objets que le preload utilise.

**`nodeIntegration: false`**
> Le renderer ne peut PAS appeler `require()`, `process`, `__dirname`, ni aucune API Node.js. Sécurité maximale.

**`sandbox: false`**
> Le preload peut quand même utiliser certaines API Node (comme `require('electron')`). Si on mettait `true`, le preload serait dans un sandbox total et on n'aurait plus accès à `ipcRenderer`.

**`preload: path.join(__dirname, '..', '..', 'preload', 'preload', 'preload.js')`**
> Chemin absolu vers notre preload compilé. `__dirname` est le dossier où se trouve main.js compilé (= `dist/main/main/`). On remonte de 2 niveaux puis on entre dans `preload/preload/preload.js`.

**`mainWindow.loadFile(indexPath);`**
> On charge le HTML buildé par Angular dans la fenêtre. C'est l'équivalent de taper une URL dans Chrome, sauf qu'on charge un fichier local.

**`mainWindow.on('closed', () => { mainWindow = null; });`**
> Quand la fenêtre est fermée, on remet la variable à `null` pour qu'elle puisse être garbage-collectée (libération mémoire).

🗣️ **Phrase à dire** : *« createWindow crée la BrowserWindow avec une config de sécurité stricte : contextIsolation true, nodeIntegration false. Le renderer est totalement cloisonné. »*

---

### Bloc 3 : le cycle de vie (lignes 51-76)

```ts
app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await prisma.$disconnect();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await prisma.$disconnect();
});
```

**`app.whenReady().then(() => { ... });`**
> `app.whenReady()` renvoie une Promise qui se résout quand Electron est prêt à créer des fenêtres. Avant ce moment, créer une BrowserWindow planterait. On fait deux choses :
> 1. `registerIpcHandlers()` AVANT `createWindow()` — sinon le renderer pourrait appeler des canaux pas encore branchés.
> 2. `createWindow()` ouvre la fenêtre.

**`app.on('activate', () => { ... });`**
> Spécifique macOS : sur Mac, fermer la dernière fenêtre ne quitte pas l'app (l'icône reste dans le dock). Quand on clique sur l'icône dock, l'événement `activate` se déclenche et on recrée la fenêtre si besoin.

**`app.on('window-all-closed', async () => { ... });`**
> Quand toutes les fenêtres sont fermées. On déconnecte Prisma proprement (fermer le pool de connexions), puis on quitte l'app — SAUF sur Mac (`darwin`) où c'est l'usage de laisser l'app vivante jusqu'à Cmd+Q.

**`app.on('before-quit', async () => { ... });`**
> Avant de quitter pour de bon (Cmd+Q sur Mac), on déconnecte Prisma. Sécurité.

🗣️ **Phrase à dire** : *« On enregistre d'abord les handlers IPC, puis on crée la fenêtre. Au moment où l'app se ferme, on déconnecte proprement Prisma. »*

---

## 4. Le fichier `src/main/ipc-handlers.ts`

📂 Fichier complet : 570 lignes, 32 handlers `ipcMain.handle(...)`.

### Vue d'ensemble

Le fichier exporte UNE fonction `registerIpcHandlers()` qui contient TOUS les handlers IPC. Cette fonction est appelée une seule fois au démarrage par `main.ts`.

```ts
export function registerIpcHandlers(): void {
  ipcMain.handle('membres:listerTous', async () => { ... });
  ipcMain.handle('membres:obtenirParId', async (_event, id) => { ... });
  ipcMain.handle('membres:creer', async (_event, payload) => { ... });
  // ... 29 autres
}
```

### Le pattern de réponse standardisé

Chaque handler renvoie un objet de type `IpcResponse<T>` :

```ts
type IpcResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

🎯 **Pourquoi ce format ?** Pour ne JAMAIS laisser une Promise rejected remonter au renderer. Si Prisma plante, on convertit l'erreur en `{ success: false, error: "message" }`. Côté Angular, on vérifie `if (!reponse.success)` et on throw une erreur claire.

Helpers en haut du fichier (lignes 37-44) :
```ts
function ok<T>(data: T) {
  return { success: true as const, data };
}
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[IPC] Erreur :', message);
  return { success: false as const, error: message };
}
```

🚨 **`as const`** force le compilateur à inférer le littéral `true` (et pas `boolean`). Combiné à `false as const` dans `fail`, ça permet à TypeScript de comprendre qu'on a un type union discriminé.

---

### Décortiquons un handler : `membres:creer` (lignes 108-116)

```ts
ipcMain.handle('membres:creer', async (_event, payload: unknown) => {
  try {
    const donneesValidees = valider(payload);
    const cree = await prisma.membre.create({ data: donneesValidees });
    return ok(cree);
  } catch (e) {
    return fail(e);
  }
});
```

**Ligne 1 — `ipcMain.handle('membres:creer', async (_event, payload: unknown) => {`**
> `ipcMain.handle` enregistre un handler sur le canal `'membres:creer'`. Quand quelqu'un (= le preload) fait `ipcRenderer.invoke('membres:creer', payload)`, notre fonction est appelée.
> - `_event` : objet Electron de l'événement (qui a envoyé, dans quel frame…). On l'ignore avec le préfixe `_`.
> - `payload: unknown` : la donnée envoyée. Type `unknown` parce que c'est venu du renderer, on ne fait pas confiance par défaut.

**Ligne 2-5 — Le bloc `try/catch`**
> Le PDF impose try/catch sur chaque handler. Pourquoi ?
> 1. Si Prisma lève une exception (FK violation, etc.), elle ne doit PAS remonter brute au renderer (info sensible).
> 2. On la convertit en `{ success: false, error: "message" }` que l'UI sait gérer.

**Ligne 3 — `const donneesValidees = valider(payload);`**
> On valide manuellement le payload (helper `valider` lignes 47-65). Si quelque chose manque ou est invalide, on throw une erreur claire qui sera attrapée par le catch.

**Ligne 4 — `const cree = await prisma.membre.create({ data: donneesValidees });`**
> Appel Prisma. `prisma.membre.create` est typé : `data` doit avoir la forme d'un `MembreCreateInput` (généré à partir du schema). Si tu mets un mauvais nom de champ, TypeScript râle.
> SQL équivalent : `INSERT INTO Membre (nom, prenom, email, statut, dateInscription) VALUES (?, ?, ?, ?, datetime('now'))`.

**Ligne 5 — `return ok(cree);`**
> On enveloppe la donnée dans `{ success: true, data: cree }`.

**Ligne 7 — `return fail(e);`**
> En cas d'erreur, on log côté main et on renvoie `{ success: false, error: "..." }` au renderer.

🗣️ **Phrase à dire** : *« Chaque handler suit le même pattern : ipcMain.handle('canal', async (_event, payload) => { try { … prisma … return ok(data) } catch (e) { return fail(e) } }). C'est conforme à la consigne 'try/catch obligatoire sur tous les ipcMain.handle'. »*

---

### Un handler avec JOIN (`include`) : `membres:obtenirParId` (lignes 87-103)

```ts
ipcMain.handle('membres:obtenirParId', async (_event, id: number) => {
  try {
    const membre = await prisma.membre.findUnique({
      where: { id },
      include: {
        abonnements: { orderBy: { dateDebut: 'desc' } },
        inscriptions: {
          include: { seance: { include: { cours: true } } },
          orderBy: { dateInscription: 'desc' },
        },
      },
    });
    if (!membre) throw new Error(`Membre ${id} introuvable.`);
    return ok(membre);
  } catch (e) {
    return fail(e);
  }
});
```

**`prisma.membre.findUnique({ where: { id }, include: { ... } })`**
> Cherche UN membre par son id. `include` demande à Prisma de récupérer en plus :
> - tous ses `abonnements` triés par date décroissante
> - toutes ses `inscriptions`, avec pour chacune sa `seance` et le `cours` de cette séance (imbrication sur 3 niveaux !)

SQL équivalent (simplifié) :
```sql
SELECT * FROM Membre WHERE id = ?;
SELECT * FROM Abonnement WHERE membreId = ? ORDER BY dateDebut DESC;
SELECT * FROM Inscription i
  JOIN Seance s ON i.seanceId = s.id
  JOIN Cours c ON s.coursId = c.id
  WHERE i.membreId = ? ORDER BY i.dateInscription DESC;
```

Prisma fait plusieurs requêtes optimisées et te ramène un objet imbriqué tout propre.

🗣️ **Phrase à dire** : *« Ici j'utilise `include` pour récupérer le membre avec ses abonnements et ses inscriptions imbriquées. C'est l'équivalent d'un JOIN multi-niveaux en SQL. »*

---

### Un handler avec agrégat : `statistiques:obtenir` (lignes 213-275)

Extrait clé :

```ts
// 1) COUNT : nombre de membres actifs
const nombreMembresActifs = await prisma.membre.count({
  where: { statut: 'ACTIF' },
});

// 2) COUNT total
const nombreMembresTotal = await prisma.membre.count();

// 3) GROUP BY : nombre de cours par coach
const groupes = await prisma.cours.groupBy({
  by: ['coachId'],
  _count: { _all: true },
});
```

**`prisma.membre.count({ where: { statut: 'ACTIF' } })`**
> Renvoie un nombre (le COUNT). SQL : `SELECT COUNT(*) FROM Membre WHERE statut = 'ACTIF'`.

**`prisma.cours.groupBy({ by: ['coachId'], _count: { _all: true } })`**
> Regroupe les cours par `coachId` et compte combien il y en a dans chaque groupe.
> SQL : `SELECT coachId, COUNT(*) FROM Cours GROUP BY coachId`.

🗣️ **Phrase à dire** : *« Pour les stats, j'utilise prisma.membre.count avec un where pour compter les actifs, et prisma.cours.groupBy pour regrouper les cours par coach — ce sont des agrégats SQL. »*

---

## 5. Les 32 handlers — vue synthétique

| Canal IPC | Action | Méthode Prisma |
|---|---|---|
| `membres:listerTous` | Lister | `findMany` |
| `membres:obtenirParId` | Détail | `findUnique` + include |
| `membres:creer` | Créer | `create` |
| `membres:modifier` | Modifier | `update` |
| `membres:supprimer` | Supprimer | `delete` |
| `coachs:listerTous` | Lister | `findMany` + include |
| `coachs:creer` / `modifier` / `supprimer` | CRUD | `create` / `update` / `delete` |
| `cours:listerTous` / `obtenirParId` / `creer` / `modifier` / `supprimer` | CRUD complet | idem |
| `salles:listerTous` / `creer` / `modifier` / `supprimer` | CRUD | idem |
| `seances:listerTous` / `prochaines` / `creer` / `modifier` / `supprimer` | CRUD + filtre | idem |
| `inscriptions:listerToutes` / `inscrire` / `modifierPresence` / `desinscrire` | CRUD sur la N:M | idem |
| `abonnements:listerTous` / `creer` / `modifier` / `supprimer` | CRUD | idem |
| `statistiques:obtenir` | Agrégats | `count` + `groupBy` + `findMany` |

**Total** : 32 handlers, 32 try/catch (vérifié).

---

## 6. 🎯 Questions piège possibles

### Q1. « Pourquoi `registerIpcHandlers()` AVANT `createWindow()` ? »
> Parce que dès que la fenêtre s'ouvre, le renderer peut appeler des canaux IPC. Si les handlers ne sont pas branchés, l'appel renverra une erreur « No handler registered ».

### Q2. « Pourquoi `_event` au lieu de `event` ? »
> Convention TypeScript : un paramètre dont le nom commence par `_` est SCIEMMENT inutilisé. Sinon le linter râlerait.

### Q3. « Pourquoi `payload: unknown` et pas `payload: any` ? »
> `any` désactive complètement le typage (dangereux). `unknown` force à vérifier le type avant d'utiliser la valeur. Mon helper `valider()` fait cette vérification.

### Q4. « Que se passe-t-il si Prisma rejette la Promise dans un handler ? »
> Le `try/catch` attrape l'erreur. `fail(e)` extrait le message, le logue côté main, et renvoie `{ success: false, error: "..." }` au renderer. L'utilisateur voit un message clair, pas un crash.

### Q5. « Pourquoi `await prisma.$disconnect()` avant de quitter ? »
> Pour fermer proprement le pool de connexions SQLite. Sinon, dans certains cas, le fichier `dev.db` pourrait rester verrouillé.

---

## 7. Mini-quiz

1. C'est quoi le pattern singleton et pourquoi Prisma l'utilise chez nous ?
2. Donne la signature complète d'un `ipcMain.handle`.
3. Pourquoi `try/catch` est-il obligatoire ?
4. Que fait `prisma.membre.count({ where: { statut: 'ACTIF' } })` en SQL ?
5. Cite la valeur de `contextIsolation` et explique pourquoi.

Réponses :
1. Une seule instance pour toute l'app. Évite de multiplier les pools de connexions.
2. `ipcMain.handle(canal: string, listener: (event, ...args) => Promise<T> | T)`.
3. Pour intercepter les erreurs Prisma et les convertir en réponse propre `{ success: false, error }`.
4. `SELECT COUNT(*) FROM Membre WHERE statut = 'ACTIF';`
5. `true`. Isole le contexte JS du renderer du contexte JS du preload — sécurité contre XSS.

Si tout est OK, passe au **cours 03** sur le preload. 🎉
