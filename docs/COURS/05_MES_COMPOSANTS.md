# 📖 Cours 05 — Tes composants Angular décortiqués

> 🎯 **Objectif** : pour chacun de tes 9 composants, savoir expliquer son rôle, son décorateur, ses signaux, son template, ses méthodes.

---

## Liste des 9 composants

| Composant | Rôle | Fichier |
|---|---|---|
| 1. `AppComponent` | Shell de l'app (nav + router-outlet) | `app.component.ts` |
| 2. `MembresListComponent` | Liste des membres avec filtre | `components/membres-list/` |
| 3. `MembreRowComponent` | Ligne d'un tableau membre (enfant) | `components/membre-row/` |
| 4. `MembreFormComponent` | Formulaire création/édition membre | `components/membre-form/` |
| 5. `CoachsListComponent` | CRUD coachs | `components/coachs-list/` |
| 6. `CoursListComponent` | CRUD cours | `components/cours-list/` |
| 7. `SallesListComponent` | CRUD salles | `components/salles-list/` |
| 8. `SeancesListComponent` | CRUD séances + inscriptions | `components/seances-list/` |
| 9. `AbonnementsListComponent` | CRUD abonnements | `components/abonnements-list/` |
| 10. `StatistiquesComponent` | Tableau de bord | `components/statistiques/` |

---

## 1. `AppComponent` — le shell

📂 `src/renderer/app/app.component.ts`, 35 lignes.

```ts
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="main-nav">
      <span class="brand">GymManager</span>
      <a routerLink="/membres" routerLinkActive="active">Membres</a>
      <a routerLink="/cours" routerLinkActive="active">Cours</a>
      <a routerLink="/coachs" routerLinkActive="active">Coachs</a>
      <a routerLink="/salles" routerLinkActive="active">Salles</a>
      <a routerLink="/seances" routerLinkActive="active">Séances</a>
      <a routerLink="/abonnements" routerLinkActive="active">Abonnements</a>
      <a routerLink="/statistiques" routerLinkActive="active">Statistiques</a>
    </nav>
    <main class="container">
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
```

### Décortiquons le décorateur

- **`selector: 'app-root'`** : nom de la balise HTML qui invoquera ce composant (`<app-root>` dans `index.html`).
- **`standalone: true`** : composant moderne sans NgModule.
- **`imports`** : ce composant utilise `<router-outlet>`, `routerLink` et `routerLinkActive` → on les déclare.
- **`template`** : le HTML. Note les ` (backticks) qui permettent du HTML multi-lignes.

### Le template

- **`<router-outlet />`** : le slot où Angular injecte le composant de la route courante.
- **`<a routerLink="/membres">`** : lien qui navigue sans recharger.
- **`routerLinkActive="active"`** : ajoute la classe CSS `active` au lien quand la route active correspond.

🗣️ **Phrase à dire** : *« AppComponent est le shell : il définit la nav et un router-outlet. Le routerLink permet de naviguer côté client, routerLinkActive met en surbrillance le lien actif. »*

---

## 2. `MembresListComponent` — la vitrine technique

📂 `src/renderer/app/components/membres-list/membres-list.component.ts`, 140 lignes.

🎯 **Ce composant démontre 7 notions Angular en même temps** : signal, computed, effect, @for/@if, FormsModule (pour le select), inject(Service), composant enfant avec input/output. **C'est le composant à montrer si on te demande de prouver une notion.**

### Le décorateur

```ts
@Component({
  selector: 'app-membres-list',
  standalone: true,
  imports: [FormsModule, RouterLink, MembreRowComponent],
  template: `...`,
})
```

- `FormsModule` : nécessaire pour le `[(ngModel)]` du select de filtre.
- `RouterLink` : pour le bouton « + Nouveau membre ».
- `MembreRowComponent` : composant enfant qu'on utilise dans le template.

### Les signaux (lignes 77-86)

```ts
private readonly membreService = inject(MembreService);

// Liste complète des membres récupérés.
readonly membres = signal<Membre[]>([]);

// Filtre courant (TOUS, ACTIF, SUSPENDU, RESILIE).
readonly filtreActif = signal<FiltreStatut>('TOUS');

// Message d'erreur éventuel.
readonly erreur = signal<string | null>(null);
```

- **`membres`** : la source de vérité, contient la liste complète.
- **`filtreActif`** : le filtre courant choisi par l'utilisateur dans le select.
- **`erreur`** : message à afficher en cas d'erreur API.

### Les computed (lignes 88-99)

```ts
readonly nombreMembresActifs = computed(
  () => this.membres().filter((m) => m.statut === 'ACTIF').length,
);

readonly membresFiltres = computed(() => {
  const filtre = this.filtreActif();
  if (filtre === 'TOUS') return this.membres();
  return this.membres().filter((m) => m.statut === filtre);
});
```

- **`nombreMembresActifs`** : se recalcule auto quand `membres` change.
- **`membresFiltres`** : se recalcule quand `membres` OU `filtreActif` change. C'est ce qu'on affiche dans le tableau.

### L'effect (lignes 101-107)

```ts
constructor() {
  effect(() => {
    console.log('[effect] Filtre membre changé →', this.filtreActif());
  });
}
```

> À chaque changement de `filtreActif`, on logue dans la console (DevTools). C'est un side-effect, sans valeur de retour.

### Le ngOnInit (lignes 109-111)

```ts
async ngOnInit(): Promise<void> {
  await this.recharger();
}
```

> `ngOnInit` est appelé une fois après la création du composant. On charge les données initiales.

### Les méthodes (lignes 113-138)

**`recharger()`** : appelle le service, met à jour `membres`, gère les erreurs.
**`surChangementFiltre(valeur)`** : update du signal `filtreActif`.
**`surSuppression(id)`** : confirme, appelle le service, retire le membre de la liste (mise à jour OPTIMISTE pour éviter un re-fetch).

### Le template clé (lignes 32-72)

```html
<div class="card">
  <label>Filtre statut :</label>
  <select [(ngModel)]="filtreActif" (ngModelChange)="surChangementFiltre($event)">
    <option value="TOUS">Tous</option>
    <option value="ACTIF">Actifs</option>
    <!-- ... -->
  </select>
  <span>
    <strong>{{ nombreMembresActifs() }}</strong> actifs sur {{ membres().length }}
  </span>
</div>

@if (membresFiltres().length === 0) {
  <div class="card">Aucun membre à afficher.</div>
} @else {
  <table>
    <thead>...</thead>
    <tbody>
      @for (m of membresFiltres(); track m.id) {
        <app-membre-row [membre]="m" (supprime)="surSuppression($event)" />
      }
    </tbody>
  </table>
}
```

- **`{{ membres().length }}`** : interpolation Angular. Les `{{ }}` évaluent l'expression à l'intérieur.
- **`[(ngModel)]="filtreActif"`** : two-way binding sur le signal. La valeur du select est synchronisée.
- **`(ngModelChange)="..."`** : événement quand la valeur change.
- **`@if`** : si pas de membres, message ; sinon, on affiche le tableau.
- **`@for ... track m.id`** : itération avec optimisation par id.
- **`[membre]="m"`** : input — on passe `m` à l'enfant.
- **`(supprime)="surSuppression($event)"`** : on écoute l'output `supprime` de l'enfant ; `$event` contient la valeur émise (l'id du membre).

🗣️ **Phrase à dire** : *« MembresListComponent montre toutes les notions Angular : 3 signaux pour l'état, 2 computed pour les valeurs dérivées, un effect bonus, @for/@if dans le template, l'injection de MembreService, et la communication avec MembreRowComponent via input/output. »*

---

## 3. `MembreRowComponent` — l'enfant qui démontre input/output

📂 `src/renderer/app/components/membre-row/membre-row.component.ts`, 48 lignes.

🎯 **Ce composant est CRUCIAL pour l'oral** : c'est le seul qui démontre `input.required<T>()` et `output<T>()`.

```ts
@Component({
  selector: 'app-membre-row',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <tr>
      <td>{{ membre().nom }}</td>
      <td>{{ membre().prenom }}</td>
      <td>{{ membre().email }}</td>
      <td>
        <span class="badge badge-{{ membre().statut }}">{{ membre().statut }}</span>
      </td>
      <td>{{ membre().dateInscription | date: 'dd/MM/yyyy' }}</td>
      <td>
        <a class="btn btn-secondary" [routerLink]="['/membres', membre().id, 'modifier']">Modifier</a>
        <button class="btn btn-danger" (click)="onSupprimer()">Supprimer</button>
      </td>
    </tr>
  `,
})
export class MembreRowComponent {
  readonly membre = input.required<Membre>();
  readonly supprime = output<number>();

  onSupprimer(): void {
    this.supprime.emit(this.membre().id);
  }
}
```

### Décortiquage

**`readonly membre = input.required<Membre>();`**
> Le parent DOIT passer un objet `Membre` via `[membre]="m"`. Si on l'oublie, erreur TypeScript au compile.
> Pour lire : `this.membre()` (avec les parenthèses, c'est un signal).

**`readonly supprime = output<number>();`**
> L'enfant peut ÉMETTRE un événement nommé `supprime` qui transporte un nombre.
> Pour émettre : `this.supprime.emit(42)`.

**`onSupprimer()`** : méthode appelée par le bouton, émet l'id du membre.

### Le template clé

- **`{{ membre().dateInscription | date: 'dd/MM/yyyy' }}`** : pipe `date` pour formater. Le pipe est dans `DatePipe` qu'on a importé.
- **`badge badge-{{ membre().statut }}`** : interpolation dans une classe CSS dynamique. Donne `badge-ACTIF`, `badge-SUSPENDU`, etc.
- **`[routerLink]="['/membres', membre().id, 'modifier']"`** : navigation programmée. Va vers `/membres/42/modifier` si l'id est 42.
- **`(click)="onSupprimer()"`** : event handler.

🗣️ **Phrase à dire** : *« MembreRowComponent est un composant enfant qui reçoit un membre via input.required (donc obligatoire) et émet un événement supprime via output. Le parent écoute avec (supprime)="...". C'est la nouvelle API signal-based d'Angular 17.3+. »*

---

## 4. `MembreFormComponent` — le formulaire réactif

📂 `src/renderer/app/components/membre-form/membre-form.component.ts`, 151 lignes.

🎯 **Ce composant démontre les formulaires réactifs avec Validators.**

### Imports clés

```ts
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup, type FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
```

- `ReactiveFormsModule` : pour utiliser `[formGroup]` et `formControlName` dans le HTML.
- `ActivatedRoute` : pour lire les paramètres de la route (l'id si on est en édition).
- `Router` : pour rediriger après l'enregistrement.

### Définition du FormGroup typé

```ts
interface MembreFormControls {
  nom: FormControl<string>;
  prenom: FormControl<string>;
  email: FormControl<string>;
  statut: FormControl<StatutMembre>;
}

readonly form: FormGroup<MembreFormControls> = this.fb.nonNullable.group({
  nom: ['', [Validators.required, Validators.minLength(2)]],
  prenom: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.required, Validators.email]],
  statut: ['ACTIF' as StatutMembre, Validators.required],
});
```

- **`FormGroup<MembreFormControls>`** : type strict — TypeScript sait que `form.controls.nom` est un `FormControl<string>`.
- **`this.fb.nonNullable.group(...)`** : version qui empêche les `null` (sécurité du typage).
- **`['valeurDefaut', [validators]]`** : tuple Angular pour définir un FormControl.

### Mode création vs mode édition

```ts
readonly idEdition = signal<number | null>(null);

async ngOnInit(): Promise<void> {
  const idParam = this.route.snapshot.paramMap.get('id');
  if (idParam) {
    const id = parseInt(idParam, 10);
    this.idEdition.set(id);
    await this.chargerMembre(id);
  }
}
```

Si la route est `/membres/42/modifier`, on récupère `42` et on charge les données du membre dans le formulaire avec `this.form.setValue(...)`.

Sinon (`/membres/nouveau`), `idEdition` reste `null` et le formulaire est vide.

### La soumission

```ts
async surSoumission(): Promise<void> {
  if (this.form.invalid) return;          // garde-fou
  this.enCours.set(true);
  try {
    const payload = this.form.getRawValue();    // extrait { nom, prenom, email, statut }
    const id = this.idEdition();
    if (id === null) {
      await this.membreService.creer(payload);
    } else {
      await this.membreService.modifier(id, payload);
    }
    await this.router.navigate(['/membres']);   // redirection
  } catch (e) {
    this.erreur.set(e instanceof Error ? e.message : 'Erreur');
  } finally {
    this.enCours.set(false);
  }
}
```

### Le template clé

```html
<form [formGroup]="form" (ngSubmit)="surSoumission()">
  <div class="form-group">
    <label>Nom</label>
    <input type="text" formControlName="nom" />
    @if (form.controls.nom.invalid && form.controls.nom.touched) {
      <div class="error">Le nom est requis.</div>
    }
  </div>
  <!-- ... -->
  <button type="submit" [disabled]="form.invalid || enCours()">
    {{ enCours() ? 'Enregistrement…' : 'Enregistrer' }}
  </button>
</form>
```

- **`[formGroup]="form"`** : lie le HTML à l'objet TypeScript.
- **`formControlName="nom"`** : lie l'input au control `nom`.
- **`@if (form.controls.nom.invalid && form.controls.nom.touched)`** : on n'affiche l'erreur que si le champ est invalide ET que l'utilisateur l'a touché (sinon ça gueule dès l'affichage).
- **`[disabled]="form.invalid || enCours()"`** : bouton désactivé tant que le form est invalide ou qu'une requête est en cours.

🗣️ **Phrase à dire** : *« Le formulaire est construit avec FormBuilder.nonNullable.group. Chaque champ a ses Validators : required, minLength, email. L'état du form est lu réactivement dans le template (invalid, touched). Le bouton submit est désactivé tant que le form est invalide. »*

---

## 5. `CoachsListComponent` — CRUD inline + édition ligne par ligne

📂 `src/renderer/app/components/coachs-list/coachs-list.component.ts`, 158 lignes.

### Particularité : édition INLINE

Au lieu d'avoir une page séparée pour éditer, on fait l'édition DANS la ligne du tableau.

```ts
readonly idEnEdition = signal<number | null>(null);
```

Dans le template :
```html
@if (idEnEdition() === c.id) {
  <td><input #editNom [value]="c.nom" /></td>
  <td><input #editPrenom [value]="c.prenom" /></td>
  <!-- ... -->
  <td>
    <button (click)="surValidationEdition(c.id, editNom.value, editPrenom.value, ...)">OK</button>
    <button (click)="idEnEdition.set(null)">Annuler</button>
  </td>
} @else {
  <td>{{ c.nom }}</td>
  <td>{{ c.prenom }}</td>
  <!-- ... -->
  <td>
    <button (click)="idEnEdition.set(c.id)">Modifier</button>
    <button (click)="surSuppression(c.id)">Supprimer</button>
  </td>
}
```

- **`#editNom`** : template reference variable. C'est comme un alias TypeScript pour l'input.
- **`editNom.value`** : valeur courante de l'input, lue dynamiquement.
- **Toggle** : `idEnEdition.set(c.id)` met en mode édition, `set(null)` en mode lecture.

### La création (formulaire en haut)

```html
<form [formGroup]="form" (ngSubmit)="surSoumission()">
  <input type="text" placeholder="Nom" formControlName="nom" />
  <input type="text" placeholder="Prénom" formControlName="prenom" />
  <!-- ... -->
  <button type="submit" [disabled]="form.invalid">Créer</button>
</form>
```

🗣️ **Phrase à dire** : *« CoachsListComponent montre une UX CRUD inline : la création est en haut via un formulaire réactif, et l'édition se fait directement dans la ligne du tableau via un signal idEnEdition. C'est plus rapide qu'une page séparée pour des cas simples. »*

---

## 6. `CoursListComponent` — création avec sélecteur de Coach (FK)

📂 `src/renderer/app/components/cours-list/cours-list.component.ts`, 179 lignes.

### Particularité : la FK vers Coach

Pour créer un Cours, il faut un `coachId`. On charge la liste des coachs et on l'affiche en `<select>`.

```ts
readonly coachs = signal<Coach[]>([]);

async ngOnInit(): Promise<void> {
  this.coachs.set(await this.coachService.listerTous());
  const premierCoach = this.coachs()[0];
  if (premierCoach) this.form.patchValue({ coachId: premierCoach.id });
  this.cours.set(await this.coursService.listerTous());
}
```

Template :
```html
<select formControlName="coachId">
  @for (c of coachs(); track c.id) {
    <option [value]="c.id">{{ c.prenom }} {{ c.nom }}</option>
  }
</select>
```

🗣️ **Phrase à dire** : *« Pour la création d'un Cours, je dois sélectionner le Coach (FK). Je charge la liste des coachs et je les affiche dans un <select> peuplé avec @for. Le formControlName lie l'option choisie au control coachId. »*

---

## 7. `SallesListComponent` — CRUD complet simple

📂 `src/renderer/app/components/salles-list/salles-list.component.ts`, 150 lignes.

Même structure que CoachsListComponent (création en haut + édition inline), mais sans FK sortante. C'est le composant CRUD le plus « pur » du projet.

🎯 **Computed bonus** :
```ts
readonly nombreSalles = computed(() => this.salles().length);
readonly capaciteTotale = computed(() => this.salles().reduce((sum, s) => sum + s.capacite, 0));
```

`capaciteTotale` somme les capacités de toutes les salles, recalculée auto quand `salles` change.

🗣️ **Phrase à dire** : *« SallesListComponent fait du CRUD complet sur une table sans FK sortante. Deux computed : nombreSalles et capaciteTotale, qui agrègent les données côté Angular. »*

---

## 8. `SeancesListComponent` — le plus complexe (CRUD séance + CRUD inscription)

📂 `src/renderer/app/components/seances-list/seances-list.component.ts`, 234 lignes.

### Pourquoi ce composant est important pour l'oral ?

Il gère deux entités à la fois :
- Le CRUD sur `Seance` (table simple)
- Le CRUD sur `Inscription` (la N:M explicite) → **inscrire, marquer présence, désinscrire**

🎯 **C'est l'endroit où tu défends la N:M.**

### Création d'une séance (FKs vers Cours et Salle)

```ts
readonly cours = signal<Cours[]>([]);
readonly salles = signal<Salle[]>([]);

// Form avec deux selects (cours + salle) et un datetime-local
readonly form: FormGroup<SeanceFormControls> = this.fb.nonNullable.group({
  dateHeure: ['', Validators.required],
  coursId: [0, [Validators.required, Validators.min(1)]],
  salleId: [0, [Validators.required, Validators.min(1)]],
});
```

### Inscription INLINE dans chaque séance

```html
<details>
  <summary>Gérer les inscriptions</summary>
  <div>
    <select #selectMembre>
      @for (m of membres(); track m.id) {
        <option [value]="m.id">{{ m.prenom }} {{ m.nom }}</option>
      }
    </select>
    <button (click)="surInscription(s.id, +selectMembre.value)">Inscrire</button>
  </div>

  @if (s.inscriptions && s.inscriptions.length > 0) {
    <table>
      @for (i of s.inscriptions; track i.membreId) {
        <tr>
          <td>{{ nomMembre(i.membreId) }}</td>
          <td>
            <input type="checkbox"
                   [checked]="i.presence"
                   (change)="surTogglePresence(i.membreId, s.id, $event)" />
          </td>
          <td><button (click)="surDesinscription(i.membreId, s.id)">Désinscrire</button></td>
        </tr>
      }
    </table>
  }
</details>
```

### Méthodes clés

```ts
async surInscription(seanceId, membreId) {
  await this.inscriptionService.inscrire({ membreId, seanceId });
  // Re-charge la liste pour voir l'inscription apparaître
  this.seances.set(await this.seanceService.listerTous());
}

async surTogglePresence(membreId, seanceId, event) {
  const presence = (event.target as HTMLInputElement).checked;
  await this.inscriptionService.modifierPresence(membreId, seanceId, presence);
  this.seances.set(await this.seanceService.listerTous());
}

async surDesinscription(membreId, seanceId) {
  await this.inscriptionService.desinscrire(membreId, seanceId);
  this.seances.set(await this.seanceService.listerTous());
}
```

🚨 **Point clé pour l'oral** : `modifierPresence` et `desinscrire` utilisent la clé primaire COMPOSITE de Inscription (`@@id([membreId, seanceId])`). Côté Prisma, on accède via `where: { membreId_seanceId: { membreId, seanceId } }`.

🗣️ **Phrase à dire** : *« SeancesListComponent gère deux entités : Seance (CRUD complet avec selects pour les FK Cours et Salle) et Inscription (notre table de jonction N:M). Pour les opérations sur Inscription, j'utilise la clé primaire composite via where: { membreId_seanceId: { membreId, seanceId } }. C'est l'endroit où je défends la N:M explicite. »*

---

## 9. `AbonnementsListComponent` — utilise l'enum Prisma

📂 `src/renderer/app/components/abonnements-list/abonnements-list.component.ts`, 177 lignes.

### Particularité : enum côté UI

```ts
readonly form: FormGroup<AbonnementFormControls> = this.fb.nonNullable.group({
  type: ['MENSUEL' as TypeAbonnement, Validators.required],
  // ...
});
```

Template :
```html
<select formControlName="type">
  <option value="MENSUEL">Mensuel</option>
  <option value="TRIMESTRIEL">Trimestriel</option>
  <option value="ANNUEL">Annuel</option>
</select>
```

### Computed bonus

```ts
readonly chiffreAffaires = computed(() =>
  Math.round(this.abonnements().reduce((sum, a) => sum + a.prix, 0) * 100) / 100,
);
```

Calcule le chiffre d'affaires total à partir des prix. Recalculé auto.

🗣️ **Phrase à dire** : *« AbonnementsListComponent utilise l'enum Prisma TypeAbonnement côté UI via un select. Un computed calcule le chiffre d'affaires en sommant les prix — recalculé automatiquement à chaque changement. »*

---

## 10. `StatistiquesComponent` — la vitrine des agrégats

📂 `src/renderer/app/components/statistiques/statistiques.component.ts`, 123 lignes.

### Le signal principal

```ts
readonly stats = signal<Statistiques | null>(null);

async ngOnInit() {
  this.stats.set(await this.statistiqueService.obtenir());
}
```

### Le computed UI

```ts
// pourcentage d'actifs dérivé du signal `stats`
readonly pourcentageActifs = computed(() => {
  const s = this.stats();
  if (!s || s.nombreMembresTotal === 0) return 0;
  return (s.nombreMembresActifs / s.nombreMembresTotal) * 100;
});
```

> Ce computed dérive **côté Angular** un pourcentage à partir des stats brutes reçues du main. C'est la démo « computed = dérivation réactive ».

### Le template avec `@if as` (binding nommé)

```html
@if (stats(); as s) {
  <div class="stat-grid">
    <div class="stat-card">
      <div class="value">{{ s.nombreMembresActifs }}</div>
      <div class="label">Membres actifs</div>
    </div>
    <div class="stat-card">
      <div class="value">{{ pourcentageActifs() | number: '1.0-1' }} %</div>
      <div class="label">% Actifs (computed Angular)</div>
    </div>
    <!-- ... -->
  </div>

  <div class="card">
    <h2>Cours par coach (groupBy Prisma)</h2>
    <table>
      @for (g of s.coursParCoach; track g.coachId) {
        <tr>
          <td>{{ g.coachNom }}</td>
          <td>{{ g.nombreCours }}</td>
        </tr>
      }
    </table>
  </div>

  <div class="card">
    <h2>5 prochaines séances (include cours + coach + salle)</h2>
    @for (seance of s.prochainesSeances; track seance.id) {
      <tr>
        <td>{{ seance.dateHeure | date: 'EEE dd/MM HH:mm' }}</td>
        <td>{{ seance.cours?.titre }}</td>
        <td>{{ seance.cours?.coach?.prenom }} {{ seance.cours?.coach?.nom }}</td>
        <td>{{ seance.salle?.nom }}</td>
        <td>{{ seance.inscriptions?.length ?? 0 }} / {{ seance.cours?.capaciteMax }}</td>
      </tr>
    }
  </div>
}
```

- **`@if (stats(); as s)`** : si le signal n'est pas null, on bind sa valeur dans `s` pour le reste du bloc. Plus court que d'écrire `stats()!.xxx` partout.
- **`{{ pourcentageActifs() | number: '1.0-1' }}`** : pipe `number` pour formater (1 chiffre avant la virgule mini, 0 à 1 après).
- **`seance.cours?.coach?.prenom`** : optional chaining — si `cours` ou `coach` est `null`, ça renvoie `undefined` sans planter.

🗣️ **Phrase à dire** : *« Cette page agrège les démos techniques : Prisma count + groupBy + include côté main, signal + computed côté Angular. Le pourcentageActifs est un computed qui dérive en lecture seule la valeur affichée à partir du signal stats. »*

---

## Récap : où trouver quelle notion

| Notion à montrer | Composant à pointer |
|---|---|
| Signal | `membres-list.component.ts:80` |
| Computed | `membres-list.component.ts:91` ou `statistiques.component.ts:108` |
| Effect | `membres-list.component.ts:105` |
| @for / @if | `membres-list.component.ts:46,62` (partout en fait) |
| input.required | `membre-row.component.ts:40` |
| output | `membre-row.component.ts:43` |
| FormBuilder + Validators | `membre-form.component.ts:90-103` |
| Édition inline + signal toggle | `coachs-list.component.ts` |
| Sélecteur de FK | `cours-list.component.ts` (select coach) |
| Computed agrégation | `salles-list.component.ts` (`capaciteTotale`) |
| CRUD sur N:M | `seances-list.component.ts` |
| Enum côté UI | `abonnements-list.component.ts` |
| Pipes (date, number) | `membre-row.component.ts:30`, `statistiques.component.ts` |

---

## Mini-quiz

1. Quel composant démontre `input.required` et `output` ?
2. Quel composant a un `effect()` ?
3. Comment je passe un objet d'un parent à un enfant ?
4. Comment je remonte un événement d'un enfant à un parent ?
5. Dans quel composant je gère le CRUD sur la table de jonction Inscription ?

Réponses :
1. `MembreRowComponent` (`membre-row.component.ts:40-43`).
2. `MembresListComponent` (`membres-list.component.ts:105`).
3. Avec un `input.required<T>()` côté enfant et `[propriete]="valeur"` côté parent.
4. Avec un `output<T>()` côté enfant + `.emit(...)`, et `(evenement)="handler($event)"` côté parent.
5. `SeancesListComponent` — j'utilise la clé composite via `where: { membreId_seanceId: { ... } }`.

Si tout est OK, passe au **cours 06** : les flux complets. ⭐
