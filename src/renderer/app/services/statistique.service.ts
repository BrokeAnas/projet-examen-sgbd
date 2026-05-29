/**
 * StatistiqueService — façade vers les agrégats Prisma (count, groupBy, ...).
 *
 * Les calculs sont faits CÔTÉ MAIN (Prisma) pour profiter des fonctions SQL
 * natives. Le service Angular ne fait que déballer la réponse.
 *
 * Singleton (`providedIn: 'root'`).
 */

import { Injectable } from '@angular/core';
import type { Statistiques } from '../models/domain.types';

@Injectable({ providedIn: 'root' })
export class StatistiqueService {
  /** Récupère le tableau de bord : count actifs, groupBy coach, 5 prochaines séances, taux moyen. */
  async obtenir(): Promise<Statistiques> {
    const reponse = await window.api.statistiques.obtenir();
    if (!reponse.success) throw new Error(reponse.error);
    return reponse.data;
  }
}
