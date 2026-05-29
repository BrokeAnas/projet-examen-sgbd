/**
 * AbonnementService — façade Angular pour les opérations CRUD sur Abonnement.
 *
 * Un Abonnement représente une période payée par un membre (type, prix, dates).
 * Singleton (`providedIn: 'root'`).
 */

import { Injectable } from '@angular/core';
import type { Abonnement, Membre } from '../models/domain.types';
import type { CreerOuModifierAbonnementPayload } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class AbonnementService {
  /** Liste tous les abonnements (avec le membre lié). */
  async listerTous(): Promise<Abonnement[]> {
    const reponse = await window.api.abonnements.listerTous();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Crée un nouvel abonnement (utilise l'enum TypeAbonnement). */
  async creer(payload: CreerOuModifierAbonnementPayload): Promise<Abonnement> {
    const reponse = await window.api.abonnements.creer(payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Met à jour un abonnement existant. */
  async modifier(id: number, payload: CreerOuModifierAbonnementPayload): Promise<Abonnement> {
    const reponse = await window.api.abonnements.modifier(id, payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Supprime un abonnement. */
  async supprimer(id: number): Promise<void> {
    const reponse = await window.api.abonnements.supprimer(id);
    if (!reponse.success) throw new Error(reponse.error);
  }

  /**
   * TRANSACTION : souscrit un nouvel abonnement ET active le membre,
   * dans une seule transaction Prisma (tout ou rien — ACID atomicité).
   *
   * Si la création de l'abonnement réussit MAIS l'activation du membre
   * échoue (ou inversement), Prisma fait ROLLBACK et aucune des deux
   * opérations n'est appliquée — la base reste cohérente.
   */
  async souscrireEtActiver(
    payload: CreerOuModifierAbonnementPayload,
  ): Promise<{ abonnement: Abonnement; membre: Membre }> {
    const reponse = await window.api.abonnements.souscrireEtActiver(payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }
}
