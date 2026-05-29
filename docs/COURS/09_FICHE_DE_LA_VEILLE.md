# 📖 FICHE DE LA VEILLE DE L'ORAL — À RELIRE EN 10 MINUTES

> 🎯 **2 pages MAX**, tout ce qu'il faut avoir en tête juste avant d'entrer en salle.

---

## 🚀 Pitch de 30 secondes

> *« GymManager est une application desktop de gestion de salle de sport, en TypeScript strict, construite avec Electron qui sépare 3 processus : main (Node + Prisma + SQLite), renderer (Angular standalone) et preload (contextBridge sécurisé). La base contient 7 modèles avec 4 relations 1:N et une N:M explicite Membre↔Seance via Inscription qui porte dateInscription et presence. CRUD complet sur les 7 tables. J'utilise aussi une transaction Prisma pour la souscription d'abonnement, qui crée l'abonnement et active le membre atomiquement. »*

---

## 📐 Schéma archi (à dessiner si demandé)

```
┌─────────────────────────────────────────────────────────┐
│  MAIN (Node + Prisma)        ipcMain.handle('canal')    │
│       │                           ▲                     │
│       ▼                           │                     │
│   SQLite dev.db                   │ IPC                 │
└───────────────────────────────────┼─────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────┐
│  PRELOAD (contextBridge)          │                     │
│       contextBridge.exposeInMainWorld('api', api)       │
│            ipcRenderer.invoke('canal')                  │
└───────────────────────────────────▲─────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────┐
│  RENDERER (Angular)               │                     │
│   composant → service → window.api.xxx()                │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Les 7 modèles en une ligne chacun

1. **Membre** — clients de la salle (email UNIQUE, enum statut)
2. **Coach** — entraîneurs (donne plusieurs Cours, 1:N)
3. **Cours** — types d'activité (FK coachId, description nullable)
4. **Salle** — pièces physiques (equipements nullable)
5. **Seance** — instance datée d'un Cours dans une Salle (2 FK)
6. **Inscription** — N:M explicite Membre↔Seance avec `@@id([membreId, seanceId])`, dateInscription + presence
7. **Abonnement** — historique payé (enum MENSUEL/TRIMESTRIEL/ANNUEL)

**Relations clés** :
- Coach → Cours : 1:N **Restrict** (ne pas perdre la pédagogie)
- Cours → Seance : 1:N **Cascade** (séance orpheline sans cours)
- Salle → Seance : 1:N **Restrict** (ne pas supprimer salle utilisée)
- Membre → Inscription / Abonnement : 1:N **Cascade** (RGPD)
- Seance → Inscription : 1:N **Cascade**

---

## ✅ Les 13 notions Angular (annexe 5.1)

| Notion | Fichier:Ligne |
|---|---|
| 1. Composant standalone | tous les composants, ex `membre-row.component.ts:18` |
| 2. Interface TS | `models/domain.types.ts:17` |
| 3. `signal()` | `membres-list.component.ts:80` |
| 4. `computed()` | `membres-list.component.ts:91` |
| 5. `@for / @if` | `membres-list.component.ts:46, 62` |
| 6. Service + DI `inject()` | `membres-list.component.ts:77` |
| 7. Singleton `providedIn:'root'` | `membre.service.ts:19` |
| 8. `input.required<T>()` | `membre-row.component.ts:40` |
| 9. `output<T>()` | `membre-row.component.ts:43` |
| 10. Form réactif | `membre-form.component.ts:90-103` |
| 11. Routage | `app.routes.ts` (10 routes) |
| 12. `routerLink` | `app.component.ts:21-27` |
| 13. `effect()` *(bonus)* | `membres-list.component.ts:105` |

---

## ✅ Les 10 notions Prisma (annexe 5.2) + transaction

| Notion | Fichier:Ligne | Équivalent SQL |
|---|---|---|
| 1. 7 modèles | `schema.prisma:59,77,93,116,130,167,189` | 7 CREATE TABLE |
| 2. PK auto | partout | `INTEGER PRIMARY KEY AUTOINCREMENT` |
| 3. Relation 1:N + FK + onDelete | `schema.prisma:99,131,138,193` | `FOREIGN KEY ... REFERENCES ... ON DELETE ...` |
| 4. N:M `@@id([a,b])` | `schema.prisma:167-184` | `PRIMARY KEY (a, b)` |
| 5. Cascade ET Restrict | `schema.prisma:99 (R), 131 (C)` | `ON DELETE CASCADE/RESTRICT` |
| 6. `include` (JOIN) | `ipc-handlers.ts:91, 165, 247` | `SELECT * FROM x LEFT JOIN y` |
| 7. Agrégat `count`/`groupBy` | `ipc-handlers.ts:219, 228` | `COUNT(*)`, `GROUP BY` |
| 8. CRUD complet | `ipc-handlers.ts` (33 handlers) | INSERT/SELECT/UPDATE/DELETE |
| 9. Champs nullable | `schema.prisma:89, 113` | sans `NOT NULL` |
| 10. Enum | `schema.prisma:34, 45` | `TEXT CHECK(... IN (...))` |
| ⭐ **Transaction `$transaction`** | `ipc-handlers.ts:569-636` (`abonnements:souscrireEtActiver`) | `BEGIN TRANSACTION ... COMMIT / ROLLBACK` |

---

## 🔄 FLUX D'AJOUT — résumé en 5 lignes

1. Clic « Enregistrer » → `(ngSubmit)="surSoumission()"` (`membre-form.component.ts`)
2. `surSoumission` → `membreService.creer(payload)`
3. Service → `window.api.membres.creer(payload)` → preload `ipcRenderer.invoke('membres:creer', payload)`
4. Main `ipcMain.handle('membres:creer', ...)` → try/catch → `prisma.membre.create({ data })` → SQL `INSERT INTO Membre ...`
5. Retour `{ success: true, data }` remonte → composant fait `router.navigate(['/membres'])` → liste rechargée → signal `membres` mis à jour → @for redessine

---

## 🎤 LES 5 QUESTIONS LES PLUS PROBABLES

### Q1. « Pourquoi Cascade ici et Restrict là ? »
> *« Cascade quand l'enfant n'a aucun sens sans le parent — Inscription sans Membre n'a pas de sens, donc Cascade. Restrict pour protéger l'intégrité métier — on refuse de supprimer un Coach qui a encore des cours, parce qu'on perdrait la référence pédagogique. »*

### Q2. « Pourquoi une table de jonction explicite ? »
> *« Parce que je veux stocker dateInscription et presence SUR la relation Membre↔Seance. Une N:M implicite chez Prisma crée une table cachée avec uniquement les deux FK — impossible d'y ajouter des champs. Explicite = je garde le contrôle. »*

### Q3. « Rôle du preload ? »
> *« Le preload est le seul pont entre le renderer (Chromium isolé) et le main (Node). Avec contextIsolation: true et nodeIntegration: false, le renderer ne peut pas appeler require ou Prisma directement. Via contextBridge.exposeInMainWorld, j'expose une whitelist de fonctions sur window.api. Tout passe par ipcRenderer.invoke. »*

### Q4. « Différence signal vs computed ? »
> *« signal est mutable, source de vérité, modifié par .set ou .update. computed est dérivé en lecture seule, recalculé automatiquement quand un signal qu'il lit change. C'est comme une formule Excel. »*

### Q5. « Donne-moi le SQL d'une ligne Prisma. »
> Pour `prisma.membre.create({ data: { nom: 'X', ... } })` :
> ```sql
> INSERT INTO Membre (nom, prenom, email, statut, dateInscription)
>      VALUES (?, ?, ?, ?, datetime('now'));
> ```

### ⭐ Q6 BONUS. « C'est quoi ta transaction Prisma ? »
> *« Dans le handler `abonnements:souscrireEtActiver`, j'utilise prisma.\$transaction avec la syntaxe callback. Elle réunit deux opérations qui doivent réussir ensemble : créer l'abonnement (INSERT) et passer le membre à ACTIF (UPDATE). Si l'une plante, Prisma fait ROLLBACK automatique. SQL : BEGIN TRANSACTION ; INSERT ; UPDATE ; COMMIT. C'est l'Atomicité du modèle ACID. Sans transaction, on pourrait avoir un paiement encaissé sans le bénéfice côté membre. »*

---

## 🧠 ANTISÈCHE ANALOGIES (à mémoriser)

| Concept | Analogie |
|---|---|
| Main process | Chef en cuisine |
| Renderer | Clients en salle |
| Preload | Serveur en livrée + passe-plat avec grille |
| Signal | Boîte aux lettres avec drapeau |
| Computed | Formule Excel `=A1*B1` |
| Effect | Alarme |
| FK | Plaque d'immatriculation |
| PK composite | Carte d'embarquement (vol + passager) |
| ORM | Traducteur entre toi et la DB |
| Singleton | Le président d'un pays |
| Injection de dépendance | Commander un café au lieu de planter un caféier |
| Cascade | Fermer Netflix → historique disparaît |
| Restrict | Quitter une équipe → finis tes projets d'abord |
| SQLite vs MySQL | Classeur dans le tiroir vs gros serveur dans une salle |

---

## 🛡️ PHRASES DE SECOURS si tu sèches

- *« Je n'ai pas la ligne en tête, mais je sais que c'est dans le fichier X et la notion s'appelle Y. »*
- *« Si vous me laissez ouvrir le code, je peux vous montrer. »*
- *« Bonne question, je dirais [hypothèse]. Si vous voulez, on peut vérifier ensemble. »*

---

## 🎯 PHRASE D'OUVERTURE DE L'ORAL

> *« Bonjour. Mon projet est GymManager, une application desktop de gestion de salle de sport. La stack est Electron pour le bureau, Angular standalone pour l'UI, Prisma comme ORM, et SQLite en local — aucune dépendance cloud. L'architecture sépare strictement 3 processus : main, preload, renderer. Le main parle à la DB via Prisma. Le renderer affiche l'UI en Angular et passe par le preload qui expose window.api via contextBridge — c'est ma garantie de sécurité. La base a 7 modèles, dont une N:M explicite. CRUD complet sur les 7 tables. Toutes les notions Angular et Prisma de l'annexe du PDF sont implémentées. Je vous laisse poser vos questions. »*

---

## 🔥 TIPS DE LA DERNIÈRE MINUTE

1. **Avant l'oral** : ouvre `schema.prisma`, scroll de haut en bas, vois les 7 modèles.
2. **Pendant l'oral** : si on te demande un fichier, ne panique pas — l'arbo est dans le README et la fiche.
3. **Si tu doutes** : énonce l'analogie d'abord, puis le terme technique. Ça te donne du temps.
4. **Si on te creuse sur du SQL** : pense « INSERT/SELECT/UPDATE/DELETE + WHERE + JOIN + GROUP BY ». Ça couvre 95 % des questions.
5. **Si tu bloques sur une ligne** : *« Cette ligne fait X. La syntaxe précise je peux la retrouver dans le fichier. »* (= jouer la confiance sans bullshiter)

---

## 🥇 RAPPEL FINAL

Tu maîtrises ce projet. Tu l'as construit (avec mon aide). Toutes les exigences PDF sont remplies, vérifiées, taggées avec fichier:ligne.

**Va déchirer cet oral. 💪**

---

*P.S. : si tu as 5 minutes de plus la veille, relis surtout :*
- *06_LES_FLUX_COMPLETS.md (le plus probable à l'oral)*
- *07_QUESTIONS_PIEGES.md (catégorie B : Prisma & SQL)*
- *Cette fiche, deux fois*
