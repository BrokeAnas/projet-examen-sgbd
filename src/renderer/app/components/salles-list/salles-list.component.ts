/**
 * SallesListComponent — page CRUD complète des salles.
 *
 * Démontre le CRUD complet sur une table simple (sans FK sortante).
 * La suppression peut échouer si la salle est utilisée par des séances
 * (contrainte onDelete: Restrict côté Prisma).
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup, type FormControl } from '@angular/forms';
import { SalleService } from '../../services/salle.service';
import type { Salle } from '../../models/domain.types';

interface SalleFormControls {
  nom: FormControl<string>;
  capacite: FormControl<number>;
  equipements: FormControl<string>;
}

@Component({
  selector: 'app-salles-list',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1>Salles</h1>

    @if (erreur()) {
      <div class="card" style="color: #dc2626;">{{ erreur() }}</div>
    }

    <div class="card">
      <h3>Nouvelle salle</h3>
      <form [formGroup]="form" (ngSubmit)="surSoumission()" style="display: grid; grid-template-columns: 1fr 1fr 2fr auto; gap: 0.5rem;">
        <input type="text" placeholder="Nom" formControlName="nom" />
        <input type="number" placeholder="Capacité" formControlName="capacite" />
        <input type="text" placeholder="Équipements (optionnel)" formControlName="equipements" />
        <button class="btn" type="submit" [disabled]="form.invalid">Créer</button>
      </form>
    </div>

    @if (salles().length === 0) {
      <div class="card">Aucune salle enregistrée.</div>
    } @else {
      <div class="card">Total : <strong>{{ nombreSalles() }}</strong> salles, capacité totale {{ capaciteTotale() }}</div>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Capacité</th>
            <th>Équipements</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (s of salles(); track s.id) {
            <tr>
              @if (idEnEdition() === s.id) {
                <td><input #editNom [value]="s.nom" /></td>
                <td><input #editCap type="number" [value]="s.capacite" /></td>
                <td><input #editEqp [value]="s.equipements ?? ''" /></td>
                <td style="display: flex; gap: 0.3rem;">
                  <button class="btn" (click)="surValidationEdition(s.id, editNom.value, +editCap.value, editEqp.value)">OK</button>
                  <button class="btn btn-secondary" (click)="idEnEdition.set(null)">Annuler</button>
                </td>
              } @else {
                <td>{{ s.nom }}</td>
                <td>{{ s.capacite }}</td>
                <td>{{ s.equipements ?? '—' }}</td>
                <td style="display: flex; gap: 0.3rem;">
                  <button class="btn btn-secondary" (click)="idEnEdition.set(s.id)">Modifier</button>
                  <button class="btn btn-danger" (click)="surSuppression(s.id)">Supprimer</button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class SallesListComponent implements OnInit {
  private readonly salleService = inject(SalleService);
  private readonly fb = inject(FormBuilder);

  readonly salles = signal<Salle[]>([]);
  readonly erreur = signal<string | null>(null);
  readonly idEnEdition = signal<number | null>(null);

  readonly nombreSalles = computed(() => this.salles().length);
  readonly capaciteTotale = computed(() => this.salles().reduce((sum, s) => sum + s.capacite, 0));

  readonly form: FormGroup<SalleFormControls> = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    capacite: [20, [Validators.required, Validators.min(1)]],
    equipements: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.recharger();
  }

  private async recharger(): Promise<void> {
    try {
      this.salles.set(await this.salleService.listerTous());
      this.erreur.set(null);
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur chargement');
    }
  }

  async surSoumission(): Promise<void> {
    if (this.form.invalid) return;
    try {
      const v = this.form.getRawValue();
      await this.salleService.creer({
        nom: v.nom,
        capacite: v.capacite,
        equipements: v.equipements.trim() === '' ? null : v.equipements,
      });
      this.form.reset({ nom: '', capacite: 20, equipements: '' });
      await this.recharger();
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur création');
    }
  }

  async surValidationEdition(id: number, nom: string, capacite: number, equipements: string): Promise<void> {
    try {
      await this.salleService.modifier(id, {
        nom,
        capacite,
        equipements: equipements.trim() === '' ? null : equipements,
      });
      this.idEnEdition.set(null);
      await this.recharger();
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur modification');
    }
  }

  async surSuppression(id: number): Promise<void> {
    if (!confirm('Supprimer cette salle ? (impossible si elle accueille des séances)')) return;
    try {
      await this.salleService.supprimer(id);
      await this.recharger();
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur suppression');
    }
  }
}
