/**
 * InscriptionService — façade Angular pour la table de jonction Inscription.
 *
 * Inscription est une N:M EXPLICITE entre Membre et Seance, avec des champs
 * supplémentaires (dateInscription, presence). Le CRUD ici est sémantique :
 *  - Create  → inscrire un membre à une séance
 *  - Update  → marquer la présence (true/false)
 *  - Delete  → désinscrire
 *
 * Singleton (`providedIn: 'root'`).
 */

import { Injectable } from '@angular/core';
import type { Inscription } from '../models/domain.types';
import type { InscrirePayload } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class InscriptionService {
  /** Liste toutes les inscriptions (avec membre + séance/cours). */
  async listerToutes(): Promise<Inscription[]> {
    const reponse = await window.api.inscriptions.listerToutes();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Crée une inscription (couple membre, séance). Échoue si le couple existe déjà (PK composite). */
  async inscrire(payload: InscrirePayload): Promise<Inscription> {
    const reponse = await window.api.inscriptions.inscrire(payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Bascule le booléen `presence` d'une inscription identifiée par sa clé composite. */
  async modifierPresence(membreId: number, seanceId: number, presence: boolean): Promise<Inscription> {
    const reponse = await window.api.inscriptions.modifierPresence(membreId, seanceId, presence);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Supprime une inscription (désinscrit le membre de la séance). */
  async desinscrire(membreId: number, seanceId: number): Promise<void> {
    const reponse = await window.api.inscriptions.desinscrire(membreId, seanceId);
    if (!reponse.success) throw new Error(reponse.error);
  }
}
