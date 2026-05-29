/**
 * Type de l'objet `window.api` exposé par le preload.
 *
 * Doit rester SYNCHRONISÉ avec ce qui est exposé dans `src/preload/preload.ts`.
 * C'est la "frontière" de notre app : tout ce qui passe par IPC est typé ici.
 */

import type {
  Membre,
  MembreDetail,
  Coach,
  Cours,
  Salle,
  Seance,
  Inscription,
  Abonnement,
  Statistiques,
  StatutMembre,
  TypeAbonnement,
  IpcResponse,
} from './domain.types';

export interface CreerOuModifierMembrePayload {
  nom: string;
  prenom: string;
  email: string;
  statut: StatutMembre;
}

export interface CreerOuModifierCoachPayload {
  nom: string;
  prenom: string;
  specialite: string;
  salaire: number;
}

export interface CreerOuModifierCoursPayload {
  titre: string;
  description: string | null;
  dureeMinutes: number;
  capaciteMax: number;
  coachId: number;
}

export interface CreerOuModifierSallePayload {
  nom: string;
  capacite: number;
  equipements: string | null;
}

export interface CreerOuModifierSeancePayload {
  dateHeure: string;
  coursId: number;
  salleId: number;
}

export interface InscrirePayload {
  membreId: number;
  seanceId: number;
}

export interface CreerOuModifierAbonnementPayload {
  type: TypeAbonnement;
  prix: number;
  dateDebut: string;
  dateFin: string;
  membreId: number;
}

export interface GymApi {
  membres: {
    listerTous: () => Promise<IpcResponse<Membre[]>>;
    obtenirParId: (id: number) => Promise<IpcResponse<MembreDetail>>;
    creer: (payload: CreerOuModifierMembrePayload) => Promise<IpcResponse<Membre>>;
    modifier: (id: number, payload: CreerOuModifierMembrePayload) => Promise<IpcResponse<Membre>>;
    supprimer: (id: number) => Promise<IpcResponse<{ id: number }>>;
  };
  coachs: {
    listerTous: () => Promise<IpcResponse<Coach[]>>;
    creer: (payload: CreerOuModifierCoachPayload) => Promise<IpcResponse<Coach>>;
    modifier: (id: number, payload: CreerOuModifierCoachPayload) => Promise<IpcResponse<Coach>>;
    supprimer: (id: number) => Promise<IpcResponse<{ id: number }>>;
  };
  cours: {
    listerTous: () => Promise<IpcResponse<Cours[]>>;
    obtenirParId: (id: number) => Promise<IpcResponse<Cours>>;
    creer: (payload: CreerOuModifierCoursPayload) => Promise<IpcResponse<Cours>>;
    modifier: (id: number, payload: CreerOuModifierCoursPayload) => Promise<IpcResponse<Cours>>;
    supprimer: (id: number) => Promise<IpcResponse<{ id: number }>>;
  };
  salles: {
    listerTous: () => Promise<IpcResponse<Salle[]>>;
    creer: (payload: CreerOuModifierSallePayload) => Promise<IpcResponse<Salle>>;
    modifier: (id: number, payload: CreerOuModifierSallePayload) => Promise<IpcResponse<Salle>>;
    supprimer: (id: number) => Promise<IpcResponse<{ id: number }>>;
  };
  seances: {
    listerTous: () => Promise<IpcResponse<Seance[]>>;
    prochaines: (limite: number) => Promise<IpcResponse<Seance[]>>;
    creer: (payload: CreerOuModifierSeancePayload) => Promise<IpcResponse<Seance>>;
    modifier: (id: number, payload: CreerOuModifierSeancePayload) => Promise<IpcResponse<Seance>>;
    supprimer: (id: number) => Promise<IpcResponse<{ id: number }>>;
  };
  inscriptions: {
    listerToutes: () => Promise<IpcResponse<Inscription[]>>;
    inscrire: (payload: InscrirePayload) => Promise<IpcResponse<Inscription>>;
    modifierPresence: (
      membreId: number,
      seanceId: number,
      presence: boolean,
    ) => Promise<IpcResponse<Inscription>>;
    desinscrire: (
      membreId: number,
      seanceId: number,
    ) => Promise<IpcResponse<{ membreId: number; seanceId: number }>>;
  };
  abonnements: {
    listerTous: () => Promise<IpcResponse<Abonnement[]>>;
    creer: (payload: CreerOuModifierAbonnementPayload) => Promise<IpcResponse<Abonnement>>;
    modifier: (id: number, payload: CreerOuModifierAbonnementPayload) => Promise<IpcResponse<Abonnement>>;
    supprimer: (id: number) => Promise<IpcResponse<{ id: number }>>;
    // Transaction Prisma : crée l'abonnement + active le membre, atomiquement.
    souscrireEtActiver: (
      payload: CreerOuModifierAbonnementPayload,
    ) => Promise<IpcResponse<{ abonnement: Abonnement; membre: Membre }>>;
  };
  statistiques: {
    obtenir: () => Promise<IpcResponse<Statistiques>>;
  };
}

declare global {
  interface Window {
    api: GymApi;
  }
}

export {};
