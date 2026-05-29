/**
 * Interfaces TypeScript du domaine métier.
 *
 * Ces types miroitent (de manière simplifiée) ce que Prisma renvoie. On ne
 * réutilise pas directement `@prisma/client` côté renderer pour ne PAS
 * embarquer Prisma dans le bundle du navigateur (sécurité + taille).
 *
 * → Coté main : on utilise les types Prisma générés.
 * → Côté renderer : on utilise CES interfaces.
 */

export type StatutMembre = 'ACTIF' | 'SUSPENDU' | 'RESILIE';
export type TypeAbonnement = 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';

export interface Membre {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  dateInscription: string; // sérialisé en ISO via IPC
  statut: StatutMembre;
}

export interface Coach {
  id: number;
  nom: string;
  prenom: string;
  specialite: string;
  dateEmbauche: string;
  salaire: number;
  cours?: Cours[];
}

export interface Cours {
  id: number;
  titre: string;
  description: string | null;
  dureeMinutes: number;
  capaciteMax: number;
  coachId: number;
  coach?: Coach;
  seances?: Seance[];
}

export interface Salle {
  id: number;
  nom: string;
  capacite: number;
  equipements: string | null;
}

export interface Seance {
  id: number;
  dateHeure: string;
  coursId: number;
  salleId: number;
  cours?: Cours;
  salle?: Salle;
  inscriptions?: Inscription[];
}

export interface Inscription {
  membreId: number;
  seanceId: number;
  dateInscription: string;
  presence: boolean;
  seance?: Seance;
}

export interface Abonnement {
  id: number;
  type: TypeAbonnement;
  prix: number;
  dateDebut: string;
  dateFin: string;
  membreId: number;
}

export interface MembreDetail extends Membre {
  abonnements: Abonnement[];
  inscriptions: Inscription[];
}

export interface Statistiques {
  nombreMembresActifs: number;
  nombreMembresTotal: number;
  coursParCoach: Array<{ coachId: number; coachNom: string; nombreCours: number }>;
  prochainesSeances: Seance[];
  tauxRemplissageMoyen: number;
}

// Format de réponse standardisé renvoyé par tous les handlers IPC.
export type IpcResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
