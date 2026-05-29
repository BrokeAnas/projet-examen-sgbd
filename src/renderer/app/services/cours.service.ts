/**
 * CoursService — façade Angular pour les opérations CRUD sur Cours.
 *
 * Singleton injectable (`providedIn: 'root'`) — voir CoachService pour le détail.
 */

import { Injectable } from '@angular/core';
import type { Cours } from '../models/domain.types';
import type { CreerOuModifierCoursPayload } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class CoursService {
  /** Liste tous les cours avec coach + séances (JOIN Prisma via include). */
  async listerTous(): Promise<Cours[]> {
    const reponse = await window.api.cours.listerTous();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Détail d'un cours (incluant coach + séances + salles). */
  async obtenirParId(id: number): Promise<Cours> {
    const reponse = await window.api.cours.obtenirParId(id);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Crée un nouveau cours rattaché à un coach existant. */
  async creer(payload: CreerOuModifierCoursPayload): Promise<Cours> {
    const reponse = await window.api.cours.creer(payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Met à jour les champs d'un cours. */
  async modifier(id: number, payload: CreerOuModifierCoursPayload): Promise<Cours> {
    const reponse = await window.api.cours.modifier(id, payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Supprime un cours. Cascade : toutes ses séances disparaissent automatiquement. */
  async supprimer(id: number): Promise<void> {
    const reponse = await window.api.cours.supprimer(id);
    if (!reponse.success) throw new Error(reponse.error);
  }
}
