/**
 * CoachService — façade Angular pour les opérations CRUD sur Coach.
 *
 * Rôle :
 *  - Centralise les appels vers `window.api.coachs.*` (couche IPC exposée par
 *    le preload Electron).
 *  - Déballe le format `{ success, data | error }` renvoyé par le main process
 *    pour que les composants Angular reçoivent directement la donnée ou une
 *    erreur à try/catcher.
 *
 * Pourquoi `providedIn: 'root'` ?
 *  → Le service est un SINGLETON pour toute l'application. Quand n'importe quel
 *    composant fait `inject(CoachService)`, il reçoit la MÊME instance.
 *  → Évite d'instancier le service à chaque création de composant.
 */

import { Injectable } from '@angular/core';
import type { Coach } from '../models/domain.types';
import type { CreerOuModifierCoachPayload } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class CoachService {
  /** Renvoie la liste complète des coachs (avec leurs cours en relation). */
  async listerTous(): Promise<Coach[]> {
    const reponse = await window.api.coachs.listerTous();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Crée un coach et renvoie l'entité créée (avec son id auto-généré). */
  async creer(payload: CreerOuModifierCoachPayload): Promise<Coach> {
    const reponse = await window.api.coachs.creer(payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Met à jour les champs d'un coach existant. */
  async modifier(id: number, payload: CreerOuModifierCoachPayload): Promise<Coach> {
    const reponse = await window.api.coachs.modifier(id, payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  /** Supprime un coach. Échoue si le coach a encore des cours (onDelete: Restrict). */
  async supprimer(id: number): Promise<void> {
    const reponse = await window.api.coachs.supprimer(id);
    if (!reponse.success) throw new Error(reponse.error);
  }
}
