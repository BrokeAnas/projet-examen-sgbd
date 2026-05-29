# 📖 Cours 01 — La base de données

> 🎯 **Objectif** : à la fin, tu dois savoir expliquer chaque modèle Prisma, chaque relation, chaque `onDelete`, et pouvoir donner l'équivalent SQL.

---

## 1. Vue d'ensemble : ta base contient 7 tables

🍕 **Analogie** : imagine ta base comme un **classeur de fiches** dans le bureau du gérant de la salle de sport. Chaque table est une **rubrique du classeur**.

| Table | Métier | Nombre de lignes après seed |
|---|---|---|
| **Membre** | les clients inscrits | 10 |
| **Coach** | les profs/entraîneurs | 3 |
| **Cours** | les types d'activités (Yoga, CrossFit…) | 5 |
| **Salle** | les pièces physiques | 3 |
| **Seance** | une instance datée d'un cours dans une salle | 8 |
| **Inscription** | qui s'est inscrit à quelle séance + sa présence | 15 |
| **Abonnement** | les périodes payées par les membres | 10 |

🗣️ **Phrase à dire** : *« Ma base contient 7 modèles : Membre, Coach, Cours, Salle, Seance, Inscription et Abonnement. Inscription est une table de jonction explicite entre Membre et Seance. »*

---

## 2. Concepts SQL qu'il faut maîtriser AVANT

### 📖 Clé primaire (PK)

C'est **l'identifiant unique d'une ligne**. Pas deux lignes avec la même PK.

🍕 **Analogie** : c'est ton **numéro de carte d'identité**. Personne d'autre que toi ne l'a.

💻 Chez nous : `id Int @id @default(autoincrement())`
- `Int` = nombre entier
- `@id` = c'est la PK
- `@default(autoincrement())` = la DB choisit toute seule (1, 2, 3, 4…)

SQL équivalent : `id INTEGER PRIMARY KEY AUTOINCREMENT`

### 📖 Clé étrangère (FK)

C'est **un pointeur vers une autre table**. Une colonne qui contient l'id d'une ligne d'une autre table.

🍕 **Analogie** : c'est **une plaque d'immatriculation** sur ta voiture. Cette plaque pointe vers un véhicule précis dans le fichier de l'État.

💻 Chez nous : `coachId Int` dans la table Cours pointe vers `Coach.id`.

SQL équivalent : `FOREIGN KEY (coachId) REFERENCES Coach(id)`

### 📖 Relation 1:N (un-à-plusieurs)

Une ligne du parent peut être référencée par PLUSIEURS lignes de l'enfant.

🍕 **Analogie** : **une mère poule, plusieurs poussins**. Chaque poussin a UNE mère, mais une mère peut avoir N poussins.

💻 Chez nous : un Coach peut donner plusieurs Cours, mais un Cours appartient à UN seul Coach.

```prisma
model Coach {
  cours Cours[]   // côté MÈRE : peut avoir plusieurs cours
}
model Cours {
  coachId Int                                                       // FK
  coach   Coach @relation(fields: [coachId], references: [id], ...) // côté POUSSIN
}
```

### 📖 Relation N:M (plusieurs-à-plusieurs)

Plusieurs lignes d'une table peuvent être liées à plusieurs lignes d'une autre.

🍕 **Analogie** : **étudiants ↔ cours**. Un étudiant suit plusieurs cours, et un cours est suivi par plusieurs étudiants.

Pour faire ça en SQL, on a besoin d'une **table de jonction** au milieu.

💻 Chez nous : Membre ↔ Seance via la table `Inscription`.

### 📖 onDelete : que se passe-t-il quand on supprime le parent ?

| Comportement | Effet |
|---|---|
| **Cascade** | Les enfants sont supprimés EN AUTOMATIQUE avec le parent |
| **Restrict** | La suppression du parent est REFUSÉE tant qu'il a des enfants |
| **SetNull** | Les enfants gardent leur ligne mais leur FK passe à NULL (pas utilisé chez nous) |

🍕 **Analogie** :
- **Cascade** = quand tu fermes ton compte Netflix, ton historique de visionnage part avec.
- **Restrict** = quand tu veux quitter une équipe au travail, on te dit « non, finis d'abord tes projets en cours ».

### 📖 Champ optionnel (nullable)

Un champ qui peut être vide. En Prisma, on met `?` après le type.

💻 Chez nous : `description String?` et `equipements String?`.

SQL équivalent : la colonne n'a PAS la contrainte `NOT NULL`.

### 📖 Enum

Liste limitée et fermée de valeurs autorisées.

🍕 **Analogie** : la case « civilité » sur un formulaire administratif : **M.** / **Mme** / **Autre**. Tu ne peux pas écrire « licorne ».

💻 Chez nous : `StatutMembre` (ACTIF / SUSPENDU / RESILIE) et `TypeAbonnement` (MENSUEL / TRIMESTRIEL / ANNUEL).

🚨 SQLite ne supporte pas nativement les enums. Prisma les stocke sous forme de TEXT et fait la validation côté client.

---

## 3. MODÈLE PAR MODÈLE — Détaillé

### 🟦 Modèle Membre

📖 **À quoi sert cette table ?** Stocker les clients inscrits à la salle de sport.

📂 Fichier : `prisma/schema.prisma` lignes 59-72.

```prisma
model Membre {
  id              Int           @id @default(autoincrement())
  nom             String
  prenom          String
  email           String        @unique
  dateInscription DateTime      @default(now())
  statut          StatutMembre  @default(ACTIF)

  abonnements     Abonnement[]
  inscriptions    Inscription[]
}
```

| Champ | Type | Obligatoire ? | Pourquoi |
|---|---|---|---|
| `id` | Int | Auto-généré | Identifiant unique du membre |
| `nom` | String | Oui | Nom de famille |
| `prenom` | String | Oui | Prénom |
| `email` | String | Oui (**UNIQUE**) | Pas deux membres avec le même email |
| `dateInscription` | DateTime | Auto (`now()`) | Date à laquelle on a créé la fiche |
| `statut` | Enum | Auto (`ACTIF`) | État courant (ACTIF / SUSPENDU / RESILIE) |
| `abonnements` | Abonnement[] | (virtuel) | Liste des abonnements liés (relation 1:N) |
| `inscriptions` | Inscription[] | (virtuel) | Inscriptions aux séances (côté N:M) |

🚨 **Important** : `abonnements` et `inscriptions` ne sont PAS des colonnes de la table en base. Ce sont des **accesseurs virtuels** qui permettent à Prisma de récupérer les enfants quand on fait `include`.

**SQL équivalent** :
```sql
CREATE TABLE Membre (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nom             TEXT NOT NULL,
  prenom          TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  dateInscription DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut          TEXT NOT NULL DEFAULT 'ACTIF'
);
```

🗣️ **Phrase à dire** : *« Membre stocke les clients. L'email est unique pour éviter les doublons. Le champ statut est un enum qui peut prendre 3 valeurs. Un membre a plusieurs abonnements (1:N) et plusieurs inscriptions (côté N:M). »*

---

### 🟩 Modèle Coach

📖 **À quoi sert cette table ?** Stocker les coachs/entraîneurs salariés.

📂 Fichier : `schema.prisma` lignes 77-88.

```prisma
model Coach {
  id           Int      @id @default(autoincrement())
  nom          String
  prenom       String
  specialite   String
  dateEmbauche DateTime @default(now())
  salaire      Float

  cours        Cours[]
}
```

| Champ | Type | Obligatoire ? | Pourquoi |
|---|---|---|---|
| `id` | Int | Auto | PK |
| `nom` / `prenom` | String | Oui | Identité |
| `specialite` | String | Oui | « Yoga », « CrossFit »… |
| `dateEmbauche` | DateTime | Auto | Quand on l'a embauché |
| `salaire` | Float | Oui | En euros |
| `cours` | Cours[] | (virtuel) | Cours qu'il anime (1:N) |

**SQL équivalent** :
```sql
CREATE TABLE Coach (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nom          TEXT NOT NULL,
  prenom       TEXT NOT NULL,
  specialite   TEXT NOT NULL,
  dateEmbauche DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  salaire      REAL NOT NULL
);
```

🗣️ **Phrase à dire** : *« Coach représente un entraîneur salarié. Il anime plusieurs cours, c'est une relation 1:N. »*

---

### 🟨 Modèle Cours

📖 **À quoi sert cette table ?** Stocker les types d'activités proposés (pas datés). Exemple : « Yoga débutant », « CrossFit WOD ».

📂 Fichier : `schema.prisma` lignes 93-111.

```prisma
model Cours {
  id            Int      @id @default(autoincrement())
  titre         String
  description   String?
  dureeMinutes  Int
  capaciteMax   Int

  coachId       Int
  coach         Coach    @relation(fields: [coachId], references: [id], onDelete: Restrict)

  seances       Seance[]
}
```

| Champ | Type | Obligatoire ? | Pourquoi |
|---|---|---|---|
| `id` | Int | Auto | PK |
| `titre` | String | Oui | Nom du cours |
| `description` | String **?** | **NON** (nullable) | Description optionnelle |
| `dureeMinutes` | Int | Oui | Durée en minutes |
| `capaciteMax` | Int | Oui | Nombre max de membres par séance |
| `coachId` | Int | Oui (**FK**) | Pointe vers le Coach qui anime |
| `coach` | Coach | (virtuel) | Pour récupérer l'objet Coach avec `include` |
| `seances` | Seance[] | (virtuel) | Séances planifiées de ce cours (1:N) |

🚨 **Le `?` après `String`** rend ce champ NULLABLE en base : la colonne peut contenir NULL si pas de description.

🚨 **`onDelete: Restrict`** sur le coach : on REFUSE de supprimer un coach qui a encore des cours. Si on essaie, Prisma lève une erreur.

**SQL équivalent** :
```sql
CREATE TABLE Cours (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  titre         TEXT NOT NULL,
  description   TEXT,                          -- nullable (pas de NOT NULL)
  dureeMinutes  INTEGER NOT NULL,
  capaciteMax   INTEGER NOT NULL,
  coachId       INTEGER NOT NULL,
  FOREIGN KEY (coachId) REFERENCES Coach(id) ON DELETE RESTRICT
);
```

🗣️ **Phrase à dire** : *« Cours définit un type d'activité avec son coach. La FK `coachId` pointe vers Coach, avec un `onDelete: Restrict` parce qu'on ne veut pas supprimer un coach qui anime encore des cours. »*

---

### 🟪 Modèle Salle

📖 **À quoi sert cette table ?** Stocker les lieux physiques où se déroulent les séances.

📂 Fichier : `schema.prisma` lignes 116-124.

```prisma
model Salle {
  id          Int      @id @default(autoincrement())
  nom         String
  capacite    Int
  equipements String?

  seances     Seance[]
}
```

| Champ | Type | Obligatoire ? | Pourquoi |
|---|---|---|---|
| `id` | Int | Auto | PK |
| `nom` | String | Oui | « Salle Zen », « Salle Iron »… |
| `capacite` | Int | Oui | Nombre max de personnes |
| `equipements` | String **?** | **NON** | Liste libre des équipements |
| `seances` | Seance[] | (virtuel) | Séances qui s'y déroulent |

**SQL équivalent** :
```sql
CREATE TABLE Salle (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT NOT NULL,
  capacite    INTEGER NOT NULL,
  equipements TEXT
);
```

🗣️ **Phrase à dire** : *« Salle est un lieu physique. C'est une table simple sans FK sortante mais référencée par Seance. »*

---

### 🟧 Modèle Seance

📖 **À quoi sert cette table ?** Une **instance datée** d'un cours dans une salle. Exemple : « Yoga débutant le 19/05/2026 à 18h en Salle Zen ».

📂 Fichier : `schema.prisma` lignes 130-150.

```prisma
model Seance {
  id        Int      @id @default(autoincrement())
  dateHeure DateTime

  coursId   Int
  cours     Cours    @relation(fields: [coursId], references: [id], onDelete: Cascade)

  salleId   Int
  salle     Salle    @relation(fields: [salleId], references: [id], onDelete: Restrict)

  inscriptions Inscription[]
}
```

| Champ | Type | Obligatoire ? | Pourquoi |
|---|---|---|---|
| `id` | Int | Auto | PK |
| `dateHeure` | DateTime | Oui | Date + heure de la séance |
| `coursId` | Int | Oui (**FK** → Cours) | De quel cours s'agit-il |
| `salleId` | Int | Oui (**FK** → Salle) | Où ça se passe |
| `inscriptions` | Inscription[] | (virtuel) | Les inscrits (1:N avec Inscription, qui est la N:M avec Membre) |

🚨 **Deux choix `onDelete` opposés ici** :
- `coursId` → **Cascade** : si on supprime le cours, ses séances n'ont plus de sens, elles partent avec.
- `salleId` → **Restrict** : on ne supprime pas une salle qui a encore des séances planifiées.

**SQL équivalent** :
```sql
CREATE TABLE Seance (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  dateHeure DATETIME NOT NULL,
  coursId   INTEGER NOT NULL,
  salleId   INTEGER NOT NULL,
  FOREIGN KEY (coursId) REFERENCES Cours(id) ON DELETE CASCADE,
  FOREIGN KEY (salleId) REFERENCES Salle(id) ON DELETE RESTRICT
);
```

🗣️ **Phrase à dire** : *« Seance est une instance datée d'un Cours dans une Salle. Cascade côté Cours parce qu'une séance n'existe pas sans son cours parent. Restrict côté Salle parce qu'on ne supprime pas une salle utilisée. »*

---

### 🔴 Modèle Inscription (la N:M EXPLICITE)

📖 **À quoi sert cette table ?** C'est la **table de jonction** entre Membre et Seance. Elle dit « qui est inscrit à quelle séance », avec en plus la date d'inscription et si la personne s'est présentée.

📂 Fichier : `schema.prisma` lignes 167-184.

```prisma
model Inscription {
  membreId        Int
  membre          Membre   @relation(fields: [membreId], references: [id], onDelete: Cascade)

  seanceId        Int
  seance          Seance   @relation(fields: [seanceId], references: [id], onDelete: Cascade)

  dateInscription DateTime @default(now())
  presence        Boolean  @default(false)

  @@id([membreId, seanceId])
}
```

| Champ | Type | Obligatoire ? | Pourquoi |
|---|---|---|---|
| `membreId` | Int | **PK + FK** vers Membre | Quel membre |
| `seanceId` | Int | **PK + FK** vers Seance | Quelle séance |
| `dateInscription` | DateTime | Auto | Quand il s'est inscrit |
| `presence` | Boolean | Défaut `false` | Est-il venu (true) ou non (false) |

🚨 **`@@id([membreId, seanceId])`** : c'est la **clé primaire COMPOSITE**. Pas un id auto-incrémenté, mais la combinaison (membreId + seanceId) qui doit être unique. Donc un membre ne peut s'inscrire QU'UNE FOIS à une séance donnée.

🍕 **Analogie** : c'est comme une carte d'embarquement avion. La PK n'est pas un numéro de carte, c'est le couple (vol + passager). On ne peut pas avoir 2 cartes pour la même personne sur le même vol.

🚨 **Pourquoi EXPLICITE et pas implicite ?**

Si on avait écrit ça (implicite) :
```prisma
model Membre { seances Seance[] }
model Seance { membres Membre[] }
```
Prisma aurait créé une table cachée `_MembreToSeance` avec UNIQUEMENT les 2 FK. **Impossible d'y ajouter `dateInscription` et `presence`**.

En faisant explicite, on garde le contrôle et on peut ajouter ce qu'on veut sur la relation.

**SQL équivalent** :
```sql
CREATE TABLE Inscription (
  membreId        INTEGER NOT NULL,
  seanceId        INTEGER NOT NULL,
  dateInscription DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  presence        INTEGER NOT NULL DEFAULT 0,    -- SQLite stocke les bool en INTEGER (0/1)
  PRIMARY KEY (membreId, seanceId),
  FOREIGN KEY (membreId) REFERENCES Membre(id) ON DELETE CASCADE,
  FOREIGN KEY (seanceId) REFERENCES Seance(id) ON DELETE CASCADE
);
```

🗣️ **Phrase à dire** : *« Inscription est ma table de jonction N:M explicite entre Membre et Seance. Elle est explicite parce que je veux stocker dateInscription et presence sur la relation elle-même. La clé primaire est composite : `@@id([membreId, seanceId])`, ce qui garantit qu'un membre ne s'inscrit qu'une seule fois à une séance. »*

---

### 🟫 Modèle Abonnement

📖 **À quoi sert cette table ?** Stocker l'historique des abonnements payés par chaque membre.

📂 Fichier : `schema.prisma` lignes 189-194.

```prisma
model Abonnement {
  id        Int            @id @default(autoincrement())
  type      TypeAbonnement
  prix      Float
  dateDebut DateTime
  dateFin   DateTime

  membreId  Int
  membre    Membre         @relation(fields: [membreId], references: [id], onDelete: Cascade)
}
```

| Champ | Type | Obligatoire ? | Pourquoi |
|---|---|---|---|
| `id` | Int | Auto | PK |
| `type` | Enum | Oui | MENSUEL / TRIMESTRIEL / ANNUEL |
| `prix` | Float | Oui | Prix payé |
| `dateDebut` / `dateFin` | DateTime | Oui | Période de validité |
| `membreId` | Int | Oui (**FK**) | À qui il appartient |

🚨 **`onDelete: Cascade`** : si on supprime le membre (droit à l'effacement RGPD), tout son historique d'abonnements part avec.

**SQL équivalent** :
```sql
CREATE TABLE Abonnement (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  type      TEXT NOT NULL,         -- 'MENSUEL', 'TRIMESTRIEL', 'ANNUEL'
  prix      REAL NOT NULL,
  dateDebut DATETIME NOT NULL,
  dateFin   DATETIME NOT NULL,
  membreId  INTEGER NOT NULL,
  FOREIGN KEY (membreId) REFERENCES Membre(id) ON DELETE CASCADE
);
```

🗣️ **Phrase à dire** : *« Abonnement est l'historique des périodes payées. Cascade côté Membre parce que si on efface un membre, on doit effacer son historique (RGPD). »*

---

## 4. Vue d'ensemble des RELATIONS

📐 Schéma simplifié :

```
   Coach
     │
     │ 1:N (Restrict)        Salle
     ▼                         │
   Cours                       │ 1:N (Restrict)
     │                         ▼
     │ 1:N (Cascade)        Seance
     ▼                         │
   Seance ───────┐             │
                 │ 1:N         │
                 ▼             │
              Inscription      │
                 ▲             │
                 │ 1:N         │
   Membre ──────┘              │
     │ N:M (via Inscription) ──┘
     │
     │ 1:N (Cascade)
     ▼
   Abonnement
```

**Récap des relations** :

| De | Vers | Cardinalité | onDelete | Pourquoi |
|---|---|---|---|---|
| Coach | Cours | 1:N | Restrict | Ne pas perdre la référence pédagogique |
| Cours | Seance | 1:N | Cascade | Séance sans cours = orpheline |
| Salle | Seance | 1:N | Restrict | Ne pas supprimer une salle utilisée |
| Membre | Abonnement | 1:N | Cascade | RGPD |
| Membre | Inscription | 1:N | Cascade | Ses inscriptions doivent disparaître avec lui |
| Seance | Inscription | 1:N | Cascade | Si la séance est annulée, plus d'inscrits |
| Membre | Seance | **N:M** via Inscription | — | Avec champs supplémentaires (date, présence) |

---

## 4 bis. LES TRANSACTIONS PRISMA ⭐ (notion vue en cours)

### 📖 C'est quoi une transaction ?

Une **transaction** est un groupe d'opérations DB qui doivent TOUTES réussir ou TOUTES échouer ensemble.

### 🎯 À quoi ça sert ?

À garantir la **cohérence** des données quand on doit faire plusieurs écritures liées. Sans transaction, si une partie réussit et une autre échoue, on se retrouve avec des données incohérentes en base.

### 🍕 Analogie : le virement bancaire

Tu fais un virement de 100 € du compte A vers le compte B. Il y a DEUX opérations :
1. Débiter 100 € sur A
2. Créditer 100 € sur B

Si la machine plante ENTRE les deux, sans transaction :
- A est débité de 100 €
- B n'a rien reçu
- ❌ 100 € se sont VOLATILISÉS

Avec transaction (`BEGIN ... COMMIT`) : soit les deux opérations sont appliquées, soit aucune. Si plantage entre les deux, `ROLLBACK` automatique → l'argent reste sur A. **Cohérence préservée.**

### 💻 Dans MON code

📂 **Fichier** : `src/main/ipc-handlers.ts` lignes 569-636 (handler `abonnements:souscrireEtActiver`).

**Scénario métier** : quand un membre paye un nouvel abonnement, on veut :
1. Créer la ligne dans `Abonnement` (INSERT)
2. Passer le statut du membre à `ACTIF` (UPDATE) — au cas où il était SUSPENDU/RESILIE

Si l'INSERT réussit mais l'UPDATE plante (membre supprimé entre temps, erreur disque…), sans transaction on aurait :
- Un abonnement enregistré (paiement encaissé)
- Un membre toujours SUSPENDU (= ne peut pas accéder aux séances)
- ❌ Le client a payé mais ne peut pas utiliser le service

```ts
const resultat = await prisma.$transaction(async (tx) => {
  // 1) Créer l'abonnement
  const abonnement = await tx.abonnement.create({
    data: { type, prix, dateDebut, dateFin, membreId },
  });

  // 2) Activer le membre
  const membre = await tx.membre.update({
    where: { id: membreId },
    data: { statut: 'ACTIF' },
  });

  return { abonnement, membre };
});
```

🚨 **Points clés** :
- On utilise **`tx`** au lieu de `prisma` à l'intérieur du callback. C'est un `PrismaClient` lié à la transaction.
- Si le callback **throw**, Prisma fait `ROLLBACK` automatique.
- Si le callback **return**, Prisma fait `COMMIT` et la valeur retournée devient le résultat de `$transaction`.

### 🗣️ Comment l'expliquer à l'oral

> *« J'utilise prisma.$transaction dans le handler `abonnements:souscrireEtActiver`. Le but est de réunir deux écritures qui doivent réussir ensemble : créer l'abonnement et passer le membre à ACTIF. Si une seule des deux échoue, Prisma fait ROLLBACK et la base reste cohérente. C'est l'atomicité du modèle ACID. La syntaxe interactive avec callback est plus puissante que le format array parce que je peux faire des conditions, des lectures intermédiaires, et returner une valeur. »*

### 📖 C'est quoi ACID ?

| Lettre | Signification | Une ligne |
|---|---|---|
| **A**tomicité | Tout ou rien | Soit toutes les ops réussissent, soit aucune n'est appliquée |
| **C**ohérence | Intégrité | La base passe d'un état valide à un autre état valide (FK, contraintes respectées) |
| **I**solation | Indépendance | Plusieurs transactions concurrentes ne s'interfèrent pas |
| **D**urabilité | Persistance | Une fois COMMIT, c'est gravé sur disque, même en cas de crash |

### 🔄 Équivalent SQL exact

Sous le capot, Prisma exécute approximativement :

```sql
BEGIN TRANSACTION;
  INSERT INTO Abonnement (type, prix, dateDebut, dateFin, membreId)
       VALUES (?, ?, ?, ?, ?);
  UPDATE Membre SET statut = 'ACTIF' WHERE id = ?;
COMMIT;
-- En cas d'erreur entre les deux :
-- ROLLBACK;  (l'INSERT est annulé)
```

### ❓ 3 questions piège possibles + réponses

**Q1 : « Différence entre la syntaxe array et la syntaxe callback de $transaction ? »**
> La syntaxe array (`prisma.$transaction([prisma.x.create(...), prisma.y.update(...)])`) exécute une liste figée d'opérations indépendantes. La syntaxe callback (`prisma.$transaction(async (tx) => { ... })`) permet d'écrire de la logique entre les opérations : lectures, conditions, transformations. J'ai choisi la callback parce que je peux faire dépendre la 2e opération du résultat de la 1re, et c'est plus pédagogique à expliquer.

**Q2 : « Que se passerait-il si tu enlevais le $transaction ? »**
> Je ferais deux appels Prisma séparés. Si le `create` réussit mais l'`update` plante (panne réseau, contrainte violée, membre supprimé entre les deux appels), la base se retrouverait avec un abonnement créé MAIS un membre toujours SUSPENDU. Donnée incohérente, paiement encaissé sans bénéfice pour le client. Le `$transaction` garantit qu'aucune des deux n'est appliquée si l'autre échoue.

**Q3 : « Quel est le niveau d'isolation utilisé ? »**
> Par défaut, Prisma sur SQLite utilise le niveau d'isolation `Serializable` (le plus strict). Ça veut dire que les transactions concurrentes s'exécutent comme si elles étaient séquentielles. SQLite verrouille la base pendant une transaction en écriture, ce qui rend `Serializable` naturel. Pour les bases multi-utilisateurs (Postgres, MySQL), on peut paramétrer `isolationLevel` dans les options de `$transaction`.

---

## 5. 🎯 LES 10 QUESTIONS PROBABLES DU PROF + RÉPONSES TYPES

### Q1. « C'est quoi une relation 1:N ? »
> 1:N veut dire « un-à-plusieurs ». Une ligne du parent peut être liée à plusieurs lignes de l'enfant, mais chaque enfant n'a qu'un seul parent. Exemple : un Coach peut avoir plusieurs Cours, mais un Cours a un seul Coach.

### Q2. « C'est quoi une relation N:M ? »
> N:M veut dire « plusieurs-à-plusieurs ». Plusieurs lignes des deux côtés peuvent être liées entre elles. En SQL, ça se fait avec une table de jonction au milieu. Chez moi, Membre↔Seance via la table Inscription.

### Q3. « Pourquoi ta table de jonction Inscription est EXPLICITE ? »
> Parce que je veux stocker des champs en PLUS sur la relation : `dateInscription` (quand le membre s'est inscrit) et `presence` (true/false s'il est venu). Avec une relation N:M implicite, Prisma crée une table cachée avec UNIQUEMENT les deux FK — impossible d'y ajouter des colonnes. Explicite = je garde le contrôle.

### Q4. « Différence entre Cascade et Restrict ? »
> Cascade = quand on supprime le parent, les enfants partent automatiquement. Restrict = la suppression du parent est REFUSÉE tant qu'il a des enfants. J'utilise Cascade quand les enfants n'ont aucun sens sans le parent (Inscription, Abonnement) et Restrict quand je veux protéger l'intégrité métier (un Coach avec cours actifs, une Salle utilisée).

### Q5. « Que se passe-t-il si je supprime un Coach qui a 3 Cours ? »
> Ça va PLANTER. Mon `onDelete: Restrict` sur la FK `coachId` de Cours fait que Prisma lève une erreur `Foreign key constraint failed`. C'est voulu : l'admin doit d'abord réassigner ou supprimer les cours du coach.

### Q6. « Et si je supprime un Membre qui a 5 inscriptions et 2 abonnements ? »
> Tout part en cascade. Les 5 inscriptions et 2 abonnements sont supprimés automatiquement par SQLite, grâce à `onDelete: Cascade` sur les FK `membreId` côté Inscription et Abonnement.

### Q7. « C'est quoi `@@id([membreId, seanceId])` ? »
> C'est une clé primaire COMPOSITE — la PK est la combinaison des deux colonnes. Ça garantit qu'un même couple (membre, séance) ne peut exister qu'une fois. Donc un membre ne peut pas s'inscrire deux fois à la même séance.

### Q8. « Donne-moi l'équivalent SQL de ta ligne `coach Coach @relation(fields: [coachId], references: [id], onDelete: Restrict)` »
> ```sql
> FOREIGN KEY (coachId) REFERENCES Coach(id) ON DELETE RESTRICT
> ```

### Q9. « Pourquoi avoir mis `description String?` au lieu de `description String` ? »
> Le `?` rend le champ nullable : la description est optionnelle pour un cours. SQL équivalent : pas de `NOT NULL` sur la colonne. Côté TypeScript, Prisma génère le type `string | null`, ce qui force à gérer le cas null — sécurité du typage strict.

### Q10. « Pourquoi des enums (StatutMembre, TypeAbonnement) ? »
> Pour limiter les valeurs possibles à une liste fermée et éviter les fautes de frappe. Côté TypeScript, l'enum donne de l'auto-complétion et de la sécurité de type. Côté SQLite, ça se traduit par un champ TEXT contrôlé par Prisma (SQLite n'a pas d'enum natif).

---

## 6. Mini-quiz

1. Cite les 7 modèles.
2. Donne 2 relations 1:N avec leur `onDelete` et justifie.
3. Pourquoi Inscription est-elle explicite ?
4. Qu'est-ce qu'une PK composite et chez qui je l'ai mise ?
5. Donne l'équivalent SQL exact de la ligne `email String @unique`.

> Réponse 5 : `email TEXT NOT NULL UNIQUE` (et la contrainte UNIQUE crée un index implicite).

Si tu réponds à tout ça les yeux fermés, passe au **cours 02** sur le main process. 🎉
