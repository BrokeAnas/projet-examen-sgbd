/**
 * CoachsListComponent — page CRUD complète des coachs.
 *
 * Démontre :
 *  - signal/computed
 *  - Formulaire réactif pour CRÉER un coach
 *  - Suppression d'un coach (avec contrainte Restrict de Prisma si cours liés)
 *  - Mode édition en place (toggle ligne par ligne)
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup, type FormControl } from '@angular/forms';
import { CoachService } from '../../services/coach.service';
import type { Coach } from '../../models/domain.types';

interface CoachFormControls {
  nom: FormControl<string>;
  prenom: FormControl<string>;
  specialite: FormControl<string>;
  salaire: FormControl<number>;
}

@Component({
  selector: 'app-coachs-list',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1>Coachs</h1>

    @if (erreur()) {
      <div class="card" style="color: #dc2626;">{{ erreur() }}</div>
    }

    <div class="card">
      <h3>Nouveau coach</h3>
      <form [formGroup]="form" (ngSubmit)="surSoumission()" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap: 0.5rem;">
        <input type="text" placeholder="Nom" formControlName="nom" />
        <input type="text" placeholder="Prénom" formControlName="prenom" />
        <input type="text" placeholder="Spécialité" formControlName="specialite" />
        <input type="number" placeholder="Salaire" formControlName="salaire" />
        <button class="btn" type="submit" [disabled]="form.invalid">Créer</button>
      </form>
    </div>

    @if (coachs().length === 0) {
      <div class="card">Aucun coach enregistré.</div>
    } @else {
      <div class="card">Total : <strong>{{ nombreCoachs() }}</strong> coachs</div>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Spécialité</th>
            <th>Salaire</th>
            <th>Nb cours</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (c of coachs(); track c.id) {
            <tr>
              @if (idEnEdition() === c.id) {
                <td><input #editNom [value]="c.nom" /></td>
                <td><input #editPrenom [value]="c.prenom" /></td>
                <td><input #editSpec [value]="c.specialite" /></td>
                <td><input #editSalaire type="number" [value]="c.salaire" /></td>
                <td>{{ c.cours?.length ?? 0 }}</td>
                <td style="display: flex; gap: 0.3rem;">
                  <button class="btn" (click)="surValidationEdition(c.id, editNom.value, editPrenom.value, editSpec.value, +editSalaire.value)">OK</button>
                  <button class="btn btn-secondary" (click)="idEnEdition.set(null)">Annuler</button>
                </td>
              } @else {
                <td>{{ c.nom }}</td>
                <td>{{ c.prenom }}</td>
                <td>{{ c.specialite }}</td>
                <td>{{ c.salaire }} €</td>
                <td>{{ c.cours?.length ?? 0 }}</td>
                <td style="display: flex; gap: 0.3rem;">
                  <button class="btn btn-secondary" (click)="idEnEdition.set(c.id)">Modifier</button>
                  <button class="btn btn-danger" (click)="surSuppression(c.id)">Supprimer</button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class CoachsListComponent implements OnInit {
  private readonly coachService = inject(CoachService);
  private readonly fb = inject(FormBuilder);

  readonly coachs = signal<Coach[]>([]);
  readonly erreur = signal<string | null>(null);
  readonly idEnEdition = signal<number | null>(null);

  readonly nombreCoachs = computed(() => this.coachs().length);

  readonly form: FormGroup<CoachFormControls> = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    specialite: ['', Validators.required],
    salaire: [2000, [Validators.required, Validators.min(0)]],
  });

  async ngOnInit(): Promise<void> {
    await this.recharger();
  }

  private async recharger(): Promise<void> {
    try {
      this.coachs.set(await this.coachService.listerTous());
      this.erreur.set(null);
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur chargement');
    }
  }

  async surSoumission(): Promise<void> {
    if (this.form.invalid) return;
    try {
      await this.coachService.creer(this.form.getRawValue());
      this.form.reset({ nom: '', prenom: '', specialite: '', salaire: 2000 });
      await this.recharger();
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur création');
    }
  }

  async surValidationEdition(
    id: number,
    nom: string,
    prenom: string,
    specialite: string,
    salaire: number,
  ): Promise<void> {
    try {
      await this.coachService.modifier(id, { nom, prenom, specialite, salaire });
      this.idEnEdition.set(null);
      await this.recharger();
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur modification');
    }
  }

  async surSuppression(id: number): Promise<void> {
    if (!confirm('Supprimer ce coach ? (impossible s\'il a encore des cours actifs)')) return;
    try {
      await this.coachService.supprimer(id);
      await this.recharger();
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur suppression');
    }
  }
}
