/**
 * MembreService — façade entre les composants Angular et l'API IPC (window.api).
 *
 * `providedIn: 'root'` :
 *   → Le service est instancié UNE SEULE FOIS pour toute l'app (SINGLETON).
 *   → Injecté via `inject(MembreService)` dans les composants.
 *
 * Pourquoi un service plutôt qu'appeler `window.api` directement dans les
 * composants ?
 *   → Centralisation : si demain on change l'API, on n'a qu'un endroit à modifier.
 *   → Testabilité : on peut mocker le service dans les tests.
 *   → Lisibilité : les composants restent focalisés sur l'UI.
 */

import { Injectable } from '@angular/core';
import type { Membre, MembreDetail } from '../models/domain.types';
import type { CreerOuModifierMembrePayload } from '../models/api.types';

@Injectable({ providedIn: 'root' })
export class MembreService {
  // Toutes les méthodes "déballent" la réponse IpcResponse : si success=true
  // elles renvoient la data, sinon elles throw — les composants gèrent
  // ensuite avec try/catch.

  async listerTous(): Promise<Membre[]> {
    const reponse = await window.api.membres.listerTous();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  async obtenirParId(id: number): Promise<MembreDetail> {
    const reponse = await window.api.membres.obtenirParId(id);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  async creer(payload: CreerOuModifierMembrePayload): Promise<Membre> {
    const reponse = await window.api.membres.creer(payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  async modifier(id: number, payload: CreerOuModifierMembrePayload): Promise<Membre> {
    const reponse = await window.api.membres.modifier(id, payload);
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }

  async supprimer(id: number): Promise<void> {
    const reponse = await window.api.membres.supprimer(id);
    if (!reponse.success) throw new Error(reponse.error);
  }
}
