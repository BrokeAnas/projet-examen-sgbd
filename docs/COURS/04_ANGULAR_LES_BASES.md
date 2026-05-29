# 📖 Cours 04 — Angular pour les débutants

> 🎯 **Objectif** : à la fin, tu sais expliquer chaque notion Angular obligatoire du PDF avec une analogie et un extrait de TON code.

---

## 1. C'est quoi Angular ?

📖 **Définition simple** : **Angular** est un framework JavaScript pour fabriquer des interfaces utilisateur web complexes.

🎯 **Pourquoi un framework et pas du JS vanilla ?** Parce que sans framework, gérer un gros UI à la main (mise à jour du DOM, gestion d'état, routes, formulaires…) devient vite ingérable. Angular fournit toute la structure.

🍕 **Analogie** : Angular, c'est comme un **kit IKEA** pour monter une UI. Tu reçois des modules prêts à l'emploi (composants, services, routing), il te suffit d'assembler.

---

## 2. Composant standalone — la brique de base

### 📖 C'est quoi un composant ?

Un **composant** = un bout d'UI auto-suffisant : un fichier `.ts` qui contient à la fois la logique (TypeScript) et la vue (HTML dans une template).

🍕 **Analogie** : une **brique Lego**. Tu en assembles plusieurs pour faire une maison (= l'application).

### 📖 Standalone vs NgModule

**Avant Angular 14** : chaque composant devait être déclaré dans un `NgModule`. Lourd, verbeux.

**Aujourd'hui (Angular ≥ 14, recommandé ≥ 17)** : les **composants standalone** s'importent eux-mêmes leurs dépendances. Plus besoin de NgModule.

💻 **Dans ton code** (`membre-row.component.ts:17-23`) :
```ts
@Component({
  selector: 'app-membre-row',
  standalone: true,                       // ← clé
  imports: [DatePipe, RouterLink],        // ← le composant déclare lui-même ce qu'il utilise
  template: `<tr>...</tr>`,
})
export class MembreRowComponent { ... }
```

🗣️ **Phrase à dire** : *« J'utilise les composants standalone, c'est l'approche moderne d'Angular ≥ 14. Chaque composant déclare lui-même ses dépendances dans son tableau imports. Plus besoin de NgModule. »*

❓ **Question piège** : *« Et si tu mettais standalone: false ? »*
> Il faudrait recréer un NgModule racine, déclarer le composant dedans, l'importer dans le bootstrap. Plus de code, moins de tree-shakable. Aucun intérêt sauf pour rétro-compatibilité.

---

## 3. Signal — la boîte aux lettres réactive

### 📖 C'est quoi un signal ?

Un **signal** est une variable spéciale qui :
1. Stocke une valeur
2. Notifie automatiquement tous ses « lecteurs » quand la valeur change

🍕 **Analogie** : c'est une **boîte aux lettres avec un drapeau**. Quand quelqu'un dépose une lettre, le drapeau se lève et tous les voisins (les `computed`, les templates) sont prévenus.

### 📖 Syntaxe

```ts
import { signal } from '@angular/core';

const compteur = signal(0);     // crée le signal avec valeur initiale 0

console.log(compteur());        // lire la valeur (avec les parenthèses !)
compteur.set(5);                // écrire (remplace)
compteur.update(v => v + 1);    // écrire (basé sur l'ancienne valeur)
```

🚨 **Pour LIRE un signal, il faut l'appeler comme une fonction** : `compteur()` et pas `compteur`. C'est ce qui permet à Angular de tracker qui lit quoi.

### 💻 Dans TON code

`membres-list.component.ts` lignes 79-86 :
```ts
// Liste complète des membres récupérés.
readonly membres = signal<Membre[]>([]);

// Filtre courant (TOUS, ACTIF, SUSPENDU, RESILIE).
readonly filtreActif = signal<FiltreStatut>('TOUS');

// Message d'erreur éventuel.
readonly erreur = signal<string | null>(null);
```

Et plus loin, mise à jour :
```ts
this.membres.set(await this.membreService.listerTous());
// ou
this.membres.update(liste => liste.filter(m => m.id !== id));
```

🗣️ **Phrase à dire** : *« signal() crée un conteneur réactif. Je le lis avec les parenthèses, je le modifie avec set() ou update(). Dès que je modifie, Angular met automatiquement à jour les vues qui dépendent de ce signal. »*

---

## 4. Computed — la valeur dérivée

### 📖 C'est quoi un computed ?

Un **computed** est une valeur DÉRIVÉE d'un ou plusieurs signaux. Recalculée AUTOMATIQUEMENT quand un de ses signaux change. **En lecture seule** (pas de `.set()`).

🍕 **Analogie** : c'est comme une **formule Excel** : `=A1*B1`. Tu changes A1 ou B1, la cellule se met à jour toute seule.

### 📖 Syntaxe

```ts
import { signal, computed } from '@angular/core';

const a = signal(5);
const b = signal(3);
const somme = computed(() => a() + b());   // 8 maintenant

a.set(10);
console.log(somme());                       // 13 automatiquement
```

### 💻 Dans TON code

`membres-list.component.ts` lignes 88-99 :
```ts
// Nombre de membres actifs : recalculé automatiquement quand `membres` change.
readonly nombreMembresActifs = computed(
  () => this.membres().filter((m) => m.statut === 'ACTIF').length,
);

// Liste filtrée affichée dans le tableau.
readonly membresFiltres = computed(() => {
  const filtre = this.filtreActif();
  if (filtre === 'TOUS') return this.membres();
  return this.membres().filter((m) => m.statut === filtre);
});
```

Quand tu changes `this.filtreActif.set('ACTIF')`, `membresFiltres` se recalcule automatiquement, et le `@for (m of membresFiltres(); track m.id)` dans le template redessine la liste filtrée. Magique.

🗣️ **Phrase à dire** : *« computed() crée une valeur dérivée en lecture seule. Elle se recalcule automatiquement quand un signal qu'elle lit change. C'est de la programmation réactive. »*

❓ **Question piège** : *« Différence entre signal et computed ? »*
> signal = valeur MUTABLE, source de vérité, modifiée avec set/update. computed = valeur DÉRIVÉE en lecture seule, calculée automatiquement à partir d'autres signaux.

---

## 5. Effect — le side-effect réactif

### 📖 C'est quoi un effect ?

Un **effect** exécute du CODE quand un signal qu'il lit change. **Il ne renvoie pas de valeur**. C'est pour les **side-effects** (logs, appels API, manip DOM…).

🍕 **Analogie** : c'est l'**alarme** qui se déclenche quand le drapeau de la boîte aux lettres se lève. Elle ne contient pas la lettre, elle déclenche juste une action.

### 📖 Syntaxe

```ts
import { signal, effect } from '@angular/core';

const filtre = signal('TOUS');

effect(() => {
  console.log('Filtre changé →', filtre());
});
// Loggue à chaque changement de filtre
```

🚨 **`effect()` doit être créé dans un contexte d'injection** : soit dans le constructor d'un composant/service, soit dans une factory.

### 💻 Dans TON code

`membres-list.component.ts` lignes 101-107 :
```ts
constructor() {
  // BONUS : effect() exécute du code quand un signal qu'il LIT change.
  // Ici on logue chaque changement de filtre.
  effect(() => {
    console.log('[effect] Filtre membre changé →', this.filtreActif());
  });
}
```

🗣️ **Phrase à dire** : *« effect() c'est pour les side-effects réactifs. Il s'exécute automatiquement quand un signal qu'il lit change. Ici je l'utilise pour logger les changements de filtre — c'est le bonus mentionné dans l'annexe 5.1 du PDF. »*

❓ **Question piège** : *« Pourquoi ne pas tout faire en effect() ? »*
> Parce que effect() est pour des SIDE-EFFECTS (logs, IO). Pour les valeurs dérivées, on utilise computed() qui est plus optimisé et plus déclaratif.

---

## 6. @for / @if — la nouvelle syntaxe (Angular ≥ 17)

### 📖 C'est quoi ?

C'est le **control flow** dans les templates Angular. Avant on utilisait des directives structurelles (`*ngFor`, `*ngIf`) avec des `*` bizarres. Depuis Angular 17, on a une syntaxe avec `@for`, `@if`, `@else`, `@switch`.

🍕 **Analogie** : c'est la différence entre **ranger ses chaussettes en boule** (`*ngFor`, fonctionnel mais moche) et **les plier proprement par paires** (`@for`, lisible).

### 📖 Syntaxe

```html
@if (condition) {
  <p>Affiché si vrai</p>
} @else {
  <p>Sinon</p>
}

@for (item of liste; track item.id) {
  <li>{{ item.nom }}</li>
}

@switch (statut) {
  @case ('ACTIF') { ... }
  @case ('SUSPENDU') { ... }
  @default { ... }
}
```

🚨 **`track`** est obligatoire dans `@for` : c'est ce qui permet à Angular d'optimiser le rendu. On track sur une propriété unique (généralement l'id).

### 💻 Dans TON code

`membres-list.component.ts` lignes 46-65 :
```html
<!-- @if : pas de membres -->
@if (membresFiltres().length === 0) {
  <div class="card">Aucun membre à afficher.</div>
} @else {
  <table>
    <thead>...</thead>
    <tbody>
      <!-- @for : nouvelle syntaxe de boucle. track obligatoire pour la perf. -->
      @for (m of membresFiltres(); track m.id) {
        <app-membre-row [membre]="m" (supprime)="surSuppression($event)" />
      }
    </tbody>
  </table>
}
```

🗣️ **Phrase à dire** : *« J'utilise la nouvelle syntaxe @for / @if d'Angular 17+. Elle est plus lisible que les *ngFor / *ngIf et plus performante. Le track sur l'id est obligatoire pour optimiser le rendu. »*

---

## 7. Service + Injection de dépendance

### 📖 C'est quoi un service ?

Un **service** = une classe TypeScript qui contient de la logique RÉUTILISABLE (typiquement : appels API, état partagé, calculs).

🎯 **Pourquoi pas mettre cette logique dans le composant ?** Parce que :
1. **Réutilisable** : plusieurs composants peuvent utiliser le même service.
2. **Testable** : on peut mocker le service dans les tests.
3. **Séparation des responsabilités** : le composant gère l'UI, le service gère la logique métier.

### 📖 Injection de dépendance (DI)

**Injection de dépendance** = pattern où une classe **reçoit** ses dépendances au lieu de les **créer** elle-même.

🍕 **Analogie** : tu commandes un café. Au lieu d'aller toi-même planter le caféier (créer l'objet), tu DEMANDES un café (tu reçois l'objet déjà fait).

### 📖 `providedIn: 'root'` = singleton

```ts
@Injectable({ providedIn: 'root' })
export class MembreService { ... }
```

> `providedIn: 'root'` enregistre le service dans l'injecteur RACINE d'Angular. Toute l'app reçoit la MÊME instance via `inject()`.

### 📖 `inject(...)` (Angular 14+)

Ancienne syntaxe (Angular ≤ 13) :
```ts
constructor(private readonly membreService: MembreService) {}
```

Nouvelle syntaxe (Angular 14+, recommandée) :
```ts
private readonly membreService = inject(MembreService);
```

Plus court, fonctionne aussi en dehors du constructor.

### 💻 Dans TON code

`membre.service.ts:19` :
```ts
@Injectable({ providedIn: 'root' })
export class MembreService {
  async listerTous(): Promise<Membre[]> {
    const reponse = await window.api.membres.listerTous();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }
  // ...
}
```

`membres-list.component.ts:77` :
```ts
export class MembresListComponent {
  private readonly membreService = inject(MembreService);
  // ...
}
```

🗣️ **Phrase à dire** : *« Mes services sont @Injectable avec providedIn: 'root', donc des singletons. Je les récupère dans les composants avec inject(). C'est l'injection de dépendance moderne d'Angular. »*

---

## 8. `input.required<T>()` et `output<T>()` — communication parent ↔ enfant

### 📖 Schéma parent ↔ enfant

```
┌────────────────────────────────┐
│   ParentComponent              │
│                                │
│   <child                       │
│     [donnee]="x"               │   ← input (parent → enfant)
│     (event)="handle($event)"   │   ← output (enfant → parent)
│   />                           │
└────────────────────────────────┘
```

### 📖 `input.required<T>()`

Définit une propriété d'ENTRÉE obligatoire. Le parent DOIT la fournir, sinon erreur de compilation.

```ts
@Component({...})
export class MembreRowComponent {
  readonly membre = input.required<Membre>();
}
```

Côté parent :
```html
<app-membre-row [membre]="m" />   <!-- obligatoire de passer membre -->
```

🍕 **Analogie** : c'est comme un **paramètre obligatoire** d'une fonction. Si tu oublies, ça ne compile pas.

### 📖 `output<T>()`

Définit un événement que l'enfant émet vers le parent.

```ts
@Component({...})
export class MembreRowComponent {
  readonly supprime = output<number>();

  onSupprimer() {
    this.supprime.emit(this.membre().id);   // émet l'événement
  }
}
```

Côté parent :
```html
<app-membre-row [membre]="m" (supprime)="surSuppression($event)" />
```

🍕 **Analogie** : l'enfant crie quelque chose, le parent l'entend. `output` = mégaphone de l'enfant.

### 💻 Dans TON code

`membre-row.component.ts` lignes 37-48 :
```ts
export class MembreRowComponent {
  // input.required : le parent DOIT fournir cette valeur (sinon erreur de compilation).
  readonly membre = input.required<Membre>();

  // output : signal-based event emitter. Le parent écoute via (supprime)="..."
  readonly supprime = output<number>();

  onSupprimer(): void {
    this.supprime.emit(this.membre().id);
  }
}
```

Côté parent (`membres-list.component.ts:63`) :
```html
@for (m of membresFiltres(); track m.id) {
  <app-membre-row [membre]="m" (supprime)="surSuppression($event)" />
}
```

🗣️ **Phrase à dire** : *« Pour la communication parent → enfant j'utilise input.required<T>() qui force le parent à fournir la donnée. Pour enfant → parent, j'utilise output<T>() qui émet un event. C'est la nouvelle API signal-based d'Angular 17.3+. »*

❓ **Question piège** : *« Différence entre input() et input.required() ? »*
> `input<T>()` accepte la valeur optionnellement (peut être undefined). `input.required<T>()` force le parent à fournir la valeur — sinon erreur TypeScript au compile.

---

## 9. Formulaire réactif

### 📖 C'est quoi un formulaire réactif ?

Un formulaire **construit en TypeScript** (pas dans le HTML) avec un objet `FormGroup` qui décrit chaque champ et ses validators.

🍕 **Analogie** : c'est l'opposé d'un formulaire « template-driven » où tu mets des `ngModel` partout dans le HTML. Avec le réactif, le formulaire est un objet TypeScript, manipulable comme tu veux. Beaucoup plus propre pour des forms complexes.

### 📖 FormBuilder + Validators

**`FormBuilder`** : service pour construire des `FormGroup` rapidement.
**`Validators`** : règles de validation prêtes à l'emploi (`required`, `email`, `min`, `max`, `minLength`…).

### 💻 Dans TON code

`membre-form.component.ts` lignes 87-103 :
```ts
private readonly fb = inject(FormBuilder);

readonly form: FormGroup<MembreFormControls> = this.fb.nonNullable.group({
  nom: ['', [Validators.required, Validators.minLength(2)]],
  prenom: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.required, Validators.email]],
  statut: ['ACTIF' as StatutMembre, Validators.required],
});
```

Côté HTML (lignes 39-71) :
```html
<form [formGroup]="form" (ngSubmit)="surSoumission()">
  <input type="text" formControlName="nom" />
  @if (form.controls.nom.invalid && form.controls.nom.touched) {
    <div class="error">Le nom est requis.</div>
  }
  <!-- ... -->
  <button type="submit" [disabled]="form.invalid">Enregistrer</button>
</form>
```

🚨 **`this.fb.nonNullable.group`** : variante non-nullable qui empêche les `null` partout dans le formulaire. Combiné avec un type strict `FormGroup<MembreFormControls>`, c'est ultra type-safe.

### Récupérer les valeurs

```ts
const valeurs = this.form.getRawValue();
// → { nom: 'Dupont', prenom: 'Marie', email: 'm@gym.local', statut: 'ACTIF' }
```

🗣️ **Phrase à dire** : *« J'utilise un FormGroup avec FormBuilder.nonNullable pour la sécurité du typage, et Validators.required, Validators.email, Validators.minLength pour les règles. Le formulaire est lié au HTML via [formGroup] et formControlName, et je désactive le bouton submit tant que form.invalid. »*

---

## 10. Routage

### 📖 C'est quoi le routage ?

Le **routage** est ce qui permet de naviguer entre plusieurs « pages » dans une SPA (Single Page Application) sans recharger.

🍕 **Analogie** : une SPA, c'est comme un **classeur avec onglets**. Tu cliques sur un onglet, l'onglet courant change, mais le classeur reste le même. Le routage gère ce changement d'onglet.

### 📖 Bootstrap du router

`main.ts` (renderer) :
```ts
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
});
```

### 📖 Définition des routes

`app.routes.ts` :
```ts
export const routes: Routes = [
  { path: '', redirectTo: 'membres', pathMatch: 'full' },
  { path: 'membres', loadComponent: () => import('./components/.../membres-list.component').then(m => m.MembresListComponent) },
  { path: 'membres/nouveau', loadComponent: () => import('./components/.../membre-form.component').then(m => m.MembreFormComponent) },
  { path: 'membres/:id/modifier', loadComponent: () => import('./components/.../membre-form.component').then(m => m.MembreFormComponent) },
  // ... 7 autres routes
];
```

🚨 **`loadComponent` = lazy loading** : le composant n'est CHARGÉ qu'au moment où on visite la route. Avantage : bundle initial plus léger.

🚨 **`:id`** = paramètre dynamique. Récupérable dans le composant via `inject(ActivatedRoute)` → `route.snapshot.paramMap.get('id')`.

### 📖 `<router-outlet>` et `routerLink`

`app.component.ts` :
```html
<nav>
  <a routerLink="/membres" routerLinkActive="active">Membres</a>
  <a routerLink="/cours" routerLinkActive="active">Cours</a>
  <!-- ... -->
</nav>
<main>
  <router-outlet />   <!-- ← ici Angular injectera le composant de la route courante -->
</main>
```

- **`<router-outlet>`** : trou où Angular insère le composant de la route active.
- **`routerLink="/x"`** : équivalent moderne du `href` qui navigue SANS recharger la page.
- **`routerLinkActive="active"`** : ajoute la classe CSS `active` au lien si la route courante correspond.

🗣️ **Phrase à dire** : *« Mon routing est configuré dans app.routes.ts avec provideRouter. J'ai 10 routes, toutes en lazy loading via loadComponent pour optimiser le bundle initial. Les liens utilisent routerLink et l'affichage se fait dans <router-outlet>. »*

---

## 11. Récap des 13 notions Angular obligatoires

| # | Notion | Mot-clé | Où dans ton code |
|---|---|---|---|
| 1 | Composant standalone | `standalone: true` | tous les composants |
| 2 | TypeScript interfaces | `interface X { ... }` | `domain.types.ts` |
| 3 | `signal()` | `signal<T>(val)` | `membres-list.component.ts:80` |
| 4 | `computed()` | `computed(() => ...)` | `membres-list.component.ts:91` |
| 5 | `@for / @if` | control flow | `membres-list.component.ts:46,62` |
| 6 | Service + DI | `inject(X)` | `membres-list.component.ts:77` |
| 7 | Singleton | `providedIn: 'root'` | `membre.service.ts:19` |
| 8 | `input.required<T>()` | obligatoire | `membre-row.component.ts:40` |
| 9 | `output<T>()` | événement enfant→parent | `membre-row.component.ts:43` |
| 10 | Formulaire réactif | `FormBuilder + Validators` | `membre-form.component.ts:90` |
| 11 | Routage | `provideRouter` | `main.ts` + `app.routes.ts` |
| 12 | `RouterLink` | `routerLink="..."` | `app.component.ts:21-27` |
| 13 | `effect()` (bonus) | side-effect | `membres-list.component.ts:105` |

---

## 12. Mini-quiz

1. C'est quoi un signal ? Comment je le lis et je le modifie ?
2. Différence entre signal et computed ?
3. Pourquoi `providedIn: 'root'` ?
4. Donne la syntaxe `input.required` et `output`.
5. Comment je passe un paramètre `id` dans une route et je le récupère dans le composant ?

Réponses :
1. Un signal est un conteneur réactif. Je le LIS avec `monSignal()`. Je le MODIFIE avec `.set(val)` ou `.update(fn)`.
2. signal = mutable, source de vérité. computed = dérivé en lecture seule, recalculé auto.
3. Pour avoir un singleton sur toute l'app, partagé via inject().
4. `readonly x = input.required<Type>();` et `readonly y = output<Type>();` + `this.y.emit(val)`.
5. Route : `{ path: 'membres/:id/modifier', loadComponent: ... }`. Récupération : `const id = this.route.snapshot.paramMap.get('id');`.

Si tout est OK, passe au **cours 05** sur tes composants. 🎉
