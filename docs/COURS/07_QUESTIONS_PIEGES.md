# 📖 Cours 07 — 30 questions piège + réponses prêtes à l'emploi

> 🎯 **Objectif** : pour chaque question, deux réponses (courte 30 sec + détaillée si le prof creuse) + fichier:ligne à pointer.

---

# CATÉGORIE A — Architecture (5 questions)

## A1. « Pourquoi 3 processus dans Electron ? »

**🟢 Réponse courte** (30 sec) :
> Pour la sécurité. Le main process tourne en Node.js et a accès au système. Le renderer affiche l'UI dans Chromium et est isolé — il pourrait être compromis par un XSS. Le preload est le pont contrôlé entre les deux. Cette séparation empêche qu'une faille dans l'UI exécute du code Node arbitraire.

**🔵 Réponse détaillée** :
> Electron repose sur Chromium pour l'affichage et Node.js pour le système. Si ces deux mondes étaient mélangés, une simple injection JS dans le DOM (XSS) suffirait à appeler `require('child_process').exec('rm -rf /')`. La séparation en 3 processus, combinée à `contextIsolation: true` et `nodeIntegration: false`, garantit que le renderer ne peut accéder à Node QUE via les fonctions explicitement exposées par le preload via `contextBridge.exposeInMainWorld`. C'est une whitelist, pas une blacklist.

📂 **À pointer** : `src/main/main.ts:27-33` (les `webPreferences`).

---

## A2. « Pourquoi le renderer ne peut pas accéder à Node.js directement ? »

**🟢 Réponse courte** :
> Parce que `nodeIntegration: false` désactive `require()` et les API Node dans le renderer, et `contextIsolation: true` isole le contexte JS du preload de celui du renderer. C'est exprès, pour la sécurité.

**🔵 Réponse détaillée** :
> Avec ces deux flags, le renderer ne voit que les API Web standard (DOM, fetch…). Il n'a aucun moyen d'utiliser `require`, `process`, `__dirname`, ni de require Prisma. Pour atteindre la DB, il doit passer par `window.api` exposé par le preload. Le preload, lui, peut utiliser certaines API Electron (notamment `ipcRenderer`) parce qu'on a mis `sandbox: false`.

📂 **À pointer** : `src/main/main.ts:29-31`.

---

## A3. « Quel est le rôle exact du preload ? »

**🟢 Réponse courte** :
> Le preload est un pont sécurisé. Il s'exécute dans un contexte spécial qui a accès à Electron mais qui est isolé du JS du renderer. Il utilise `contextBridge.exposeInMainWorld('api', ...)` pour exposer une API précise — une whitelist — sur `window.api`. Le renderer ne peut faire QUE ce que le preload a exposé.

**🔵 Réponse détaillée** :
> Le preload est un script qui tourne AVANT que la page se charge, dans le même processus que le renderer mais dans un « contexte de monde » séparé (`contextIsolation: true`). Grâce à `contextBridge`, il peut exposer des fonctions vers le `window` global du renderer. Ces fonctions, elles, peuvent appeler `ipcRenderer.invoke` pour communiquer avec le main. Donc le preload sert à TROIS choses : (1) restreindre l'API disponible côté renderer, (2) typer cette API pour qu'elle soit auto-complétée, (3) faire le bridge IPC asynchrone.

📂 **À pointer** : `src/preload/preload.ts:88`.

---

## A4. « Pourquoi un singleton pour PrismaClient ? »

**🟢 Réponse courte** :
> Chaque `new PrismaClient()` ouvre un pool de connexions à SQLite. Si on en crée plusieurs, on gaspille les ressources et on risque des fuites mémoire. En instanciant une seule fois et en exportant la référence, tout le code partage le même pool.

**🔵 Réponse détaillée** :
> Le singleton est un pattern où une classe a UNE SEULE INSTANCE partagée. Dans notre cas, `src/main/prisma-client.ts` crée `export const prisma = new PrismaClient(...)` au niveau module. Tous les `import { prisma } from './prisma-client'` dans le main reçoivent CETTE instance. C'est aussi pratique pour la déconnexion : un seul `prisma.$disconnect()` avant `app.quit()` suffit.

📂 **À pointer** : `src/main/prisma-client.ts:13-15`.

---

## A5. « Comment tu gères le cycle de vie de l'application ? »

**🟢 Réponse courte** :
> Dans `main.ts`, je m'abonne à 3 événements de l'objet `app` : `whenReady` pour enregistrer les handlers IPC puis créer la fenêtre, `window-all-closed` pour quitter (sauf sur macOS), et `before-quit` pour déconnecter Prisma proprement.

📂 **À pointer** : `src/main/main.ts:51-76`.

---

---

# CATÉGORIE B — Prisma & SQL (10 questions)

## B1. « Différence entre `include` et `select` ? »

**🟢 Réponse courte** :
> `include` te ramène le modèle ENTIER plus les relations imbriquées en plus. `select` te ramène UNIQUEMENT les champs que tu listes (whitelist). `include` = pratique en dev. `select` = optimisé pour la prod.

**🔵 Réponse détaillée** :
> `include: { coach: true }` renvoie tous les champs du modèle principal + l'objet Coach lié. `select: { nom: true, prenom: true }` renvoie SEULEMENT nom et prenom (pas même l'id, sauf si tu le précises). En SQL : `include` ≈ `SELECT * FROM x LEFT JOIN y`, `select` ≈ `SELECT col1, col2 FROM x`.

📂 **À pointer** : `src/main/ipc-handlers.ts:144-149` (exemple `include`).

---

## B2. « Pourquoi Cascade ici et Restrict là ? »

**🟢 Réponse courte** :
> Cascade = quand le parent disparaît, les enfants partent avec — j'utilise ça quand un enfant n'a aucun sens sans son parent (Inscription sans Membre, Séance sans Cours). Restrict = la suppression du parent est REFUSÉE tant qu'il a des enfants — j'utilise ça quand je veux protéger l'intégrité métier (Coach avec cours actifs, Salle utilisée).

**🔵 Réponse détaillée** :
> | Relation | Choix | Pourquoi |
> |---|---|---|
> | Coach→Cours | Restrict | Préserver la pédagogie : l'admin doit d'abord réassigner les cours |
> | Salle→Seance | Restrict | Une séance sans salle n'a pas de sens |
> | Cours→Seance | Cascade | Sans le cours, la séance est orpheline |
> | Seance→Inscription | Cascade | Si la séance est annulée, les inscriptions disparaissent |
> | Membre→Inscription | Cascade | RGPD : effacer le membre = effacer son historique |
> | Membre→Abonnement | Cascade | RGPD idem |

📂 **À pointer** : `prisma/schema.prisma:99, 131, 138, 164, 169, 193`.

---

## B3. « Donne-moi le SQL généré par cette ligne Prisma : `prisma.cours.findMany({ include: { coach: true } })` »

**🟢 Réponse courte** :
> ```sql
> SELECT * FROM Cours;
> -- puis pour chaque cours :
> SELECT * FROM Coach WHERE id IN (...coachIds...);
> ```
> Prisma optimise en faisant 2 requêtes au lieu d'un JOIN (évite le « cartesian product » sur les N:N).

**🔵 Réponse détaillée** :
> Prisma génère des requêtes optimisées. Pour `include: { coach: true }`, il fait d'abord `SELECT * FROM Cours`, récupère les `coachId` distincts, puis fait `SELECT * FROM Coach WHERE id IN (...)` et assemble les objets côté client. C'est plus efficace que `SELECT * FROM Cours LEFT JOIN Coach` qui produirait de la duplication.

---

## B4. « Pourquoi une table de jonction explicite ? »

**🟢 Réponse courte** :
> Parce que je veux stocker des champs supplémentaires sur la relation : `dateInscription` et `presence`. Avec une N:M implicite, Prisma crée une table cachée avec UNIQUEMENT les 2 FK — impossible d'y ajouter des colonnes.

**🔵 Réponse détaillée** :
> Une N:M implicite (`Seance[]` ↔ `Membre[]`) crée une table `_MembreToSeance(A, B)`. Prisma la gère tout seul. Mais je veux savoir QUAND un membre s'est inscrit et S'IL EST VENU. Donc je crée explicitement la table avec `model Inscription { membreId, seanceId, dateInscription, presence, @@id([membreId, seanceId]) }`. La PK composite garantit qu'un même couple n'existe qu'une fois.

📂 **À pointer** : `prisma/schema.prisma:167-184`.

---

## B5. « Que se passe-t-il si je supprime un Coach qui anime 3 Cours ? »

**🟢 Réponse courte** :
> Ça plante. Mon `onDelete: Restrict` sur `coachId` côté Cours lève une erreur Prisma `Foreign key constraint failed`. C'est voulu : l'admin doit d'abord réassigner ou supprimer les cours du coach. C'est de la protection métier.

📂 **À pointer** : `prisma/schema.prisma:99`.

---

## B6. « Que se passe-t-il si je supprime un Membre qui a 5 inscriptions et 2 abonnements ? »

**🟢 Réponse courte** :
> Tout part en cascade. Les 5 inscriptions et 2 abonnements sont supprimés automatiquement par SQLite grâce à `ON DELETE CASCADE` sur les FK `membreId`. C'est le RGPD : droit à l'effacement.

📂 **À pointer** : `prisma/schema.prisma:172, 193`.

---

## B7. « C'est quoi `@@id([membreId, seanceId])` ? »

**🟢 Réponse courte** :
> C'est une clé primaire COMPOSITE — la PK est la combinaison des deux colonnes. Ça garantit qu'un même couple (membre, séance) ne peut exister qu'une fois. SQL équivalent : `PRIMARY KEY (membreId, seanceId)`.

**🔵 Réponse détaillée** :
> Le double `@@` est une annotation au niveau du MODÈLE (alors que `@` est au niveau du champ). `@@id` crée une PK composite. Conséquence pratique : pour cibler une ligne, on utilise `where: { membreId_seanceId: { membreId: 5, seanceId: 12 } }` en Prisma. C'est utile pour modifier la présence ou désinscrire.

📂 **À pointer** : `prisma/schema.prisma:183`. Usage : `src/main/ipc-handlers.ts:497, 510`.

---

## B8. « Différence entre `findUnique` et `findFirst` ? »

**🟢 Réponse courte** :
> `findUnique` cherche par un champ UNIQUE (id ou @unique). `findFirst` cherche la première ligne qui matche une condition. Pour aller chercher un membre par id, j'utilise `findUnique` (plus rapide, indexé).

---

## B9. « Comment ton schéma garantit qu'on ne peut pas inscrire deux fois le même membre à la même séance ? »

**🟢 Réponse courte** :
> Grâce à la clé primaire composite `@@id([membreId, seanceId])` sur Inscription. SQLite refuse l'insertion d'un doublon avec une erreur `UNIQUE constraint failed`.

---

## B10. « C'est quoi un agrégat Prisma ? Donne-moi un exemple. »

**🟢 Réponse courte** :
> Un agrégat est une fonction qui réduit plusieurs lignes en une valeur : `count`, `sum`, `avg`, `min`, `max`, `groupBy`. Exemple chez moi : `prisma.membre.count({ where: { statut: 'ACTIF' } })` → SELECT COUNT(*) FROM Membre WHERE statut = 'ACTIF'.

📂 **À pointer** : `src/main/ipc-handlers.ts:219, 228`.

---

## B11. « C'est quoi une transaction et pourquoi tu en as utilisé une ? » ⭐

**🟢 Réponse courte** (30 sec) :
> Une transaction est un groupe d'opérations DB qui doivent toutes réussir ou toutes échouer ensemble — c'est l'atomicité du modèle ACID. J'en utilise une dans le handler `abonnements:souscrireEtActiver` pour créer un abonnement ET passer le membre à ACTIF en une seule opération. Si une des deux échoue, Prisma fait ROLLBACK automatique et la base reste cohérente. Sans transaction, on pourrait avoir un paiement encaissé sans bénéfice pour le client.

**🔵 Réponse détaillée** :
> J'utilise la syntaxe interactive avec callback :
> ```ts
> await prisma.$transaction(async (tx) => {
>   const abonnement = await tx.abonnement.create({ data: {...} });
>   const membre = await tx.membre.update({ where: { id: ... }, data: { statut: 'ACTIF' } });
>   return { abonnement, membre };
> });
> ```
> J'ai choisi le format callback (vs le format array) parce qu'il permet de la logique entre les opérations : conditions, lectures intermédiaires, transformation. À l'intérieur, j'utilise `tx` (pas `prisma`) — c'est un client Prisma lié à la transaction. Si le callback throw, Prisma exécute `ROLLBACK`. S'il return, Prisma exécute `COMMIT` et la valeur retournée devient le résultat de `$transaction`.
>
> Le SQL généré sous le capot est :
> ```sql
> BEGIN TRANSACTION;
>   INSERT INTO Abonnement ...;
>   UPDATE Membre SET statut = 'ACTIF' WHERE id = ?;
> COMMIT;
> ```

📂 **À pointer** : `src/main/ipc-handlers.ts:569-636`.

---

## B12. « Que se passerait-il si tu enlevais le $transaction ? » ⭐

**🟢 Réponse courte** :
> Je ferais deux appels Prisma séparés : `prisma.abonnement.create(...)` puis `prisma.membre.update(...)`. Si le `create` réussit mais l'`update` plante (panne réseau, membre supprimé entre-temps, contrainte violée…), la base se retrouverait avec un abonnement créé MAIS un membre toujours SUSPENDU. Donnée incohérente : le client a payé mais ne peut pas accéder aux séances. Le `$transaction` garantit que si l'une des deux échoue, AUCUNE n'est appliquée. C'est exactement l'atomicité du modèle ACID — A pour Atomicité.

**🔵 Réponse détaillée** :
> Sans transaction, le flow ressemblerait à :
> ```ts
> const abonnement = await prisma.abonnement.create({ data: {...} });  // ✓ OK
> // ← si crash ici (panne disque, redémarrage Node, etc.)
> const membre = await prisma.membre.update({...});                     // ✗ jamais exécuté
> ```
> Résultat : ligne Abonnement présente mais Membre.statut pas mis à jour. La base est dans un état que la logique métier interdit (abonnement payé mais membre suspendu).
>
> Avec `$transaction`, Prisma envoie un `BEGIN TRANSACTION` à SQLite. Aucune écriture n'est visible des autres connexions tant que le `COMMIT` n'a pas été exécuté. Si une exception est levée, Prisma exécute `ROLLBACK` et toutes les écritures non encore commit sont annulées. Cohérence préservée à 100 %.
>
> 🍕 **Analogie virement bancaire** : sans transaction, l'argent peut « disparaître » si la machine plante entre le débit et le crédit. Avec transaction, soit le virement complet est validé, soit rien ne change.

📂 **À pointer** : `src/main/ipc-handlers.ts:569-636`.

---

---

# CATÉGORIE C — Angular (10 questions)

## C1. « Différence entre signal et computed ? »

**🟢 Réponse courte** :
> signal = valeur MUTABLE, source de vérité, modifiée avec `.set()` ou `.update()`. computed = valeur DÉRIVÉE en lecture seule, recalculée AUTOMATIQUEMENT quand un signal qu'elle lit change.

**🔵 Réponse détaillée** :
> ```ts
> const x = signal(5);                       // valeur mutable
> x.set(10); x.update(v => v + 1);           // OK
> const double = computed(() => x() * 2);    // dérivé
> double.set(99);                            // ❌ ERREUR — read-only
> ```
> Le signal est la source. Le computed le suit comme une formule Excel.

📂 **À pointer** : `membres-list.component.ts:80` (signal) et `:91` (computed).

---

## C2. « C'est quoi `providedIn: 'root'` ? »

**🟢 Réponse courte** :
> C'est la déclaration pour faire d'un service un singleton dans toute l'app. Angular l'enregistre dans l'injecteur racine. Quand n'importe quel composant fait `inject(MonService)`, il reçoit la MÊME instance.

📂 **À pointer** : `src/renderer/app/services/membre.service.ts:19`.

---

## C3. « Comment fonctionne un formulaire réactif ? »

**🟢 Réponse courte** :
> On construit un `FormGroup` en TypeScript avec `FormBuilder.nonNullable.group({ champ: ['', validators] })`. On le lie au HTML avec `[formGroup]="form"` et `formControlName="x"`. Le formulaire est un objet manipulable : on lit `form.controls.x.valid`, on récupère les valeurs avec `form.getRawValue()`, on désactive le submit tant que `form.invalid`.

📂 **À pointer** : `membre-form.component.ts:90-103`.

---

## C4. « Différence entre `@for` et `*ngFor` ? »

**🟢 Réponse courte** :
> `@for` est la nouvelle syntaxe Angular 17+, plus lisible et plus performante. `*ngFor` est l'ancienne syntaxe avec une directive structurelle. Fonctionnellement similaire, mais `@for` force le `track` (obligatoire pour la perf) et a une syntaxe `@else`/`@empty` propre.

```html
@for (item of liste; track item.id) {
  <li>{{ item.nom }}</li>
} @empty {
  <li>Liste vide</li>
}
```

---

## C5. « C'est quoi l'injection de dépendance ? »

**🟢 Réponse courte** :
> C'est un pattern où une classe REÇOIT ses dépendances au lieu de les CRÉER elle-même. Angular gère ça : on déclare un service avec `@Injectable({ providedIn: 'root' })`, et n'importe quel composant peut le récupérer via `inject(MonService)`. Avantages : singleton automatique, testabilité (on peut mocker), pas de couplage en dur.

🍕 Analogie : tu commandes un café au lieu de planter un caféier toi-même.

---

## C6. « Pourquoi `input.required` plutôt que `input` ? »

**🟢 Réponse courte** :
> `input.required<T>()` force le parent à fournir la valeur — erreur de compilation TypeScript sinon. `input<T>()` accepte que ce soit undefined. Si la donnée est obligatoire pour le composant, on utilise `.required` pour la sécurité.

📂 **À pointer** : `membre-row.component.ts:40`.

---

## C7. « Comment l'enfant communique avec le parent ? »

**🟢 Réponse courte** :
> Via un `output<T>()`. L'enfant déclare `supprime = output<number>()` et appelle `this.supprime.emit(42)`. Le parent écoute dans son template : `<app-enfant (supprime)="handler($event)" />`. `$event` est la valeur émise.

📂 **À pointer** : `membre-row.component.ts:43`.

---

## C8. « Comment fonctionne le lazy loading des routes ? »

**🟢 Réponse courte** :
> Au lieu d'importer le composant en haut du fichier `app.routes.ts`, on utilise `loadComponent: () => import('./.../foo.component').then(m => m.FooComponent)`. Le bundle JS du composant n'est téléchargé QU'AU MOMENT où l'utilisateur visite la route. Avantage : bundle initial plus léger.

📂 **À pointer** : `src/renderer/app/app.routes.ts:17-22`.

---

## C9. « C'est quoi un effect ? Quand l'utiliser ? »

**🟢 Réponse courte** :
> `effect(() => ...)` exécute du code quand un signal qu'il lit change. C'est pour les SIDE-EFFECTS (log, appel API, manip DOM). Pas pour calculer des valeurs (utiliser computed). Chez moi : log du changement de filtre dans MembresListComponent.

📂 **À pointer** : `membres-list.component.ts:105`.

---

## C10. « Pourquoi tu utilises `inject()` plutôt que le constructor ? »

**🟢 Réponse courte** :
> `inject()` est l'API moderne (Angular 14+). Plus court, et fonctionne en dehors du constructor (dans des factories, intercepteurs, guards). Le constructor traditionnel `constructor(private x: MonService)` fonctionne toujours mais est plus verbeux.

📂 **À pointer** : `membres-list.component.ts:77`.

---

---

# CATÉGORIE D — Flux & IPC (5 questions)

## D1. « Comment Angular communique avec la base de données ? »

**🟢 Réponse courte** :
> Angular ne parle PAS directement à la DB. Le flux est : Composant → Service → `window.api.xxx()` (exposé par le preload via contextBridge) → `ipcRenderer.invoke('canal', data)` → côté main : `ipcMain.handle('canal', ...)` → Prisma → SQLite. La réponse remonte par le même chemin sous forme `{ success, data | error }`.

---

## D2. « Pourquoi le try/catch dans les handlers IPC est-il obligatoire ? »

**🟢 Réponse courte** :
> Pour intercepter les erreurs Prisma (FK violation, contrainte UNIQUE, etc.) et les convertir en réponse propre `{ success: false, error: "message" }`. Sans ça, la Promise rejetée remonterait au renderer et planterait potentiellement l'UI. C'est aussi une exigence explicite de la section 2.3 du PDF.

📂 **À pointer** : `src/main/ipc-handlers.ts` (32 handlers, 32 try/catch).

---

## D3. « Différence entre `ipcRenderer.invoke` et `ipcRenderer.send` ? »

**🟢 Réponse courte** :
> `invoke` est asynchrone et renvoie une Promise avec la valeur de retour du handler. `send` est tire-et-oublie : pour répondre, il faut renvoyer un autre message via `event.reply`. `invoke` est l'API moderne, plus propre.

---

## D4. « Comment tu garantis qu'aucun fichier ne contient du `any` ? »

**🟢 Réponse courte** :
> J'active `"strict": true` dans tous mes tsconfigs. J'ai aussi vérifié manuellement avec `grep -nE ":\s*any\b|<any>|as any" src/` : zéro résultat. Les payloads venant du renderer sont typés `unknown` (pas `any`) — ce qui force une validation explicite avant utilisation.

📂 **À pointer** : `tsconfig.json:4`, `tsconfig.main.json:3`, `tsconfig.preload.json:3`.

---

## D5. « Si je débranche internet, ton app fonctionne ? »

**🟢 Réponse courte** :
> Oui, 100 %. SQLite est local (fichier `prisma/dev.db`), Prisma tourne en local dans le main, Angular est buildé localement. Aucune dépendance cloud. C'est exigé par la section 2.3 du PDF.

📂 **À pointer** : `prisma/schema.prisma:20-21` (`provider = "sqlite"`).

---

---

# 🎯 TOP 10 questions les plus probables (à connaître par cœur)

1. ⭐ « Raconte-moi ce qui se passe quand tu cliques sur Ajouter. »
2. ⭐ « Pourquoi Cascade ici et Restrict là ? »
3. ⭐ « Pourquoi une table de jonction explicite ? »
4. ⭐ « **C'est quoi une transaction et où en as-tu utilisé une ?** » (B11)
5. ⭐ « Donne-moi le SQL équivalent de cette ligne Prisma. »
6. ⭐ « Différence entre signal et computed ? »
7. ⭐ « Rôle du preload et de contextBridge ? »
8. ⭐ « Pourquoi `providedIn: 'root'` ? »
9. ⭐ « Différence include / select ? »
10. ⭐ « Comment tu communiques entre l'UI et la DB ? »

---

## Mantra final

> Si tu connais ces 30 questions, **tu maîtrises 95 % de ce que ton prof peut te demander**. Le reste, ce sera du « montre-moi cette ligne » — et tu sauras où la trouver grâce aux références fichier:ligne dans ce document.

Bonne chance ! 💪
