/**
 * StatistiquesComponent — TABLEAU DE BORD.
 *
 * Affiche :
 *  - Nombre de membres actifs (via prisma.membre.count + WHERE)
 *  - Total membres (count)
 *  - Nombre de cours par coach (via prisma.cours.groupBy)
 *  - 5 prochaines séances (via findMany + include + take)
 *  - Taux de remplissage moyen (calcul côté main + affichage)
 *
 * Côté Angular : computed() supplémentaire pour démontrer que l'UI peut
 * dériver des valeurs à partir des données reçues (% d'actifs).
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { StatistiqueService } from '../../services/statistique.service';
import type { Statistiques } from '../../models/domain.types';

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  template: `
    <h1>Statistiques</h1>

    @if (erreur()) {
      <div class="card" style="color: #dc2626;">{{ erreur() }}</div>
    }

    @if (stats(); as s) {
      <div class="stat-grid">
        <div class="stat-card">
          <div class="value">{{ s.nombreMembresActifs }}</div>
          <div class="label">Membres actifs</div>
        </div>
        <div class="stat-card">
          <div class="value">{{ s.nombreMembresTotal }}</div>
          <div class="label">Membres total</div>
        </div>
        <div class="stat-card">
          <div class="value">{{ pourcentageActifs() | number: '1.0-1' }} %</div>
          <div class="label">% Actifs (computed Angular)</div>
        </div>
        <div class="stat-card">
          <div class="value">{{ s.tauxRemplissageMoyen | number: '1.0-1' }} %</div>
          <div class="label">Remplissage moyen</div>
        </div>
      </div>

      <div class="card">
        <h2>Cours par coach (groupBy Prisma)</h2>
        <table>
          <thead>
            <tr><th>Coach</th><th>Nombre de cours</th></tr>
          </thead>
          <tbody>
            @for (g of s.coursParCoach; track g.coachId) {
              <tr>
                <td>{{ g.coachNom }}</td>
                <td>{{ g.nombreCours }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>5 prochaines séances (include cours + coach + salle)</h2>
        @if (s.prochainesSeances.length === 0) {
          <p>Aucune séance planifiée.</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Cours</th>
                <th>Coach</th>
                <th>Salle</th>
                <th>Inscrits</th>
              </tr>
            </thead>
            <tbody>
              @for (seance of s.prochainesSeances; track seance.id) {
                <tr>
                  <td>{{ seance.dateHeure | date: 'EEE dd/MM HH:mm' }}</td>
                  <td>{{ seance.cours?.titre }}</td>
                  <td>{{ seance.cours?.coach?.prenom }} {{ seance.cours?.coach?.nom }}</td>
                  <td>{{ seance.salle?.nom }}</td>
                  <td>{{ seance.inscriptions?.length ?? 0 }} / {{ seance.cours?.capaciteMax }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    } @else {
      <div class="card">Chargement…</div>
    }
  `,
})
export class StatistiquesComponent implements OnInit {
  private readonly statistiqueService = inject(StatistiqueService);

  readonly stats = signal<Statistiques | null>(null);
  readonly erreur = signal<string | null>(null);

  readonly pourcentageActifs = computed(() => {
    const s = this.stats();
    if (!s || s.nombreMembresTotal === 0) return 0;
    return (s.nombreMembresActifs / s.nombreMembresTotal) * 100;
  });

  async ngOnInit(): Promise<void> {
    try {
      this.stats.set(await this.statistiqueService.obtenir());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur chargement statistiques');
    }
  }
}
