# 📖 Cours 06 ⭐⭐⭐ — Les flux complets CRUD (le plus important)

> 🎯 **Ce fichier est LE plus crucial pour l'oral.** Ton prof va presque sûrement te demander : *« Raconte-moi tout ce qui se passe quand tu cliques sur Ajouter. »*
>
> À la fin de ce cours, tu dois être capable de raconter chaque flux comme une histoire, du clic jusqu'à l'affichage final, sans hésiter.

---

## Légende des composants

```
┌────────────┐
│ COMPOSANT  │ — bouton/template dans .component.ts
├────────────┤
│ SERVICE    │ — méthode dans .service.ts
├────────────┤
│ PRELOAD    │ — méthode exposée via contextBridge
├────────────┤
│ MAIN       │ — handler ipcMain.handle
├────────────┤
│ PRISMA     │ — méthode prisma.X.action(...)
├────────────┤
│ SQLITE     │ — requête SQL exécutée
└────────────┘
```

---

# 🟢 FLUX 1 — AJOUTER un membre (CREATE)

## L'utilisateur fait :
1. Va sur `/membres`
2. Clique sur le bouton « + Nouveau membre »
3. Remplit le formulaire (nom, prénom, email, statut)
4. Clique sur « Enregistrer »

---

### ÉTAPE 1️⃣ — Clic sur « + Nouveau membre »

📂 **Fichier** : `src/renderer/app/components/membres-list/membres-list.component.ts` ligne 28
📂 **Fichier de la route** : `src/renderer/app/app.routes.ts` ligne 22

```html
<a class="btn" routerLink="/membres/nouveau">+ Nouveau membre</a>
```

**Que se passe-t-il ?**
- L'utilisateur clique sur le `<a>` avec `routerLink="/membres/nouveau"`.
- Angular Router intercepte le clic (pas de rechargement de page).
- Il lit `app.routes.ts` et trouve la route `{ path: 'membres/nouveau', loadComponent: ... }`.
- `loadComponent` est un **lazy load** : le bundle JS du `MembreFormComponent` est téléchargé MAINTENANT.
- Une fois chargé, le composant est instancié et inséré dans le `<router-outlet>` du `AppComponent`.

🗣️ *« Le clic sur le routerLink déclenche le router Angular, qui lazy-load le bundle MembreFormComponent et l'insère dans le router-outlet. »*

---

### ÉTAPE 2️⃣ — Création du MembreFormComponent

📂 **Fichier** : `src/renderer/app/components/membre-form/membre-form.component.ts` ligne 70

```ts
export class MembreFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly membreService = inject(MembreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly idEdition = signal<number | null>(null);
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly form: FormGroup<MembreFormControls> = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    statut: ['ACTIF' as StatutMembre, Validators.required],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) { /* mode édition, ignoré ici */ }
  }
}
```

**Que se passe-t-il ?**
- Le composant est instancié → ses 4 services sont injectés via `inject(...)`.
- Le `FormGroup` typé est construit avec ses validators (`required`, `minLength`, `email`).
- `ngOnInit` regarde si l'URL contient un `:id` — ici non (on est sur `/membres/nouveau`), donc `idEdition` reste `null`. On est en mode CRÉATION.

🗣️ *« Angular crée l'instance du composant, injecte ses dépendances et construit le FormGroup réactif avec ses validators. Comme l'URL n'a pas d'id, on est en mode création. »*

---

### ÉTAPE 3️⃣ — L'utilisateur remplit le form et clique « Enregistrer »

📂 **Fichier** : `src/renderer/app/components/membre-form/membre-form.component.ts` lignes 37-84 (template)

```html
<form [formGroup]="form" (ngSubmit)="surSoumission()">
  <input type="text" formControlName="nom" />
  <input type="text" formControlName="prenom" />
  <input type="email" formControlName="email" />
  <select formControlName="statut">...</select>
  <button type="submit" [disabled]="form.invalid">Enregistrer</button>
</form>
```

**Que se passe-t-il ?**
- Pendant qu'il tape, Angular synchronise `form.controls.nom.value`, etc., en temps réel.
- Les validators tournent à chaque frappe — `form.valid` passe à `true` quand tout est OK.
- Tant que le form est invalide, le bouton est désactivé via `[disabled]="form.invalid"`.
- Clic sur le bouton submit → l'événement `(ngSubmit)` se déclenche → la méthode `surSoumission()` est appelée.

🗣️ *« Le clic déclenche ngSubmit qui appelle surSoumission(). Tant que le form est invalide, le bouton est désactivé grâce à [disabled]=\"form.invalid\". »*

---

### ÉTAPE 4️⃣ — La méthode `surSoumission()` appelle le service

📂 **Fichier** : `src/renderer/app/components/membre-form/membre-form.component.ts` lignes 122-143

```ts
async surSoumission(): Promise<void> {
  if (this.form.invalid) return;
  this.enCours.set(true);
  this.erreur.set(null);
  try {
    const payload = this.form.getRawValue();        // ← {nom, prenom, email, statut}
    const id = this.idEdition();
    if (id === null) {
      await this.membreService.creer(payload);      // ← APPEL SERVICE
    } else {
      await this.membreService.modifier(id, payload);
    }
    await this.router.navigate(['/membres']);
  } catch (e) {
    this.erreur.set(e instanceof Error ? e.message : 'Erreur enregistrement');
  } finally {
    this.enCours.set(false);
  }
}
```

**Que se passe-t-il ?**
- Garde-fou : si le form est invalide, on sort tout de suite.
- `enCours.set(true)` → le bouton affiche « Enregistrement… ».
- `getRawValue()` extrait les valeurs : `{ nom: 'Dupont', prenom: 'Jean', email: 'j@x.fr', statut: 'ACTIF' }`.
- On appelle `membreService.creer(payload)` — c'est asynchrone, on `await`.

🗣️ *« On extrait les valeurs avec getRawValue() et on délègue au MembreService. Le composant ne touche JAMAIS directement à l'IPC ni à Prisma — c'est de la modularité. »*

---

### ÉTAPE 5️⃣ — Le service appelle `window.api.membres.creer(...)`

📂 **Fichier** : `src/renderer/app/services/membre.service.ts` lignes 36-40

```ts
async creer(payload: CreerOuModifierMembrePayload): Promise<Membre> {
  const reponse = await window.api.membres.creer(payload);
  if (!reponse.success) throw new Error(reponse.error);
  return reponse.data;
}
```

**Que se passe-t-il ?**
- Le service appelle `window.api.membres.creer(payload)`.
- **`window.api`** a été exposé par le preload via `contextBridge.exposeInMainWorld('api', ...)`.
- C'est ici qu'on quitte le code « Angular » pour passer dans le code « preload ».

🗣️ *« Le service appelle window.api.membres.creer. window.api est l'objet exposé par le preload via contextBridge. C'est le seul moyen pour le renderer d'atteindre le main. »*

---

### ÉTAPE 6️⃣ — Le preload envoie un message IPC

📂 **Fichier** : `src/preload/preload.ts` ligne 28

```ts
membres: {
  creer: (payload: unknown) => ipcRenderer.invoke('membres:creer', payload),
}
```

**Que se passe-t-il ?**
- `ipcRenderer.invoke('membres:creer', payload)` envoie un message au main process :
  - canal : `'membres:creer'`
  - data : le payload sérialisé
- La fonction renvoie une **Promise** qui se résoudra avec la réponse du main.

🍕 **Analogie** : c'est le moment où le serveur prend la commande et la donne au passe-plat, avec une sonnette pour récupérer le plat plus tard.

🗣️ *« Le preload utilise ipcRenderer.invoke pour envoyer un message asynchrone au main process sur le canal 'membres:creer'. La promise sera résolue quand le main aura répondu. »*

---

### ÉTAPE 7️⃣ — Le main reçoit via `ipcMain.handle`

📂 **Fichier** : `src/main/ipc-handlers.ts` lignes 108-116

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

**Que se passe-t-il ?**
- Le main process écoutait le canal `'membres:creer'` (enregistré au démarrage).
- À la réception du message, la fonction handler est appelée avec le payload.
- `try/catch` entoure tout — règle obligatoire du PDF.
- `valider(payload)` vérifie que les champs sont là et bien typés. Si manque, throw.
- `prisma.membre.create({ data: ... })` appelle l'ORM.

🗣️ *« Le main reçoit le message via ipcMain.handle. Try/catch obligatoire. On valide d'abord le payload, puis on appelle prisma.membre.create. »*

---

### ÉTAPE 8️⃣ — Prisma traduit en SQL

📂 **Trace conceptuelle** (généré par Prisma à la volée) :

```sql
INSERT INTO Membre (nom, prenom, email, statut, dateInscription)
     VALUES (?, ?, ?, ?, datetime('now'))
RETURNING id, nom, prenom, email, dateInscription, statut;
```

**Que se passe-t-il ?**
- Prisma lit le `data: { nom, prenom, email, statut }`.
- Il génère la requête SQL avec des paramètres préparés (`?`) — protection contre l'injection SQL.
- Il ajoute `dateInscription` automatiquement grâce au `@default(now())` du schema.
- Il exécute la requête sur SQLite.

🗣️ *« Prisma traduit le create en INSERT INTO Membre avec des paramètres préparés. Les @default du schema sont appliqués automatiquement. »*

---

### ÉTAPE 9️⃣ — SQLite écrit dans le fichier `dev.db`

**Que se passe-t-il ?**
- SQLite ajoute une nouvelle ligne à la table `Membre`.
- L'id est auto-incrémenté (ex : 11 si on en avait 10).
- SQLite renvoie la ligne complète (grâce au `RETURNING`).
- Prisma renvoie un objet JS : `{ id: 11, nom: 'Dupont', prenom: 'Jean', email: '...', statut: 'ACTIF', dateInscription: Date }`.

🗣️ *« SQLite crée la ligne, l'id auto-incrémenté est 11, et Prisma renvoie l'objet JS complet. »*

---

### ÉTAPE 🔟 — La réponse remonte le chemin inverse

```
SQLite      →  Prisma : { id: 11, nom: 'Dupont', ... }
Prisma      →  Handler : return ok({ id: 11, ... })
Handler     →  IPC : { success: true, data: { id: 11, ... } }
IPC         →  Preload : (transparent)
Preload     →  Service : la Promise se résout avec { success: true, data: ... }
Service     →  Composant : déballe la réponse, return { id: 11, ... }
Composant   →  Router : navigate(['/membres'])
```

📂 Côté composant, après le retour :

```ts
await this.membreService.creer(payload);
await this.router.navigate(['/membres']);     // ← redirection
```

**Que se passe-t-il ?**
- Le service retourne le membre créé.
- Le composant ignore la valeur (on n'en a pas besoin ici) et navigue vers `/membres`.

---

### ÉTAPE 1️⃣1️⃣ — La page `/membres` recharge la liste

📂 **Fichier** : `src/renderer/app/components/membres-list/membres-list.component.ts` ligne 119

```ts
async ngOnInit(): Promise<void> {
  await this.recharger();
}

async recharger(): Promise<void> {
  try {
    const liste = await this.membreService.listerTous();
    this.membres.set(liste);    // ← MISE À JOUR DU SIGNAL
  } catch (e) {
    this.erreur.set(...);
  }
}
```

**Que se passe-t-il ?**
- Le `MembresListComponent` est instancié à nouveau (route changée).
- `ngOnInit` appelle `recharger()`.
- `recharger()` fait un nouveau cycle Service → Preload → IPC → Prisma → SELECT pour récupérer la liste complète (incluant le nouveau membre).
- `this.membres.set(liste)` met à jour le signal.

---

### ÉTAPE 1️⃣2️⃣ — Angular redessine automatiquement

**Que se passe-t-il ?**
- Le signal `membres` change → Angular détecte la modification.
- Le `computed` `membresFiltres` se recalcule → contient maintenant 11 membres.
- Le `@for (m of membresFiltres(); track m.id)` se redessine → la nouvelle ligne apparaît.
- Le `computed` `nombreMembresActifs` se recalcule → l'affichage « X actifs » se met à jour.

🗣️ *« La mise à jour du signal déclenche le redessin automatique. C'est tout l'intérêt de la réactivité Angular : pas besoin de manipuler le DOM à la main. »*

---

## 🎤 PHRASE DE 30 SECONDES POUR L'ORAL — FLUX CREATE

> *« Quand l'utilisateur clique sur Enregistrer, l'événement ngSubmit du formulaire réactif déclenche surSoumission, qui appelle MembreService.creer. Le service passe par window.api.membres.creer, exposé par le preload via contextBridge. Le preload utilise ipcRenderer.invoke pour envoyer un message sur le canal 'membres:creer' au main process. Le main, qui a enregistré ipcMain.handle, exécute prisma.membre.create entouré d'un try/catch. Prisma traduit en INSERT INTO Membre, SQLite écrit la ligne et renvoie l'id auto-incrémenté. La réponse remonte par le même chemin sous la forme { success: true, data }. Le composant redirige vers /membres, qui recharge la liste et met à jour son signal — ce qui déclenche le redessin automatique de la table. »*

---

---

# 🔵 FLUX 2 — AFFICHER la liste des membres (READ)

## L'utilisateur fait :
1. Clique sur « Membres » dans la nav (ou arrive sur `/` qui redirige vers `/membres`).

---

### ÉTAPE 1️⃣ — Clic sur le `routerLink="/membres"`

📂 **Fichier** : `src/renderer/app/app.component.ts` ligne 21

```html
<a routerLink="/membres" routerLinkActive="active">Membres</a>
```

Angular Router navigue vers `/membres`. Lazy load de `MembresListComponent`.

---

### ÉTAPE 2️⃣ — Instanciation du composant

📂 **Fichier** : `src/renderer/app/components/membres-list/membres-list.component.ts` lignes 76-86

```ts
export class MembresListComponent implements OnInit {
  private readonly membreService = inject(MembreService);

  readonly membres = signal<Membre[]>([]);
  readonly filtreActif = signal<FiltreStatut>('TOUS');
  readonly erreur = signal<string | null>(null);
  // ...
}
```

Les signaux sont créés avec leur valeur initiale. Le tableau `membres` est vide pour l'instant.

---

### ÉTAPE 3️⃣ — `ngOnInit` appelle `recharger()`

📂 lignes 109-119

```ts
async ngOnInit(): Promise<void> {
  await this.recharger();
}

async recharger(): Promise<void> {
  try {
    const liste = await this.membreService.listerTous();
    this.membres.set(liste);
    this.erreur.set(null);
  } catch (e) {
    this.erreur.set(...);
  }
}
```

---

### ÉTAPE 4️⃣ — Appel du service

📂 `src/renderer/app/services/membre.service.ts` lignes 24-28

```ts
async listerTous(): Promise<Membre[]> {
  const reponse = await window.api.membres.listerTous();
  if (!reponse.success) throw new Error(reponse.error);
  return reponse.data;
}
```

---

### ÉTAPE 5️⃣ — Preload → IPC

📂 `src/preload/preload.ts` ligne 25

```ts
listerTous: () => ipcRenderer.invoke('membres:listerTous'),
```

---

### ÉTAPE 6️⃣ — Handler dans le main

📂 `src/main/ipc-handlers.ts` lignes 73-82

```ts
ipcMain.handle('membres:listerTous', async () => {
  try {
    const membres = await prisma.membre.findMany({
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    return ok(membres);
  } catch (e) {
    return fail(e);
  }
});
```

---

### ÉTAPE 7️⃣ — Prisma → SQL

```sql
SELECT id, nom, prenom, email, dateInscription, statut
  FROM Membre
 ORDER BY nom ASC, prenom ASC;
```

SQLite renvoie un tableau de lignes. Prisma les transforme en tableau d'objets JS typés `Membre[]`.

---

### ÉTAPE 8️⃣ — Remontée + mise à jour du signal

```
SQLite     →  Prisma : [{id:1, ...}, {id:2, ...}, ...]
Prisma     →  Handler : return ok([...])
Handler    →  IPC : { success: true, data: [...] }
IPC        →  Preload (transparent)
Preload    →  Service : déballe → [...]
Service    →  Composant : return [...]
Composant  →  this.membres.set([...])
```

---

### ÉTAPE 9️⃣ — Angular redessine

- Le signal `membres` passe de `[]` à `[10 membres]`.
- Le `computed` `membresFiltres` se recalcule.
- Le `@for (m of membresFiltres(); track m.id)` boucle et instancie 10 fois `<app-membre-row [membre]="m" ... />`.
- Chaque `MembreRowComponent` enfant affiche sa ligne avec le nom, prénom, email, badge statut, date.

---

## 🎤 PHRASE 30 SECONDES — FLUX READ

> *« Le clic sur le lien Membres déclenche le router qui lazy-load MembresListComponent. Son ngOnInit appelle membreService.listerTous, qui passe par window.api.membres.listerTous → preload → ipcRenderer.invoke('membres:listerTous') → main → ipcMain.handle → prisma.membre.findMany avec un ORDER BY → SQLite renvoie les lignes → remontée jusqu'au composant qui fait this.membres.set(liste). Le signal change, le computed membresFiltres se recalcule, le @for boucle et chaque MembreRowComponent enfant affiche sa ligne. »*

---

---

# 🟡 FLUX 3 — MODIFIER un membre (UPDATE)

## L'utilisateur fait :
1. Sur la liste des membres, clique sur « Modifier » à côté du membre #5.
2. Modifie le nom dans le formulaire.
3. Clique « Enregistrer ».

---

### ÉTAPE 1️⃣ — Clic sur « Modifier »

📂 `src/renderer/app/components/membre-row/membre-row.component.ts` ligne 31

```html
<a class="btn btn-secondary" [routerLink]="['/membres', membre().id, 'modifier']">Modifier</a>
```

**Que se passe-t-il ?**
- `[routerLink]="['/membres', membre().id, 'modifier']"` construit l'URL `/membres/5/modifier` dynamiquement.
- Angular navigue → lazy load `MembreFormComponent`.

---

### ÉTAPE 2️⃣ — Le form charge les données du membre

📂 `membre-form.component.ts` lignes 105-117

```ts
async ngOnInit(): Promise<void> {
  const idParam = this.route.snapshot.paramMap.get('id');
  if (idParam) {
    const id = parseInt(idParam, 10);
    this.idEdition.set(id);
    await this.chargerMembre(id);
  }
}

private async chargerMembre(id: number): Promise<void> {
  try {
    const membre = await this.membreService.obtenirParId(id);
    this.form.setValue({
      nom: membre.nom,
      prenom: membre.prenom,
      email: membre.email,
      statut: membre.statut,
    });
  } catch (e) {
    this.erreur.set(...);
  }
}
```

**Que se passe-t-il ?**
- `route.snapshot.paramMap.get('id')` récupère `'5'`.
- On le parse en nombre et on stocke dans le signal `idEdition`.
- `chargerMembre(5)` appelle le service.
- Le service appelle `window.api.membres.obtenirParId(5)` → IPC → main → `prisma.membre.findUnique({ where: { id: 5 }, include: {...} })`.
- SQL : `SELECT * FROM Membre WHERE id = 5;` (+ JOIN sur abonnements/inscriptions).
- Retour : l'objet membre.
- `this.form.setValue(...)` remplit le formulaire avec les valeurs courantes.

---

### ÉTAPE 3️⃣ — L'utilisateur modifie un champ et clique « Enregistrer »

📂 `membre-form.component.ts` ligne 122

```ts
async surSoumission(): Promise<void> {
  if (this.form.invalid) return;
  this.enCours.set(true);
  try {
    const payload = this.form.getRawValue();
    const id = this.idEdition();
    if (id === null) {
      await this.membreService.creer(payload);
    } else {
      await this.membreService.modifier(id, payload);    // ← ICI
    }
    await this.router.navigate(['/membres']);
  } // ...
}
```

`idEdition()` vaut `5` → on entre dans la branche `modifier`.

---

### ÉTAPE 4️⃣ — Service → preload → IPC → main

📂 Service `membre.service.ts` ligne 42 :
```ts
async modifier(id: number, payload: CreerOuModifierMembrePayload): Promise<Membre> {
  const reponse = await window.api.membres.modifier(id, payload);
  if (!reponse.success) throw new Error(reponse.error);
  return reponse.data;
}
```

📂 Preload `preload.ts` ligne 30 :
```ts
modifier: (id: number, payload: unknown) => ipcRenderer.invoke('membres:modifier', id, payload),
```

📂 Handler `ipc-handlers.ts` ligne 120 :
```ts
ipcMain.handle('membres:modifier', async (_event, id: number, payload: unknown) => {
  try {
    const donneesValidees: ModifierMembrePayload = valider(payload);
    const modifie = await prisma.membre.update({ where: { id }, data: donneesValidees });
    return ok(modifie);
  } catch (e) {
    return fail(e);
  }
});
```

---

### ÉTAPE 5️⃣ — Prisma → SQL UPDATE

```sql
UPDATE Membre
   SET nom = ?, prenom = ?, email = ?, statut = ?
 WHERE id = ?;
```

SQLite met à jour la ligne #5.

---

### ÉTAPE 6️⃣ — Retour + redirection + rechargement

- Réponse `{ success: true, data: { id: 5, ... } }`.
- Composant : `router.navigate(['/membres'])`.
- `MembresListComponent` recharge → nouveau `findMany` → nouveau signal → redessin.

---

## 🎤 PHRASE 30 SECONDES — FLUX UPDATE

> *« Le clic sur Modifier construit l'URL /membres/:id/modifier via routerLink avec id dynamique. MembreFormComponent récupère l'id via ActivatedRoute, appelle membreService.obtenirParId qui fait un findUnique avec include — l'équivalent SQL est SELECT + JOIN. Le form est rempli via setValue. À l'enregistrement, on appelle membreService.modifier qui passe par IPC jusqu'à prisma.membre.update — équivalent SQL UPDATE Membre SET ... WHERE id = ?. Retour, redirection, rechargement de la liste, le signal change, l'UI se redessine. »*

---

---

# 🔴 FLUX 4 — SUPPRIMER un membre (DELETE)

## L'utilisateur fait :
1. Sur la liste des membres, clique sur « Supprimer » à côté du membre #5.
2. Confirme via la popup.

---

### ÉTAPE 1️⃣ — Clic sur « Supprimer » dans `MembreRowComponent`

📂 `membre-row.component.ts` lignes 32-46

```html
<button class="btn btn-danger" (click)="onSupprimer()">Supprimer</button>
```

```ts
readonly supprime = output<number>();

onSupprimer(): void {
  this.supprime.emit(this.membre().id);
}
```

**Que se passe-t-il ?**
- Clic → méthode `onSupprimer()`.
- `this.supprime.emit(5)` émet l'événement avec la valeur 5.

🚨 **Le composant enfant ne supprime PAS lui-même.** Il prévient le parent. C'est le rôle de `output`.

---

### ÉTAPE 2️⃣ — Le parent reçoit l'event

📂 `membres-list.component.ts` ligne 63

```html
@for (m of membresFiltres(); track m.id) {
  <app-membre-row [membre]="m" (supprime)="surSuppression($event)" />
}
```

**`(supprime)="surSuppression($event)"`** : quand l'enfant émet `supprime`, on appelle `surSuppression(...)` avec `$event` = la valeur émise (l'id).

---

### ÉTAPE 3️⃣ — `surSuppression` confirme et appelle le service

📂 lignes 125-135

```ts
async surSuppression(id: number): Promise<void> {
  if (!confirm('Supprimer ce membre ? Ses inscriptions et abonnements seront perdus.')) {
    return;
  }
  try {
    await this.membreService.supprimer(id);
    this.membres.update((liste) => liste.filter((m) => m.id !== id));
  } catch (e) {
    this.erreur.set(e instanceof Error ? e.message : 'Erreur suppression');
  }
}
```

**Que se passe-t-il ?**
- `confirm(...)` affiche une popup native — si l'utilisateur clique « Annuler », on sort.
- Sinon, on appelle `membreService.supprimer(id)`.
- 🎯 **Optimisation** : au lieu de re-fetcher toute la liste, on fait une **mise à jour optimiste** : on retire le membre du signal localement avec `.update(prev => prev.filter(...))`.

---

### ÉTAPE 4️⃣ — Service → preload → IPC → main

📂 Service `membre.service.ts` ligne 48 :
```ts
async supprimer(id: number): Promise<void> {
  const reponse = await window.api.membres.supprimer(id);
  if (!reponse.success) throw new Error(reponse.error);
}
```

📂 Preload `preload.ts` ligne 31 :
```ts
supprimer: (id: number) => ipcRenderer.invoke('membres:supprimer', id),
```

📂 Handler `ipc-handlers.ts` lignes 133-140 :
```ts
ipcMain.handle('membres:supprimer', async (_event, id: number) => {
  try {
    await prisma.membre.delete({ where: { id } });
    return ok({ id });
  } catch (e) {
    return fail(e);
  }
});
```

---

### ÉTAPE 5️⃣ — Prisma → SQL DELETE + CASCADE

```sql
DELETE FROM Membre WHERE id = 5;
```

🚨 **Effet cascade automatique** (grâce au `onDelete: Cascade` dans `schema.prisma`) :
```sql
DELETE FROM Inscription WHERE membreId = 5;
DELETE FROM Abonnement  WHERE membreId = 5;
```

C'est SQLite qui le fait tout seul, parce que les FK ont `ON DELETE CASCADE`.

---

### ÉTAPE 6️⃣ — Retour

```
SQLite      → 0 rows affected / OK
Prisma      → Promise resolved
Handler     → return ok({ id: 5 })
IPC         → { success: true, data: { id: 5 } }
Service     → return (void)
Composant   → this.membres.update(prev => prev.filter(m => m.id !== 5))
              → Le signal change
              → membresFiltres recalcule (sans le membre 5)
              → @for redessine sans la ligne
              → Le badge « X actifs » se met à jour
```

---

## 🎤 PHRASE 30 SECONDES — FLUX DELETE

> *« Dans MembreRowComponent enfant, le bouton Supprimer appelle onSupprimer qui émet l'output 'supprime' avec l'id. Le parent MembresListComponent écoute avec (supprime)='surSuppression(\$event)'. Après confirmation, surSuppression appelle membreService.supprimer → IPC → prisma.membre.delete — équivalent SQL DELETE FROM Membre WHERE id = ?. Grâce au onDelete: Cascade dans le schéma, SQLite supprime aussi les Inscription et Abonnement liés automatiquement. Côté UI, on fait une mise à jour optimiste avec membres.update(prev => prev.filter(...)) pour éviter un re-fetch — le signal change, @for redessine sans la ligne. »*

---

---

# 🟣 FLUX 5 — TRANSACTION : Souscrire un abonnement + activer le membre ⭐

> 🎯 **Pourquoi ce flux est spécial ?** Il utilise `prisma.$transaction`. C'est la seule action de l'app qui combine 2 écritures DB atomiquement. **Question quasi-certaine à l'oral.**

## L'utilisateur fait :
1. Va sur `/abonnements`
2. Remplit le formulaire (type, prix, dates, membre)
3. Clique sur le bouton **vert** « Souscrire + activer (transaction) »

---

### ÉTAPE 1️⃣ — Clic sur le bouton vert

📂 **Fichier** : `src/renderer/app/components/abonnements-list/abonnements-list.component.ts` (template)

```html
<button
  class="btn"
  type="button"
  style="background: #059669;"
  [disabled]="form.invalid"
  (click)="surSouscriptionTransaction()"
  title="Crée l'abonnement ET réactive le membre dans une seule transaction Prisma"
>
  Souscrire + activer (transaction)
</button>
```

**Que se passe-t-il ?**
- `type="button"` (PAS `submit`) : on évite que le formulaire soumette via `ngSubmit`.
- `[disabled]="form.invalid"` : désactivé tant que le formulaire n'est pas valide.
- `(click)` appelle directement `surSouscriptionTransaction()` (pas `surSoumission`).

---

### ÉTAPE 2️⃣ — La méthode `surSouscriptionTransaction()`

📂 **Fichier** : `abonnements-list.component.ts`

```ts
async surSouscriptionTransaction(): Promise<void> {
  if (this.form.invalid) return;
  try {
    const v = this.form.getRawValue();
    const resultat = await this.abonnementService.souscrireEtActiver({
      type: v.type,
      prix: v.prix,
      dateDebut: new Date(v.dateDebut).toISOString(),
      dateFin: new Date(v.dateFin).toISOString(),
      membreId: v.membreId,
    });
    alert(`Transaction OK : abonnement #${resultat.abonnement.id} créé + membre ${resultat.membre.prenom} ${resultat.membre.nom} passé à ${resultat.membre.statut}.`);
    await this.recharger();
  } catch (e) {
    this.erreur.set(e instanceof Error ? `Transaction rollback : ${e.message}` : 'Transaction échouée');
  }
}
```

**Que se passe-t-il ?**
- On extrait les valeurs du formulaire.
- On appelle `abonnementService.souscrireEtActiver(...)`.
- Si la transaction réussit : alerte de confirmation avec les détails.
- Si elle échoue : `catch` → message d'erreur avec préfixe `Transaction rollback`.

---

### ÉTAPE 3️⃣ — Service Angular

📂 **Fichier** : `src/renderer/app/services/abonnement.service.ts`

```ts
async souscrireEtActiver(payload: CreerOuModifierAbonnementPayload) {
  const reponse = await window.api.abonnements.souscrireEtActiver(payload);
  if (!reponse.success) throw new Error(reponse.error);
  return reponse.data;   // { abonnement, membre }
}
```

---

### ÉTAPE 4️⃣ — Preload → IPC

📂 **Fichier** : `src/preload/preload.ts`

```ts
souscrireEtActiver: (payload) => ipcRenderer.invoke('abonnements:souscrireEtActiver', payload),
```

Le message IPC traverse la frontière de processus avec le canal `'abonnements:souscrireEtActiver'` et le payload.

---

### ÉTAPE 5️⃣ — Handler dans le main : LA TRANSACTION

📂 **Fichier** : `src/main/ipc-handlers.ts` lignes 569-636

```ts
ipcMain.handle('abonnements:souscrireEtActiver', async (_event, payload: unknown) => {
  try {
    const p = payload as Record<string, unknown>;
    if (typeof p['membreId'] !== 'number') throw new Error('membreId requis.');
    if (typeof p['prix'] !== 'number') throw new Error('prix requis.');

    const resultat = await prisma.$transaction(async (tx) => {
      // 1) Créer l'abonnement (INSERT)
      const abonnement = await tx.abonnement.create({
        data: {
          type: p['type'] as 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL',
          prix: p['prix'] as number,
          dateDebut: new Date(p['dateDebut'] as string),
          dateFin: new Date(p['dateFin'] as string),
          membreId: p['membreId'] as number,
        },
      });

      // 2) Activer le membre (UPDATE)
      const membre = await tx.membre.update({
        where: { id: p['membreId'] as number },
        data: { statut: 'ACTIF' },
      });

      return { abonnement, membre };
    });

    return ok(resultat);
  } catch (e) {
    return fail(e);
  }
});
```

**Que se passe-t-il ?**
- `prisma.$transaction(async (tx) => { ... })` : Prisma ouvre une transaction.
- À l'intérieur, on utilise **`tx`** (pas `prisma`) — c'est un client lié à la transaction.
- `tx.abonnement.create(...)` : INSERT dans Abonnement.
- `tx.membre.update(...)` : UPDATE Membre SET statut = 'ACTIF'.
- Si **tout réussit** → Prisma exécute `COMMIT` et les deux changements sont gravés.
- Si **une exception est levée** dans le callback (ou si Prisma plante) → `ROLLBACK` automatique. Les deux changements sont annulés.

---

### ÉTAPE 6️⃣ — SQL généré sous le capot

```sql
BEGIN TRANSACTION;

  INSERT INTO Abonnement (type, prix, dateDebut, dateFin, membreId)
       VALUES (?, ?, ?, ?, ?);
  -- → retourne l'id auto-incrémenté

  UPDATE Membre SET statut = 'ACTIF' WHERE id = ?;
  -- → met à jour la ligne

COMMIT;

-- Si erreur entre BEGIN et COMMIT :
--   ROLLBACK;   (annule l'INSERT, le membre reste inchangé)
```

---

### ÉTAPE 7️⃣ — Remontée + alerte utilisateur

```
SQLite    → COMMIT OK
Prisma    → callback return { abonnement, membre }
Handler   → return ok({ abonnement, membre })
IPC       → { success: true, data: { abonnement: {...}, membre: {...} } }
Service   → return resultat
Composant → alert("Transaction OK : ...") + recharger la liste
```

L'utilisateur voit une alerte de confirmation puis la table d'abonnements se rafraîchit.

---

## 🎤 PHRASE DE 30 SECONDES POUR L'ORAL — FLUX TRANSACTION

> *« Quand l'utilisateur clique sur "Souscrire + activer", la méthode appelle abonnementService.souscrireEtActiver, qui passe par window.api → ipcRenderer.invoke('abonnements:souscrireEtActiver') → ipcMain.handle. Le handler ouvre une transaction Prisma avec prisma.$transaction(async (tx) => …). À l'intérieur, deux opérations : tx.abonnement.create (INSERT) puis tx.membre.update (UPDATE statut = ACTIF). En SQL, ça donne BEGIN TRANSACTION ... COMMIT. Si l'une des deux plante, Prisma fait automatiquement ROLLBACK et la base reste cohérente. C'est l'atomicité du modèle ACID. J'ai choisi la syntaxe callback parce qu'elle permet de la logique entre les opérations et un return propre. »*

---

# 🎯 Tableau récap des 4 flux

| Étape | CREATE | READ | UPDATE | DELETE |
|---|---|---|---|---|
| Action UI | Submit form | Visite `/membres` | Submit form édition | Clic Supprimer |
| Composant | `MembreFormComponent` | `MembresListComponent` | `MembreFormComponent` | `MembreRowComponent` → `MembresListComponent` |
| Méthode déclenchée | `surSoumission()` | `ngOnInit() → recharger()` | `surSoumission()` | `onSupprimer()` → `supprime.emit(id)` → `surSuppression(id)` |
| Service | `creer(payload)` | `listerTous()` | `modifier(id, payload)` | `supprimer(id)` |
| `window.api` | `membres.creer` | `membres.listerTous` | `membres.modifier` | `membres.supprimer` |
| Canal IPC | `'membres:creer'` | `'membres:listerTous'` | `'membres:modifier'` | `'membres:supprimer'` |
| Prisma | `create({data})` | `findMany({orderBy})` | `update({where,data})` | `delete({where})` |
| SQL | `INSERT INTO Membre ...` | `SELECT * FROM Membre ORDER BY ...` | `UPDATE Membre SET ... WHERE id=?` | `DELETE FROM Membre WHERE id=?` + cascades |
| Mise à jour UI | redirect → recharge | `this.membres.set(liste)` | redirect → recharge | `this.membres.update(prev => prev.filter(...))` |

---

# 🏆 Le combo gagnant à mémoriser

À l'oral, si on te demande **« Explique-moi un flux »**, raconte-le en utilisant **toujours les 7 mêmes mots-clés dans l'ordre** :

1. **Composant** (template + méthode)
2. **Service**
3. **window.api** (preload + contextBridge)
4. **ipcRenderer.invoke** (canal nommé)
5. **ipcMain.handle** (try/catch)
6. **Prisma** (méthode)
7. **SQL** (équivalent + cascades si applicable)
8. **Retour** (success/error)
9. **Signal** (mise à jour)
10. **Re-render** auto

Si tu déroules ces 10 étapes, ton prof comprendra que tu maîtrises l'archi de bout en bout. 🎯

---

## Mini-quiz final

1. Dans le flux DELETE, qui émet l'événement « supprime » ? Qui l'écoute ?
2. Pourquoi la mise à jour optimiste sur DELETE plutôt qu'un re-fetch ?
3. Que se passe-t-il en SQLite quand on supprime un membre qui a 3 inscriptions ?
4. Quelle est la différence entre `this.form.setValue(...)` et `this.form.patchValue(...)` ?
5. Pourquoi `await` partout dans surSoumission ?

Réponses :
1. L'enfant `MembreRowComponent` émet, le parent `MembresListComponent` écoute via `(supprime)="surSuppression($event)"`.
2. Pour la perf (un appel IPC en moins) et pour un retour instantané à l'utilisateur. Si le serveur échoue, on `catch` et on remet l'état.
3. Les 3 inscriptions sont supprimées AUTOMATIQUEMENT par SQLite grâce à `ON DELETE CASCADE` sur la FK `membreId`.
4. `setValue` exige TOUS les champs. `patchValue` accepte un objet partiel.
5. Parce que chaque étape (service → IPC → main → Prisma → SQLite) est asynchrone — on doit attendre la réponse avant de continuer.

Si tu réponds aux 5 sans hésiter, passe au **cours 07** sur les questions piège. 🎉
