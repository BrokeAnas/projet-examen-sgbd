# Fiche de révision pour l'oral — GymManager

> Document à relire la veille de l'oral. L'oral pèse **70 % de la note**.

---

## 1. Les 10 questions les plus probables (avec réponses détaillées)

### Q1. Pourquoi `Cascade` ici et `Restrict` là ?

**Cascade** = quand on supprime le parent, les enfants partent automatiquement.
**Restrict** = la suppression du parent est REFUSÉE tant qu'il a des enfants.

| Relation | onDelete | Pourquoi |
|---|---|---|
| Coach → Cours | **Restrict** | On refuse de supprimer un coach qui anime encore des cours. Sécurité métier : on perdrait la référence pédagogique. L'admin doit d'abord réassigner les cours. |
| Salle → Seance | **Restrict** | On ne supprime pas une salle dont des séances sont planifiées. Sinon on aurait des séances orphelines (sans lieu). |
| Cours → Seance | **Cascade** | Une séance n'a pas de sens sans son cours parent. On nettoie. |
| Seance → Inscription | **Cascade** | Si on annule une séance, les inscriptions n'ont plus aucun sens. |
| Membre → Inscription | **Cascade** | RGPD : effacer un membre = effacer son historique de présence. |
| Membre → Abonnement | **Cascade** | Idem RGPD. |

**SQL équivalent** :
```sql
FOREIGN KEY (coachId) REFERENCES Coach(id) ON DELETE RESTRICT
FOREIGN KEY (coursId) REFERENCES Cours(id) ON DELETE CASCADE
```

---

### Q2. `include` vs `select` en Prisma ?

| Mot-clé | Comportement | Quand l'utiliser |
|---|---|---|
| **`include`** | Renvoie le modèle ENTIER + les relations imbriquées en plus | Quand tu veux tout récupérer d'un coup (pratique en dev) |
| **`select`** | Renvoie UNIQUEMENT les champs listés (whitelist) | Quand tu veux optimiser : ne ramener que `nom` et `prenom` au lieu de tout |

```ts
// include : renvoie tout le coach + tous ses cours
prisma.coach.findUnique({ where: { id: 1 }, include: { cours: true } });

// select : renvoie UNIQUEMENT nom et prenom
prisma.coach.findUnique({ where: { id: 1 }, select: { nom: true, prenom: true } });
```

SQL : `include` ressemble à `SELECT *` + `JOIN`, `select` ressemble à `SELECT col1, col2`.

---

### Q3. `signal()` vs `computed()` vs `effect()` ?

| API | Type | Rôle |
|---|---|---|
| `signal(x)` | VALEUR mutable | Source de vérité. Modifiée via `.set(v)` ou `.update(prev => …)`. |
| `computed(() => …)` | VALEUR dérivée, en lecture seule | Recalculée AUTOMATIQUEMENT quand un signal qu'elle lit change. Pas de side-effect. |
| `effect(() => …)` | SIDE-EFFECT | Exécute du code (log, requête, DOM) quand un signal qu'il lit change. Ne renvoie pas de valeur. |

Exemple dans `membres-list.component.ts` :
```ts
readonly membres = signal<Membre[]>([]);                          // SOURCE
readonly nombreMembresActifs = computed(                          // DÉRIVÉ
  () => this.membres().filter(m => m.statut === 'ACTIF').length
);
effect(() => { console.log('Filtre :', this.filtreActif()); });   // SIDE-EFFECT
```

---

### Q4. Pourquoi une table de jonction `Inscription` EXPLICITE plutôt qu'implicite ?

Une N:M **implicite** dans Prisma s'écrit :
```prisma
model Membre { seances Seance[] }
model Seance { membres Membre[] }
```
Prisma crée alors une table cachée `_MembreToSeance` avec UNIQUEMENT les deux FK. **Impossible d'y ajouter des colonnes.**

Une N:M **explicite** :
```prisma
model Inscription {
  membreId        Int
  membre          Membre @relation(...)
  seanceId        Int
  seance          Seance @relation(...)
  dateInscription DateTime @default(now())   // ← ce champ supplémentaire est la raison d'être
  presence        Boolean  @default(false)   // ← idem
  @@id([membreId, seanceId])                  // PK composite
}
```

Chez nous, on veut stocker `dateInscription` et `presence` SUR la relation → explicite obligatoire.

**SQL équivalent** :
```sql
CREATE TABLE Inscription (
  membreId INTEGER NOT NULL,
  seanceId INTEGER NOT NULL,
  dateInscription DATETIME DEFAULT CURRENT_TIMESTAMP,
  presence INTEGER DEFAULT 0,
  PRIMARY KEY (membreId, seanceId),
  FOREIGN KEY (membreId) REFERENCES Membre(id) ON DELETE CASCADE,
  FOREIGN KEY (seanceId) REFERENCES Seance(id) ON DELETE CASCADE
);
```

---

### Q5. Rôle du preload et pourquoi `contextIsolation: true` ?

**Architecture Electron** : 3 processus.

| Processus | Privilèges | Risques |
|---|---|---|
| Main (Node.js + Prisma) | Accès complet au système | Si compromis → désastre |
| Renderer (Chromium + JS) | Sandbox web | Vulnérable au XSS → on doit l'isoler |
| Preload | Pont contrôlé | Le SEUL endroit où on définit ce que le renderer peut faire |

`contextIsolation: true` force le `window` du renderer à être ISOLÉ du contexte du preload. Le renderer ne peut PAS appeler `require('fs')` ni manipuler les API Node.

`nodeIntegration: false` désactive le `require()` global dans le renderer.

Le preload utilise `contextBridge.exposeInMainWorld('api', { ... })` pour exposer SEULEMENT certaines fonctions sur `window.api`. C'est une whitelist explicite.

**Si on activait `nodeIntegration: true` :** une faille XSS dans l'UI donnerait accès à `require('child_process').exec('rm -rf /')`. ❌ Très dangereux.

---

### Q6. Pourquoi `providedIn: 'root'` = singleton ?

```ts
@Injectable({ providedIn: 'root' })
export class MembreService { ... }
```

Angular construit un INJECTEUR HIÉRARCHIQUE. `providedIn: 'root'` enregistre le service dans l'injecteur RACINE.

Conséquence : quand n'importe quel composant fait `inject(MembreService)`, Angular remonte l'arbre et trouve la MÊME INSTANCE à chaque fois.

Avantages :
- Un seul point de cache / état partagé
- Tree-shaking : si personne n'utilise le service, il est retiré du bundle final
- Pas besoin d'enregistrer le service manuellement dans un `providers: []`

---

### Q7. Équivalent SQL d'une relation Prisma ?

Pour chaque `@relation(fields: [...], references: [...], onDelete: ...)`, Prisma génère :

```prisma
model Cours {
  coachId Int
  coach   Coach @relation(fields: [coachId], references: [id], onDelete: Restrict)
}
```

⇒ Migration SQL générée :
```sql
CREATE TABLE Cours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ...
  coachId INTEGER NOT NULL,
  FOREIGN KEY (coachId) REFERENCES Coach(id) ON DELETE RESTRICT
);
```

Tu peux vérifier toi-même : ouvre `prisma/migrations/20260518170015_init/migration.sql`.

---

### Q8. Différence entre `@id` et `@@id` ?

| Syntaxe | Sens | Exemple |
|---|---|---|
| `@id` (un seul `@`) | Modifie UN champ, le marque comme PK simple | `id Int @id @default(autoincrement())` |
| `@@id([a, b])` (deux `@@`) | Modifie le MODÈLE entier, crée une PK COMPOSITE sur plusieurs colonnes | `@@id([membreId, seanceId])` |

`@@` = annotations au niveau du modèle (id composite, index, unique multi-colonnes).
`@` = annotations au niveau du champ (PK simple, unique, default).

---

### Q9. Que se passe-t-il quand je clique sur "Créer un membre" ?

**Flux complet** (à mémoriser pour l'oral) :

```
1) UI (membre-form.component.ts)
   - Formulaire réactif (FormBuilder + Validators)
   - L'utilisateur clique "Enregistrer" → surSoumission()

2) Service Angular (membre.service.ts)
   - membreService.creer(payload)
   - Appel direct à window.api.membres.creer(payload)

3) Preload (preload.ts)
   - window.api.membres.creer → ipcRenderer.invoke('membres:creer', payload)

4) Main process (ipc-handlers.ts)
   - ipcMain.handle('membres:creer', async (_, payload) => { ... })
   - try/catch obligatoire
   - validation du payload
   - prisma.membre.create({ data: donneesValidees })
     → Prisma génère : INSERT INTO Membre (...) VALUES (?, ?, ?, ?)
     → SQLite insère
     → Retour de l'objet créé

5) Retour
   - { success: true, data: nouveauMembre } sérialisé via IPC
   - Service Angular déballe → renvoie nouveauMembre
   - Le composant met à jour son signal → l'UI se redessine automatiquement
```

---

### Q10. Pourquoi des champs optionnels (`String?`) ?

Le `?` après le type rend le champ NULLABLE en base : la colonne peut contenir `NULL`.

```prisma
description String?     // peut être NULL
equipements String?     // peut être NULL
```

SQL équivalent : `description TEXT NULL` au lieu de `TEXT NOT NULL`.

**Quand l'utiliser ?** Quand l'information n'est pas obligatoire métier. Ex :
- Un cours peut ne pas avoir de description (titre suffit)
- Une salle peut ne pas avoir d'équipements listés

Côté TypeScript, Prisma génère le type `string | null`, ce qui force le développeur à gérer le cas null (sécurité du typage strict).

---

## 2. Notions obligatoires PDF — Définition + Où c'est dans MON code

### Annexe 5.1 — Angular

| Notion | Définition 1 ligne | Mon code |
|---|---|---|
| Composant standalone | Composant qui s'importe directement (sans NgModule), via `imports: [...]` dans le décorateur | Tous mes composants — `membre-row.component.ts:18` (`standalone: true`) |
| TypeScript interfaces | Type de données défini avec `interface X { ... }` | `models/domain.types.ts:17` (`interface Membre`) |
| `signal()` | Conteneur réactif d'une valeur mutable | `membres-list.component.ts:80` (`signal<Membre[]>([])`) |
| `computed()` | Valeur dérivée d'un ou plusieurs signaux, recalculée auto | `membres-list.component.ts:91` (`nombreMembresActifs`) |
| `effect()` | Side-effect réactif | `membres-list.component.ts:105` (log filtre) |
| `@for` / `@if` | Control flow du template (Angular ≥ 17) | `membres-list.component.ts:46` (@if), `:62` (@for) |
| Service + DI | Classe injectable récupérée via `inject()` | `membres-list.component.ts:77` |
| Singleton | Service unique pour toute l'app | `membre.service.ts:19` (`providedIn: 'root'`) |
| `input.required<T>()` | Propriété d'entrée OBLIGATOIRE d'un composant enfant | `membre-row.component.ts:40` |
| `output<T>()` | Événement émis vers le parent | `membre-row.component.ts:43` |
| Formulaire réactif | Form construit en TypeScript (FormBuilder + Validators) | `membre-form.component.ts:90-103` |
| Routage | Configuration des routes + `<router-outlet>` | `app.routes.ts` + `app.component.ts:28` |
| RouterLink | Navigation déclarative dans le template | `app.component.ts:21-27` |

### Annexe 5.2 — Prisma (équivalent SQL inclus)

| Notion | Définition | Prisma | SQL équivalent | Mon code |
|---|---|---|---|---|
| PK auto-incrémentée | Identifiant unique généré par la DB | `@id @default(autoincrement())` | `id INTEGER PRIMARY KEY AUTOINCREMENT` | `schema.prisma:60` |
| Contrainte UNIQUE | Pas de doublon sur un champ | `@unique` | `UNIQUE` | `schema.prisma:63` (email) |
| Relation 1:N | Un parent, plusieurs enfants | `@relation(fields: [fk], references: [id])` | `FOREIGN KEY (fk) REFERENCES Parent(id)` | `schema.prisma:107` |
| Relation N:M explicite | Table pivot avec champs additionnels | `model Inscription { @@id([a, b]) }` | `CREATE TABLE … PRIMARY KEY (a, b)` | `schema.prisma:167-184` |
| `onDelete: Cascade` | Suppression en cascade | `onDelete: Cascade` | `ON DELETE CASCADE` | `schema.prisma:139, 172, 177, 193` |
| `onDelete: Restrict` | Suppression refusée si enfants | `onDelete: Restrict` | `ON DELETE RESTRICT` | `schema.prisma:107, 146` |
| `include` | JOIN automatique | `findMany({ include: { ... } })` | `SELECT * FROM ... JOIN ...` | `ipc-handlers.ts:91, 150, 165, 200, 247` |
| `count` | COUNT(*) avec WHERE | `prisma.x.count({ where: ... })` | `SELECT COUNT(*) WHERE ...` | `ipc-handlers.ts:219, 224` |
| `groupBy` | Agrégation GROUP BY | `prisma.x.groupBy({ by: [...], _count: ... })` | `SELECT col, COUNT(*) GROUP BY col` | `ipc-handlers.ts:228` |
| CRUD | create / findMany / update / delete | les 4 méthodes Prisma | INSERT / SELECT / UPDATE / DELETE | `ipc-handlers.ts` (32 handlers) |
| Champs optionnels | Nullable en base | `?` après le type | `NULL` | `schema.prisma:89, 113` |
| Enum | Liste de valeurs autorisées | `enum X { A B C }` | `TEXT CHECK(col IN ('A','B','C'))` (SQLite) | `schema.prisma:34, 45` |

### Annexe 5.3 — Architecture Electron

| Point | Définition | Mon fichier |
|---|---|---|
| Main process | Processus Node qui crée la fenêtre et gère le système | `src/main/main.ts` |
| Preload | Pont contrôlé qui expose `window.api` au renderer | `src/preload/preload.ts` |
| Renderer | Application Angular qui tourne dans Chromium | `src/renderer/**` |
| IPC | `ipcMain.handle` (main) ↔ `ipcRenderer.invoke` (preload) | `ipc-handlers.ts` + `preload.ts` |
| `npm run start` | Une seule commande lance tout | `package.json:14` |
| SQLite local | `provider = "sqlite"` | `prisma/schema.prisma:20` |

---

## 3. Flux complet d'une action utilisateur (à savoir par cœur)

### Exemple : créer un membre

```
┌─────────────────────────────────────────────────────────────────────────┐
│  L'UTILISATEUR clique "+ Nouveau membre"                                │
│                          │                                              │
│                          ▼                                              │
│  Angular Router : navigue vers /membres/nouveau                         │
│  → charge MembreFormComponent (lazy)                                    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  RENDERER (membre-form.component.ts)                                    │
│                                                                         │
│  1. Le composant initialise un FormGroup réactif :                      │
│     this.form = this.fb.nonNullable.group({                             │
│       nom:    ['', [Validators.required, Validators.minLength(2)]],     │
│       prenom: ['', Validators.required],                                │
│       email:  ['', Validators.email],                                   │
│       statut: ['ACTIF', Validators.required],                           │
│     });                                                                 │
│                                                                         │
│  2. L'utilisateur remplit les champs                                    │
│  3. L'utilisateur clique "Enregistrer" → (ngSubmit)="surSoumission()"   │
│                                                                         │
│  4. surSoumission() :                                                   │
│     - vérifie form.invalid                                              │
│     - extrait payload = this.form.getRawValue()                         │
│     - appelle this.membreService.creer(payload)                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SERVICE Angular (membre.service.ts)                                    │
│                                                                         │
│  async creer(payload) {                                                 │
│    const reponse = await window.api.membres.creer(payload);             │
│    if (!reponse.success) throw new Error(reponse.error);                │
│    return reponse.data;                                                 │
│  }                                                                      │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ window.api est exposé par le preload
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  PRELOAD (preload.ts)                                                   │
│                                                                         │
│  contextBridge.exposeInMainWorld('api', {                               │
│    membres: {                                                           │
│      creer: (payload) => ipcRenderer.invoke('membres:creer', payload),  │
│    },                                                                   │
│  });                                                                    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ canal IPC traversé
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  MAIN PROCESS (ipc-handlers.ts)                                         │
│                                                                         │
│  ipcMain.handle('membres:creer', async (_event, payload) => {           │
│    try {                                                                │
│      const donneesValidees = valider(payload);                          │
│      const cree = await prisma.membre.create({                          │
│        data: donneesValidees                                            │
│      });                                                                │
│      return { success: true, data: cree };                              │
│    } catch (e) {                                                        │
│      return { success: false, error: e.message };                       │
│    }                                                                    │
│  });                                                                    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ Prisma traduit en SQL
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SQLite (prisma/dev.db)                                                 │
│                                                                         │
│  INSERT INTO Membre (nom, prenom, email, statut, dateInscription)       │
│       VALUES (?, ?, ?, ?, datetime('now'));                             │
│                                                                         │
│  → renvoie la ligne créée avec l'id auto-généré                         │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ remontée inverse
                               ▼
              { success: true, data: { id: 11, nom: ..., ... } }
                               │
                               ▼
              Service Angular renvoie l'objet créé
                               │
                               ▼
              Composant navigue vers /membres
              MembresListComponent recharge la liste :
              this.membres.set(await this.membreService.listerTous());
                               │
                               ▼
              Les signaux changent → Angular redessine la table
              (computed nombreMembresActifs se met à jour automatiquement)
```

---

## 4. Antisèche express (à imprimer)

**Stack** : Electron 33 + Angular 19 standalone + Prisma 6 + SQLite + TypeScript strict.

**Architecture** : main (Node + Prisma) ↔ preload (contextBridge) ↔ renderer (Angular via window.api).

**Sécurité** : `contextIsolation: true`, `nodeIntegration: false`, IPC en whitelist.

**7 modèles** : Membre, Coach, Cours, Salle, Seance, Inscription (N:M explicite), Abonnement.

**4 relations 1:N** : Coach→Cours, Cours→Seance, Salle→Seance, Membre→Abonnement.

**1 relation N:M** : Membre ↔ Seance via Inscription avec PK composite `@@id([membreId, seanceId])`.

**Cascade** : Cours→Seance, Seance→Inscription, Membre→Inscription, Membre→Abonnement.
**Restrict** : Coach→Cours, Salle→Seance.

**Notions Angular obligatoires** : 12/12 obligatoires + 1 bonus (`effect()`) = 13/13.
**Notions Prisma obligatoires** : 8/8 obligatoires + champ optionnel + enum = 10/10.

**CRUD complet** : sur les 7 tables, accessible via les 7 pages de l'app.

**Statistiques** : `count` (membres actifs) + `groupBy` (cours par coach) + `include` (5 prochaines séances) + computed Angular (% actifs).

---

## 5. Phrase d'ouverture pour l'oral

> « GymManager est une application desktop de gestion de salle de sport, écrite en TypeScript strict, qui sépare strictement le main process (Node + Prisma + SQLite) du renderer (Angular standalone) via un preload sécurisé qui expose une API IPC en whitelist sur `window.api`. La base de données contient 7 modèles dont une relation N:M explicite via une table de jonction `Inscription` qui porte deux champs supplémentaires : `dateInscription` et `presence`. Toutes les notions Angular et Prisma obligatoires de l'annexe du PDF sont implémentées. Je peux vous en parler en détail. »
