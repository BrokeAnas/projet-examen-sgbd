/**
 * CoursListComponent — page CRUD complète des cours.
 *
 * Démontre :
 *  - `include` Prisma (chaque cours arrive avec son coach et ses séances)
 *  - Création d'un cours via formulaire réactif (avec select coach)
 *  - Suppression (Cascade : les séances suivent)
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup, type FormControl } from '@angular/forms';
import { CoursService } from '../../services/cours.service';
import { CoachService } from '../../services/coach.service';
import type { Cours, Coach } from '../../models/domain.types';

interface CoursFormControls {
  titre: FormControl<string>;
  description: FormControl<string>;
  dureeMinutes: FormControl<number>;
  capaciteMax: FormControl<number>;
  coachId: FormControl<number>;
}

@Component({
  selector: 'app-cours-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <h1>Cours proposés</h1>

    @if (erreur()) {
      <div class="card" style="color: #dc2626;">{{ erreur() }}</div>
    }

    <div class="card">
      <h3>Nouveau cours</h3>
      @if (coachs().length === 0) {
        <p style="color: #6b7280;">Crée d'abord au moins un coach.</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="surSoumission()" style="display: grid; grid-template-columns: 1fr 2fr 1fr 1fr 1fr auto; gap: 0.5rem; align-items: end;">
          <div>
            <label style="font-size:0.8rem;">Titre</label>
            <input type="text" formControlName="titre" />
          </div>
          <div>
            <label style="font-size:0.8rem;">Description (optionnel)</label>
            <input type="text" formControlName="description" />
          </div>
          <div>
            <label style="font-size:0.8rem;">Durée (min)</label>
            <input type="number" formControlName="dureeMinutes" />
          </div>
          <div>
            <label style="font-size:0.8rem;">Capacité max</label>
            <input type="number" formControlName="capaciteMax" />
          </div>
          <div>
            <label style="font-size:0.8rem;">Coach</label>
            <select formControlName="coachId">
              @for (c of coachs(); track c.id) {
                <option [value]="c.id">{{ c.prenom }} {{ c.nom }}</option>
              }
            </select>
          </div>
          <button class="btn" type="submit" [disabled]="form.invalid">Créer</button>
        </form>
      }
    </div>

    @if (cours().length === 0) {
      <div class="card">Aucun cours disponible.</div>
    } @else {
      <div class="card" style="margin-bottom: 1rem;">
        <strong>{{ nombreTotalCours() }}</strong> cours, dont
        <strong>{{ nombreAvecSeance() }}</strong> ont au moins une séance planifiée.
      </div>

      @for (c of cours(); track c.id) {
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 0.3rem 0;">{{ c.titre }}</h3>
              @if (c.description) {
                <p style="margin: 0.2rem 0; color: #6b7280;">{{ c.description }}</p>
              }
              <p style="margin: 0.3rem 0; font-size: 0.9rem;">
                {{ c.dureeMinutes }} min · capacité max {{ c.capaciteMax }}
                @if (c.coach) {
                  · Coach : {{ c.coach.prenom }} {{ c.coach.nom }} ({{ c.coach.specialite }})
                }
              </p>
            </div>
            <button class="btn btn-danger" (click)="surSuppression(c.id)">Supprimer</button>
          </div>

          @if (c.seances && c.seances.length > 0) {
            <details>
              <summary>{{ c.seances.length }} séance(s) planifiée(s)</summary>
              <ul>
                @for (s of c.seances; track s.id) {
                  <li>{{ s.dateHeure | date: 'EEE dd/MM/yyyy HH:mm' }}</li>
                }
              </ul>
            </details>
          }
        </div>
      }
    }
  `,
})
export class CoursListComponent implements OnInit {
  private readonly coursService = inject(CoursService);
  private readonly coachService = inject(CoachService);
  private readonly fb = inject(FormBuilder);

  readonly cours = signal<Cours[]>([]);
  readonly coachs = signal<Coach[]>([]);
  readonly erreur = signal<string | null>(null);

  readonly nombreTotalCours = computed(() => this.cours().length);
  readonly nombreAvecSeance = computed(
    () => this.cours().filter((c) => (c.seances?.length ?? 0) > 0).length,
  );

  readonly form: FormGroup<CoursFormControls> = this.fb.nonNullable.group({
    titre: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    dureeMinutes: [60, [Validators.required, Validators.min(1)]],
    capaciteMax: [15, [Validators.required, Validators.min(1)]],
    coachId: [0, [Validators.required, Validators.min(1)]],
  });

  async ngOnInit(): Promise<void> {
    try {
      this.coachs.set(await this.coachService.listerTous());
      const premierCoach = this.coachs()[0];
      if (premierCoach) this.form.patchValue({ coachId: premierCoach.id });
      this.cours.set(await this.coursService.listerTous());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur chargement');
    }
  }

  async surSoumission(): Promise<void> {
    if (this.form.invalid) return;
    try {
      const v = this.form.getRawValue();
      await this.coursService.creer({
        titre: v.titre,
        description: v.description.trim() === '' ? null : v.description,
        dureeMinutes: v.dureeMinutes,
        capaciteMax: v.capaciteMax,
        coachId: v.coachId,
      });
      const premierCoach = this.coachs()[0];
      this.form.reset({
        titre: '',
        description: '',
        dureeMinutes: 60,
        capaciteMax: 15,
        coachId: premierCoach ? premierCoach.id : 0,
      });
      this.cours.set(await this.coursService.listerTous());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur création');
    }
  }

  async surSuppression(id: number): Promise<void> {
    if (!confirm('Supprimer ce cours ? Ses séances seront supprimées en cascade.')) return;
    try {
      await this.coursService.supprimer(id);
      this.cours.set(await this.coursService.listerTous());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur suppression');
    }
  }
}
