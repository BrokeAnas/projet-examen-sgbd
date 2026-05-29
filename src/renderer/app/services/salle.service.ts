/**
 * SalleService — façade Angular pour les opérations CRUD sur Salle.
 *
 * Singleton injectable (`providedIn: 'root'`).
 */

import { Injectable } from '@angular/core';
import type { Salle } from '../models/domain.types';
import type { CreerOuModifierSallePayload } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class SalleService {
  /** Liste les salles, triées par nom. */
  async listerTous(): Promise<Salle[]> {
    const reponse = await window.api.salles.listerTous();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Crée une nouvelle salle. `equipements` peut être null. */
  async creer(payload: CreerOuModifierSallePayload): Promise<Salle> {
    const reponse = await window.api.salles.creer(payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Met à jour une salle (nom, capacité, équipements). */
  async modifier(id: number, payload: CreerOuModifierSallePayload): Promise<Salle> {
    const reponse = await window.api.salles.modifier(id, payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Supprime une salle. Échoue si la salle accueille des séances (Restrict). */
  async supprimer(id: number): Promise<void> {
    const reponse = await window.api.salles.supprimer(id);
    if (!reponse.success) throw new Error(reponse.error);
  }
}
