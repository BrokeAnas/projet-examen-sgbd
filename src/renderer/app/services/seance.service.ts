/**
 * SeanceService — façade Angular pour les opérations CRUD sur Seance.
 *
 * Une Seance = instance datée d'un Cours dans une Salle.
 * Singleton injectable (`providedIn: 'root'`).
 */

import { Injectable } from '@angular/core';
import type { Seance } from '../models/domain.types';
import type { CreerOuModifierSeancePayload } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class SeanceService {
  /** Liste toutes les séances (passées + futures), avec cours, coach, salle et inscriptions. */
  async listerTous(): Promise<Seance[]> {
    const reponse = await window.api.seances.listerTous();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Crée une séance (date + cours + salle). */
  async creer(payload: CreerOuModifierSeancePayload): Promise<Seance> {
    const reponse = await window.api.seances.creer(payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Met à jour une séance existante. */
  async modifier(id: number, payload: CreerOuModifierSeancePayload): Promise<Seance> {
    const reponse = await window.api.seances.modifier(id, payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Supprime une séance. Cascade : les inscriptions liées partent avec elle. */
  async supprimer(id: number): Promise<void> {
    const reponse = await window.api.seances.supprimer(id);
    if (!reponse.success) throw new Error(reponse.error);
  }
}
