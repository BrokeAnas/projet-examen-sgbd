# 📖 Cours 03 — Le preload (le « serveur en livrée »)

> 🎯 **Objectif** : maîtriser le concept de preload + contextBridge. C'est LE point que les débutants ratent le plus à l'oral. On va le bétonner.

---

## 1. Le problème que résout le preload

Imagine deux mondes :

| Monde | Privilèges | Risques |
|---|---|---|
| **Main** (Node.js) | TOUT : fichiers, réseau, processus, DB | Dangereux si mal contrôlé |
| **Renderer** (Chromium) | Affichage uniquement, sandbox web | Vulnérable au XSS (JavaScript malicieux) |

🍕 **Analogie** : c'est comme un **labo de recherche** :
- La **salle d'instruments dangereux** (Node) est verrouillée.
- Le **hall public** (renderer) est ouvert mais sans matériel sensible.
- Un **comptoir d'accueil** (preload) sépare les deux : on peut demander quelque chose, mais seul le personnel autorisé entre dans le labo.

🚨 **Si on supprimait le preload et qu'on activait `nodeIntegration: true`** :
- Le renderer pourrait faire `require('child_process').exec('rm -rf /')`.
- Une simple faille XSS (injection JS via un champ de formulaire mal filtré) suffirait à effacer le disque dur.

C'est pour ça qu'**Electron impose désormais `contextIsolation: true` par défaut** et que le preload est OBLIGATOIRE pour faire le pont.

---

## 2. Les 3 niveaux d'isolation à comprendre

### 📖 `contextIsolation: true`

**Définition** : le `window` JavaScript du renderer est ISOLÉ du `window` du preload. Ils partagent le même DOM mais pas les mêmes variables JS.

🍕 **Analogie** : deux **bureaux mitoyens avec une cloison vitrée**. Tu vois la même pièce, mais tu ne peux pas piquer le stylo de l'autre.

**Conséquence pratique** : si le preload fait `window.foo = 'bar'`, le renderer NE VOIT PAS `window.foo`. Pour exposer des choses, il faut passer par `contextBridge.exposeInMainWorld(...)`.

### 📖 `nodeIntegration: false`

**Définition** : le renderer ne peut PAS utiliser `require()`, `process`, `module`, ni aucune API Node.

🍕 **Analogie** : on coupe le **WiFi entreprise** dans le hall public. Le visiteur a son téléphone perso, pas l'intranet.

### 📖 `sandbox: false`

**Définition** : le preload PEUT utiliser certaines API Node (notamment `require('electron')` pour `contextBridge` et `ipcRenderer`).

⚠️ Si on mettait `sandbox: true`, le preload serait dans un sandbox total et on ne pourrait plus appeler `require('electron')`. On utiliserait alors un module externe pour exposer l'API. Pour ce projet, `sandbox: false` simplifie sans réduire la sécurité (le preload est notre code, on lui fait confiance).

🗣️ **Phrase à dire** : *« contextIsolation true + nodeIntegration false = le renderer est cloisonné. Tout passage de Node vers le renderer doit passer explicitement par le preload via contextBridge. C'est l'état de l'art Electron moderne. »*

---

## 3. `contextBridge` : c'est quoi exactement ?

📖 **Définition simple** : `contextBridge` est une API Electron qui te permet d'exposer des fonctions du preload (qui a accès à Node) vers le renderer (qui n'y a pas accès), de manière CONTRÔLÉE et SÉCURISÉE.

🍕 **Analogie** : c'est le **passe-plat avec une grille**. Tu choisis ce qui passe (les plats), ce qui ne passe pas (les couteaux). Le client voit la grille, il sait ce qu'il peut commander, mais il ne peut pas attraper plus que ça.

### Syntaxe

```ts
contextBridge.exposeInMainWorld('api', {
  faireUnTruc: () => 'hello',
  unAutreTruc: (x) => x * 2,
});
```

Côté renderer, on accède via :
```ts
window.api.faireUnTruc();        // 'hello'
window.api.unAutreTruc(21);      // 42
```

🚨 **Restrictions** :
- On ne peut PAS exposer une classe (`new MaClasse()`) directement.
- Les valeurs passent par une copie sérialisée — pas de référence partagée.
- Les fonctions, oui, mais elles s'exécutent dans le contexte du preload.

---

## 4. Décortiquons MON `preload.ts` ligne par ligne

📂 Fichier : `src/preload/preload.ts`, 93 lignes.

### Bloc 1 : import (ligne 19)

```ts
import { contextBridge, ipcRenderer } from 'electron';
```

> On importe les deux outils dont on a besoin :
> - `contextBridge` : pour exposer l'API sur `window`.
> - `ipcRenderer` : pour ENVOYER des messages au main process.

### Bloc 2 : définition de l'API (lignes 23-85)

```ts
const api = {
  // ---------------- MEMBRES ----------------
  membres: {
    listerTous: () => ipcRenderer.invoke('membres:listerTous'),
    obtenirParId: (id: number) => ipcRenderer.invoke('membres:obtenirParId', id),
    creer: (payload: unknown) => ipcRenderer.invoke('membres:creer', payload),
    modifier: (id: number, payload: unknown) => ipcRenderer.invoke('membres:modifier', id, payload),
    supprimer: (id: number) => ipcRenderer.invoke('membres:supprimer', id),
  },
  // ... 6 autres groupes : coachs, cours, salles, seances, inscriptions, abonnements, statistiques
};
```

🔍 **Décortiquons une méthode** :

```ts
listerTous: () => ipcRenderer.invoke('membres:listerTous'),
```

> - `listerTous` : le nom qu'on expose côté renderer.
> - `() =>` : une fonction sans paramètre.
> - `ipcRenderer.invoke('membres:listerTous')` : envoie un message sur le canal `'membres:listerTous'` au main process et renvoie une Promise avec la réponse.

**`ipcRenderer.invoke` est l'API moderne d'Electron pour l'IPC asynchrone**. Elle remplace `ipcRenderer.send` + `ipcRenderer.on` (qui était plus verbeux et sans Promise).

### Bloc 3 : exposition (ligne 88)

```ts
contextBridge.exposeInMainWorld('api', api);
```

> Cette ligne dit : « rends l'objet `api` accessible au renderer via `window.api` ».

Côté renderer, après cette ligne :
```ts
await window.api.membres.listerTous();
// → renvoie { success: true, data: [...10 membres...] }
```

🗣️ **Phrase à dire** : *« Le preload définit un objet api avec des méthodes typées. Chaque méthode appelle ipcRenderer.invoke sur un canal nommé. contextBridge.exposeInMainWorld rend cet objet accessible au renderer via window.api. C'est une whitelist explicite — le renderer ne peut faire QUE ce que j'ai exposé. »*

---

## 5. Le flux complet : du clic à la base de données

```
┌─────────────────────────────────────────────────────────────────────┐
│  Composant Angular (renderer)                                       │
│                                                                     │
│   async surSuppression(id: number) {                                │
│     await this.membreService.supprimer(id);                         │
│   }                                                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MembreService (renderer)                                           │
│                                                                     │
│   async supprimer(id: number) {                                     │
│     const reponse = await window.api.membres.supprimer(id);         │
│     if (!reponse.success) throw new Error(reponse.error);           │
│   }                                                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Preload (renderer process mais contexte isolé)                     │
│                                                                     │
│   membres: {                                                        │
│     supprimer: (id) => ipcRenderer.invoke('membres:supprimer', id), │
│   }                                                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
                ╔══════════════════════════════════╗
                ║   FRONTIÈRE DE PROCESSUS         ║
                ║   Message IPC sérialisé          ║
                ║   Canal : 'membres:supprimer'    ║
                ║   Payload : 42                   ║
                ╚══════════════════╤═══════════════╝
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Main process                                                       │
│                                                                     │
│   ipcMain.handle('membres:supprimer', async (_event, id) => {       │
│     try {                                                           │
│       await prisma.membre.delete({ where: { id } });                │
│       return { success: true, data: { id } };                       │
│     } catch (e) {                                                   │
│       return { success: false, error: e.message };                  │
│     }                                                               │
│   });                                                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Prisma + SQLite                                                    │
│                                                                     │
│   DELETE FROM Membre WHERE id = 42;                                 │
│   (et cascade automatique sur Inscription et Abonnement)            │
└─────────────────────────────────────────────────────────────────────┘
```

Et la réponse remonte par le même chemin inverse jusqu'au composant qui met à jour son `signal`.

---

## 6. Pourquoi `ipcRenderer.invoke` et pas `ipcRenderer.send` ?

| API | Comportement |
|---|---|
| `ipcRenderer.send('canal', data)` + `ipcMain.on('canal', ...)` | Tire-et-oublie, pas de réponse directe. Pour répondre, il faut renvoyer un autre message. Vieillot. |
| **`ipcRenderer.invoke('canal', data)`** + **`ipcMain.handle('canal', ...)`** | Renvoie une Promise avec la valeur de retour du handler. Moderne et propre. |

🗣️ **Phrase à dire** : *« J'utilise le couple invoke/handle qui est l'API moderne basée sur les promises. Plus simple, plus propre, et ça permet d'écrire des handlers async qui renvoient un résultat. »*

---

## 7. Le typage de `window.api` (la cerise sur le gâteau)

📂 Fichier : `src/renderer/app/models/api.types.ts`.

```ts
export interface GymApi {
  membres: {
    listerTous: () => Promise<IpcResponse<Membre[]>>;
    obtenirParId: (id: number) => Promise<IpcResponse<MembreDetail>>;
    creer: (payload: CreerOuModifierMembrePayload) => Promise<IpcResponse<Membre>>;
    // ...
  };
  // ...
}

declare global {
  interface Window {
    api: GymApi;
  }
}
```

> Cette déclaration TypeScript dit : « le `window` global a maintenant une propriété `api` de type `GymApi` ». Du coup, partout dans le renderer, TypeScript te propose l'auto-complétion sur `window.api.membres.creer(...)` et te détecte les erreurs.

🎯 **Sans ce typage**, on aurait `window.api: any` et on perdrait toute la sécurité TypeScript. À l'oral, ce point fait la différence.

🗣️ **Phrase à dire** : *« Je type window.api côté renderer via une declare global. Ça donne l'auto-complétion partout et empêche les fautes de frappe sur les canaux. »*

---

## 8. 🎯 Questions piège — Spécial preload

### Q1. « Pourquoi tu as besoin d'un preload ? »
> Parce que avec `contextIsolation: true` et `nodeIntegration: false`, le renderer ne peut pas accéder à Node ni à Electron directement. Le preload est le SEUL endroit où je peux écrire du code qui a accès aux deux mondes. Je l'utilise pour exposer une API contrôlée via contextBridge.

### Q2. « Qu'est-ce qui se passerait si tu passais `nodeIntegration: true` ? »
> Le renderer aurait accès à `require()`, `process`, etc. Si un attaquant injectait du JS via une faille XSS, il pourrait exécuter n'importe quel code Node, y compris des appels système destructeurs. C'est exactement ce qu'on évite.

### Q3. « Pourquoi pas appeler `prisma` directement depuis le preload ? »
> Techniquement on pourrait (le preload a accès à Node). Mais ce serait une mauvaise pratique : le preload doit être MINIMAL et juste faire le pont. La logique métier (Prisma, validation) reste dans le main process. Comme ça, si demain on veut changer l'ORM ou la DB, on touche seulement au main.

### Q4. « Donne-moi un exemple concret de ce que `contextBridge` empêche. »
> Si je faisais `window.prisma = prisma` directement dans le preload, le renderer pourrait alors faire `window.prisma.membre.deleteMany()` et tout effacer. Avec contextBridge, je n'expose QUE des fonctions précises et nommées — pas l'objet Prisma entier.

### Q5. « C'est quoi la différence entre `ipcMain.handle` et `ipcMain.on` ? »
> `ipcMain.on` est event-based, ne renvoie rien — pour répondre il faut faire `event.reply`. `ipcMain.handle` est promise-based et la valeur retournée est automatiquement renvoyée à `ipcRenderer.invoke`. Plus propre.

### Q6. « Comment ton preload communique-t-il avec le main process ? »
> Via `ipcRenderer.invoke('canal', data)`. Ça envoie un message sérialisé au main process sur le canal nommé. Le main process, qui a fait `ipcMain.handle('canal', listener)`, reçoit, exécute, et renvoie une réponse — le tout via une Promise.

---

## 9. La règle d'or à mémoriser

> **« Le preload est un pont, pas une route. Il expose des fonctions précises, pas l'objet Prisma entier. »**

---

## 10. Mini-quiz

1. Que veut dire `contextIsolation: true` ?
2. Pourquoi `nodeIntegration: false` ?
3. Quelle ligne expose l'API au renderer ?
4. Différence entre `invoke/handle` et `send/on` ?
5. Comment je type `window.api` côté renderer ?

Réponses :
1. Le `window` du renderer est isolé du `window` du preload — ils partagent le DOM mais pas les variables JS.
2. Pour empêcher le renderer d'utiliser `require()` et les API Node — sécurité.
3. `contextBridge.exposeInMainWorld('api', api);` (preload.ts:88).
4. invoke/handle utilise des Promises pour le retour. send/on est event-based sans retour direct.
5. Avec `declare global { interface Window { api: GymApi } }` dans `api.types.ts`.

Si tout est OK, passe au **cours 04** sur les bases d'Angular. 🎉
