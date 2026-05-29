/**
 * MembresListComponent — page LISTE des membres.
 *
 * Démontre :
 *  - signal()  : état local des membres et du filtre
 *  - computed(): nombre de membres actifs dérivé du signal `membres`
 *  - effect()  : log automatique quand le filtre change (BONUS)
 *  - @for / @if : itération + condition d'affichage (syntaxe Angular ≥ 17)
 *  - inject(MembreService) : injection de dépendances
 *  - composant enfant MembreRowComponent avec input.required + output
 */

import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MembreService } from '../../services/membre.service';
import { MembreRowComponent } from '../membre-row/membre-row.component';
import type { Membre, StatutMembre } from '../../models/domain.types';

type FiltreStatut = 'TOUS' | StatutMembre;

@Component({
  selector: 'app-membres-list',
  standalone: true,
  imports: [FormsModule, RouterLink, MembreRowComponent],
  template: `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h1>Membres</h1>
      <a class="btn" routerLink="/membres/nouveau">+ Nouveau membre</a>
    </div>

    <div class="card" style="display: flex; gap: 1rem; align-items: center;">
      <label>Filtre statut :</label>
      <select [(ngModel)]="filtreActif" (ngModelChange)="surChangementFiltre($event)">
        <option value="TOUS">Tous</option>
        <option value="ACTIF">Actifs</option>
        <option value="SUSPENDU">Suspendus</option>
        <option value="RESILIE">Résiliés</option>
      </select>
      <span style="margin-left: auto;">
        <strong>{{ nombreMembresActifs() }}</strong> actifs sur {{ membres().length }}
      </span>
    </div>

    @if (membresFiltres().length === 0) {
      <div class="card">Aucun membre à afficher.</div>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Email</th>
            <th>Statut</th>
            <th>Inscrit le</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (m of membresFiltres(); track m.id) {
            <app-membre-row [membre]="m" (supprime)="surSuppression($event)" />
          }
        </tbody>
      </table>
    }

    @if (erreur()) {
      <div class="card" style="color: #dc2626;">{{ erreur() }}</div>
    }
  `,
})
export class MembresListComponent implements OnInit {
  private readonly membreService = inject(MembreService);

  readonly membres = signal<Membre[]>([]);
  readonly filtreActif = signal<FiltreStatut>('TOUS');
  readonly erreur = signal<string | null>(null);

  readonly nombreMembresActifs = computed(
    () => this.membres().filter((m) => m.statut === 'ACTIF').length,
  );

  readonly membresFiltres = computed(() => {
    const filtre = this.filtreActif();
    if (filtre === 'TOUS') return this.membres();
    return this.membres().filter((m) => m.statut === filtre);
  });

  constructor() {
    // Démo effect() : side-effect réactif déclenché à chaque changement du filtre.
    effect(() => {
      console.log('[effect] Filtre membre changé →', this.filtreActif());
    });
  }

  async ngOnInit(): Promise<void> {
    await this.recharger();
  }

  async recharger(): Promise<void> {
    try {
      const liste = await this.membreService.listerTous();
      this.membres.set(liste);
      this.erreur.set(null);
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur inconnue');
    }
  }

  surChangementFiltre(valeur: FiltreStatut): void {
    this.filtreActif.set(valeur);
  }

  async surSuppression(id: number): Promise<void> {
    if (!confirm('Supprimer ce membre ? Ses inscriptions et abonnements seront perdus.')) {
      return;
    }
    try {
      await this.membreService.supprimer(id);
      // Mise à jour locale optimiste (on évite un re-fetch complet).
      this.membres.update((liste) => liste.filter((m) => m.id !== id));
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur suppression');
    }
  }
}
