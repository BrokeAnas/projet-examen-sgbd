/**
 * MembreFormComponent — formulaire CRÉATION et ÉDITION d'un membre.
 *
 * Démontre :
 *  - Formulaire RÉACTIF (ReactiveFormsModule + FormBuilder + Validators)
 *  - Routage paramétré : si l'URL contient :id → on est en mode édition
 *  - Validators.required + Validators.email
 *  - inject() pour les services et le router
 *
 * La MÊME route component sert pour /membres/nouveau ET /membres/:id/modifier.
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
  type FormControl,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MembreService } from '../../services/membre.service';
import type { StatutMembre } from '../../models/domain.types';

interface MembreFormControls {
  nom: FormControl<string>;
  prenom: FormControl<string>;
  email: FormControl<string>;
  statut: FormControl<StatutMembre>;
}

@Component({
  selector: 'app-membre-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <h1>{{ idEdition() ? 'Modifier le membre' : 'Nouveau membre' }}</h1>

    <form class="card" [formGroup]="form" (ngSubmit)="surSoumission()">
      <div class="form-group">
        <label>Nom</label>
        <input type="text" formControlName="nom" />
        @if (form.controls.nom.invalid && form.controls.nom.touched) {
          <div class="error">Le nom est requis.</div>
        }
      </div>

      <div class="form-group">
        <label>Prénom</label>
        <input type="text" formControlName="prenom" />
        @if (form.controls.prenom.invalid && form.controls.prenom.touched) {
          <div class="error">Le prénom est requis.</div>
        }
      </div>

      <div class="form-group">
        <label>Email</label>
        <input type="email" formControlName="email" />
        @if (form.controls.email.invalid && form.controls.email.touched) {
          <div class="error">Email invalide.</div>
        }
      </div>

      <div class="form-group">
        <label>Statut</label>
        <select formControlName="statut">
          <option value="ACTIF">Actif</option>
          <option value="SUSPENDU">Suspendu</option>
          <option value="RESILIE">Résilié</option>
        </select>
      </div>

      @if (erreur()) {
        <div class="error" style="margin-bottom: 1rem;">{{ erreur() }}</div>
      }

      <div style="display: flex; gap: 0.5rem;">
        <button class="btn" type="submit" [disabled]="form.invalid || enCours()">
          {{ enCours() ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
        <button class="btn btn-secondary" type="button" (click)="annuler()">Annuler</button>
      </div>
    </form>
  `,
})
export class MembreFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly membreService = inject(MembreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly idEdition = signal<number | null>(null);
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  // nonNullable.group : empêche les valeurs null dans le formulaire (sécurité du typage).
  readonly form: FormGroup<MembreFormControls> = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    statut: ['ACTIF' as StatutMembre, Validators.required],
  });

  async ngOnInit(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      this.idEdition.set(id);
      await this.chargerMembre(id);
    }
  }

  private async chargerMembre(id: number): Promise<void> {
    try {
      const membre = await this.membreService.obtenirParId(id);
      this.form.setValue({
        nom: membre.nom,
        prenom: membre.prenom,
        email: membre.email,
        statut: membre.statut,
      });
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur chargement');
    }
  }

  async surSoumission(): Promise<void> {
    if (this.form.invalid) return;
    this.enCours.set(true);
    this.erreur.set(null);
    try {
      const payload = this.form.getRawValue();
      const id = this.idEdition();
      if (id === null) {
        await this.membreService.creer(payload);
      } else {
        await this.membreService.modifier(id, payload);
      }
      await this.router.navigate(['/membres']);
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      this.enCours.set(false);
    }
  }

  annuler(): void {
    this.router.navigate(['/membres']);
  }
}
