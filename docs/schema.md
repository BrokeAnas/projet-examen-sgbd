# Schéma de la base de données


```mermaid
erDiagram
    MEMBRE ||--o{ ABONNEMENT : "souscrit (1:N, Cascade)"
    MEMBRE ||--o{ INSCRIPTION : "s'inscrit (1:N, Cascade)"
    SEANCE ||--o{ INSCRIPTION : "reçoit (1:N, Cascade)"
    COURS  ||--o{ SEANCE      : "planifie (1:N, Cascade)"
    COACH  ||--o{ COURS       : "anime (1:N, Restrict)"
    SALLE  ||--o{ SEANCE      : "accueille (1:N, Restrict)"

    MEMBRE {
        int       id PK
        string    nom
        string    prenom
        string    email UK
        datetime  dateInscription
        enum      statut "ACTIF|SUSPENDU|RESILIE"
    }
    COACH {
        int       id PK
        string    nom
        string    prenom
        string    specialite
        datetime  dateEmbauche
        float     salaire
    }
    COURS {
        int       id PK
        string    titre
        string    description "nullable"
        int       dureeMinutes
        int       capaciteMax
        int       coachId FK
    }
    SALLE {
        int       id PK
        string    nom
        int       capacite
        string    equipements "nullable"
    }
    SEANCE {
        int       id PK
        datetime  dateHeure
        int       coursId FK
        int       salleId FK
    }
    INSCRIPTION {
        int       membreId PK,FK
        int       seanceId PK,FK
        datetime  dateInscription
        bool      presence
    }
    ABONNEMENT {
        int       id PK
        enum      type "MENSUEL|TRIMESTRIEL|ANNUEL"
        float     prix
        datetime  dateDebut
        datetime  dateFin
        int       membreId FK
    }
```

## Relations détaillées

| De     | Vers        | Cardinalité | onDelete  | Justification                                              |
| ------ | ----------- | ----------- | --------- | ---------------------------------------------------------- |
| Coach  | Cours       | 1:N         | Restrict  | On refuse de supprimer un coach avec cours actifs          |
| Cours  | Seance      | 1:N         | Cascade   | Sans le cours, les séances n'ont plus de sens              |
| Salle  | Seance      | 1:N         | Restrict  | On ne supprime pas une salle utilisée                      |
| Membre | Abonnement  | 1:N         | Cascade   | RGPD : effacer un membre = effacer son historique          |
| Membre | Inscription | 1:N         | Cascade   | Idem                                                       |
| Seance | Inscription | 1:N         | Cascade   | Si la séance est annulée, plus d'inscriptions associées    |
| Membre | Seance      | N:M         | via Inscription | Table explicite pour stocker dateInscription + presence |
