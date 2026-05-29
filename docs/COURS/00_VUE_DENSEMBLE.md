# 📖 Cours 00 — Vue d'ensemble de TON projet

> 🎯 **Objectif du fichier** : à la fin, tu dois être capable d'expliquer en 2 minutes à ton prof « c'est quoi ton projet et comment il est architecturé ».

---

## 1. C'est quoi GymManager ?

**GymManager**, c'est une application de bureau (qu'on installe sur un ordi, pas dans un navigateur) qui sert à gérer une salle de sport :
- les **membres** (clients) qui s'inscrivent
- les **coachs** qui donnent des cours
- les **cours** (yoga, crossfit…) et leurs **séances** dans le temps
- les **salles** physiques où ces séances se déroulent
- les **inscriptions** des membres aux séances
- les **abonnements** payés (mensuel, trimestriel, annuel)
- un **tableau de bord statistique**

L'app fait du **CRUD** sur chacune de ces choses. CRUD ça veut dire :
- **C**reate (créer une ligne)
- **R**ead (lire/lister)
- **U**pdate (modifier)
- **D**elete (supprimer)

🗣️ **Phrase à dire à l'oral** : *« GymManager est une application desktop de gestion de salle de sport qui permet de faire le CRUD complet sur 7 tables liées entre elles, et qui affiche un tableau de bord statistique. »*

---

## 2. C'est quoi une app Electron ?

📖 **Définition simple** : **Electron** est une techno qui te permet de fabriquer une application desktop (Windows / macOS / Linux) en utilisant les technos du web (HTML, CSS, JavaScript).

🎯 **Pourquoi ?** Parce qu'écrire une vraie app native (genre en Swift pour Mac, en C# pour Windows) ça demande d'apprendre un langage par OS. Electron, tu écris UNE FOIS en JavaScript et ça tourne partout.

🍕 **Analogie** : Imagine Electron comme un **camion-pizzeria**. Le moteur (Chromium = Chrome sans la barre d'URL), c'est ce qui sert à afficher la « pizza » (ton interface). Le frigo et la cuisine derrière (Node.js), c'est ce qui prépare les ingrédients (lire la base de données, écrire des fichiers…). Tu te déplaces où tu veux (Windows, Mac, Linux) avec le même camion.

Des apps connues faites en Electron : **VSCode**, **Slack**, **Discord**, **WhatsApp Desktop**.

🗣️ **Phrase à dire** : *« Electron est un framework qui combine Chromium et Node.js pour fabriquer des apps de bureau multi-plateformes en JavaScript. »*

---

## 3. Pourquoi 3 processus (main / preload / renderer) ?

C'est LE point à comprendre. Tout le reste découle de ça.

Quand l'app tourne, il y a **3 acteurs en parallèle**, chacun avec son rôle. Ils communiquent entre eux.

### 🍕 L'analogie du restaurant

Imagine un restaurant :

| Acteur Electron | Métier dans le resto | Rôle |
|---|---|---|
| **Main process** (cuisine) | Le chef en cuisine | Il a accès au frigo (base de données), aux fours, aux couteaux. Il prépare les plats. |
| **Renderer** (salle) | Les clients à table | Ils voient, ils commandent, mais ils ne rentrent JAMAIS en cuisine (sécurité). |
| **Preload** (serveur) | Le serveur en livrée | Il fait la navette : il prend la commande des clients et la transmet au chef. Il rapporte le plat. |

🚨 **Pourquoi cette séparation ?** Parce que si un client (renderer) avait directement accès aux couteaux (Node.js), il pourrait blesser tout le monde. Imagine une faille de sécurité (XSS) dans la page : un attaquant pourrait exécuter `rm -rf /` (effacer le disque dur). Avec la séparation, c'est impossible.

### 📐 Schéma ASCII

```
┌──────────────────────────────────────────────────────────────────┐
│  MAIN PROCESS (le chef en cuisine, Node.js)                      │
│  • crée la fenêtre                                               │
│  • parle à Prisma → SQLite (dev.db)                              │
│  • écoute les commandes via ipcMain.handle('canal', ...)         │
│  Fichier : src/main/main.ts + src/main/ipc-handlers.ts           │
└────────────────┬─────────────────────────────────────────────────┘
                 │  IPC (canal de messages)
                 │
┌────────────────┴─────────────────────────────────────────────────┐
│  PRELOAD (le serveur en livrée)                                  │
│  • expose window.api avec contextBridge                          │
│  • appelle ipcRenderer.invoke('canal', payload)                  │
│  Fichier : src/preload/preload.ts                                │
└────────────────┬─────────────────────────────────────────────────┘
                 │  window.api.xxx(...)
                 │
┌────────────────┴─────────────────────────────────────────────────┐
│  RENDERER (les clients en salle, Angular dans Chromium)          │
│  • affiche l'UI                                                  │
│  • réagit aux clics                                              │
│  • n'a AUCUN accès direct à Node.js / fichiers / DB              │
│  Fichier : src/renderer/**                                       │
└──────────────────────────────────────────────────────────────────┘
```

🗣️ **Phrase à dire** : *« Electron sépare son code en 3 processus : le main, qui tourne en Node.js et a accès au système ; le renderer, qui affiche l'UI dans Chromium et est isolé ; et entre les deux, le preload, qui expose une API contrôlée via contextBridge. Cette séparation est une garantie de sécurité. »*

---

## 4. C'est quoi Prisma ?

📖 **Définition simple** : **Prisma** est un **ORM** — c'est-à-dire un outil qui transforme tes objets TypeScript en requêtes SQL automatiquement.

🎯 **Pourquoi ne pas écrire du SQL directement ?** Trois raisons :

1. **Type-safety** : Prisma génère des types TypeScript. Si tu te trompes de nom de colonne, ton IDE te le dit AVANT que tu lances le code. Avec du SQL brut, l'erreur n'apparaît qu'à l'exécution.

2. **Productivité** : `prisma.membre.create({ data: {...} })` est plus court que `INSERT INTO Membre (nom, prenom, email) VALUES (?, ?, ?)`.

3. **Migrations automatiques** : tu modifies ton `schema.prisma`, tu lances `prisma migrate dev`, et Prisma calcule tout seul les `ALTER TABLE` à exécuter. Magique.

🍕 **Analogie** : Prisma, c'est comme un **traducteur** entre toi (qui parles JavaScript/TypeScript) et la base de données (qui parle SQL). Tu lui dis « je veux créer un membre avec ces données », il traduit en `INSERT INTO Membre…` et te ramène le résultat au format objet JS.

💻 **Dans ton code** :
```ts
// Tu écris ça (lisible) :
const membre = await prisma.membre.create({
  data: { nom: 'Dupont', prenom: 'Marie', email: 'marie@gym.local', statut: 'ACTIF' }
});

// Prisma exécute ça (sous le capot) :
// INSERT INTO Membre (nom, prenom, email, statut, dateInscription)
//      VALUES ('Dupont', 'Marie', 'marie@gym.local', 'ACTIF', datetime('now'));
```

🗣️ **Phrase à dire** : *« Prisma est l'ORM qu'on utilise pour parler à la base de données. Il génère des types TypeScript à partir du schéma et transforme nos appels en requêtes SQL. »*

---

## 5. C'est quoi Angular ?

📖 **Définition simple** : **Angular** est un framework pour construire des interfaces utilisateur web complexes. Il découpe l'UI en petits morceaux réutilisables appelés **composants**.

🎯 **Pourquoi des composants ?** Parce qu'une UI peut vite devenir un plat de spaghettis. En la découpant en bouts (un composant = un bouton, une liste, un formulaire…), c'est lisible, réutilisable et testable.

🍕 **Analogie** : Imagine que ton UI est une **maison Lego**. Un composant Angular, c'est une **brique Lego** : tu peux la prendre, la mettre où tu veux, la remplacer, et elle s'emboîte avec d'autres briques. Chaque composant a son propre comportement et son propre rendu.

Dans ton projet, tu as **9 composants** :
- `MembresListComponent` : affiche la liste des membres
- `MembreFormComponent` : formulaire de création/édition d'un membre
- `MembreRowComponent` : une ligne du tableau des membres
- `CoachsListComponent`, `CoursListComponent`, `SallesListComponent`, `SeancesListComponent`, `AbonnementsListComponent`, `StatistiquesComponent`

🗣️ **Phrase à dire** : *« Angular est un framework SPA qui structure le renderer. On utilise les composants standalone (sans NgModule), les signaux pour l'état réactif, et le routage pour naviguer entre les pages. »*

---

## 6. C'est quoi SQLite ?

📖 **Définition simple** : **SQLite** est une base de données SQL qui tient dans **UN SEUL FICHIER** local (`dev.db` chez toi).

🎯 **Pourquoi SQLite et pas MySQL/PostgreSQL ?**

| Critère | SQLite | MySQL / Postgres |
|---|---|---|
| Installation | Aucune. C'est juste un fichier. | Serveur à installer, configurer, lancer. |
| Cloud | ❌ Pas de cloud par défaut | Souvent dans le cloud (AWS RDS…) |
| Adapté à | Apps desktop, mobiles, tests | Apps web multi-utilisateurs |

🚨 **C'est exactement ce que demande le PDF** : « **AUCUNE dépendance cloud** ». SQLite répond parfaitement à cette contrainte parce que tout est local.

🍕 **Analogie** : MySQL/Postgres, c'est un **gros serveur dans une salle séparée**. SQLite, c'est un **classeur dans ton tiroir**. Pour une app desktop solo, le classeur suffit largement.

💻 **Dans ton code** :
- `prisma/schema.prisma:20` → `provider = "sqlite"`
- `.env` → `DATABASE_URL="file:./dev.db"`
- Le fichier `prisma/dev.db` contient toute ta base.

🗣️ **Phrase à dire** : *« SQLite est une base SQL embarquée qui tient dans un fichier local. C'est parfait pour une app desktop : pas de serveur à installer, pas de cloud. Le PDF impose 100 % local, donc SQLite est le bon choix. »*

---

## 7. Comment toutes ces briques se parlent ?

### 📐 Schéma ASCII détaillé du flux complet

Prenons un exemple concret : **l'utilisateur clique sur « + Nouveau membre »**.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1 : L'utilisateur clique sur un bouton                             │
│                                                                          │
│   <button (click)="surSoumission()">Enregistrer</button>                 │
│   ↓                                                                      │
│   Angular détecte le clic                                                │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2 : Le composant Angular (renderer)                                │
│                                                                          │
│   surSoumission() {                                                      │
│     const payload = this.form.getRawValue();                             │
│     await this.membreService.creer(payload);                             │
│   }                                                                      │
│                                                                          │
│   Le composant délègue au service.                                       │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3 : Le service Angular                                             │
│                                                                          │
│   async creer(payload) {                                                 │
│     const reponse = await window.api.membres.creer(payload);             │
│     if (!reponse.success) throw new Error(reponse.error);                │
│     return reponse.data;                                                 │
│   }                                                                      │
│                                                                          │
│   Le service appelle window.api → c'est le preload qui a posé ça.        │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 4 : Le preload (encore dans le renderer mais isolé)                │
│                                                                          │
│   membres: {                                                             │
│     creer: (p) => ipcRenderer.invoke('membres:creer', p)                 │
│   }                                                                      │
│                                                                          │
│   Le preload envoie un MESSAGE IPC au main process.                      │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       ▼  (frontière de processus)
┌──────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 5 : Le main process reçoit le message                              │
│                                                                          │
│   ipcMain.handle('membres:creer', async (_event, payload) => {           │
│     try {                                                                │
│       const valid = valider(payload);                                    │
│       const cree = await prisma.membre.create({ data: valid });          │
│       return { success: true, data: cree };                              │
│     } catch (e) {                                                        │
│       return { success: false, error: e.message };                       │
│     }                                                                    │
│   });                                                                    │
│                                                                          │
│   Le handler appelle Prisma.                                             │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 6 : Prisma traduit en SQL                                          │
│                                                                          │
│   INSERT INTO Membre (nom, prenom, email, statut, dateInscription)       │
│        VALUES (?, ?, ?, ?, datetime('now'));                             │
│                                                                          │
│   Et exécute la requête sur dev.db.                                      │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 7 : SQLite écrit la ligne et renvoie l'id auto-généré              │
│                                                                          │
│   Nouvelle ligne dans la table Membre : id = 11.                         │
└──────────────────────────────────────┬───────────────────────────────────┘
                                       ▼  (remontée inverse)
              { success: true, data: { id: 11, ... } }
                                       ▼
   Le composant met à jour son signal → Angular redessine la liste.
```

🗣️ **Phrase à dire** : *« Quand l'utilisateur clique, l'événement passe du composant Angular au service, puis traverse le preload via window.api, qui utilise IPC pour atteindre le main process, où Prisma exécute la requête SQLite. La réponse remonte par le même chemin et met à jour le signal qui redessine l'UI. »*

---

## 8. Récap : les briques de TON projet

| Brique | Rôle | Fichier(s) clé(s) |
|---|---|---|
| **Electron** | Fabrique l'app de bureau | `src/main/main.ts` |
| **Node.js** | Tourne dans le main process | (implicite) |
| **Prisma** | Parle à la DB | `prisma/schema.prisma`, `src/main/prisma-client.ts` |
| **SQLite** | Stocke les données | `prisma/dev.db` |
| **contextBridge** | Pont sécurisé renderer ↔ main | `src/preload/preload.ts` |
| **IPC** | Canal de messages | `ipcMain.handle` + `ipcRenderer.invoke` |
| **Angular** | UI dans le renderer | `src/renderer/**` |
| **Signaux** | État réactif | `signal()` dans les composants |
| **TypeScript** | Sécurité du typage | partout (mode `strict: true`) |

---

## 9. Le pitch de 2 minutes (à mémoriser)

> *« GymManager est une application desktop de gestion de salle de sport, écrite en TypeScript strict. Elle est construite avec Electron qui sépare en 3 processus : le main, en Node.js, qui parle à la base SQLite via Prisma ; le renderer, en Angular standalone, qui affiche l'UI ; et entre les deux, un preload qui expose une API IPC contrôlée via contextBridge — c'est notre garantie de sécurité.*
>
> *La base contient 7 modèles avec 4 relations 1:N (Coach→Cours, Cours→Seance, Salle→Seance, Membre→Abonnement) et une relation N:M explicite Membre↔Seance via une table de jonction Inscription qui porte deux champs supplémentaires : dateInscription et presence.*
>
> *L'application fait du CRUD complet sur les 7 tables. Une page de statistiques agrège les données avec count, groupBy et include de Prisma, et utilise des signaux et computed côté Angular pour des valeurs dérivées réactives. »*

---

## 10. Mini-quiz pour te tester

Réponds dans ta tête. Si tu hésites, reviens au paragraphe correspondant.

1. Cite les 3 processus d'Electron et leur rôle.
2. Pourquoi le renderer ne peut PAS appeler Prisma directement ?
3. C'est quoi un ORM ? Donne-en un nom.
4. SQLite vs MySQL : pourquoi tu as choisi SQLite ici ?
5. Qu'est-ce qu'un composant Angular ? À quoi ça sert ?
6. Que se passe-t-il quand on clique « + Nouveau membre » ? (les 7 étapes)

Si tu as répondu juste aux 6 questions, tu peux passer au **cours 01** sur la base de données. 🎉
