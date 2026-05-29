/**
 * SeancesListComponent — page CRUD complète des séances + gestion des inscriptions.
 *
 * Cette page démontre deux choses :
 *  1) CRUD sur la table Seance (Cascade : supprimer une séance retire ses inscriptions)
 *  2) CRUD sur la table de jonction Inscription : inscrire/désinscrire un membre,
 *     basculer la présence. C'est ici qu'on défend à l'oral la N:M explicite.
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup, type FormControl } from '@angular/forms';
import { SeanceService } from '../../services/seance.service';
import { CoursService } from '../../services/cours.service';
import { SalleService } from '../../services/salle.service';
import { MembreService } from '../../services/membre.service';
import { InscriptionService } from '../../services/inscription.service';
import type { Cours, Membre, Salle, Seance } from '../../models/domain.types';

interface SeanceFormControls {
  dateHeure: FormControl<string>;
  coursId: FormControl<number>;
  salleId: FormControl<number>;
}

@Component({
  selector: 'app-seances-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <h1>Séances</h1>

    @if (erreur()) {
      <div class="card" style="color: #dc2626;">{{ erreur() }}</div>
    }

    <!-- ===== Création d'une séance ===== -->
    <div class="card">
      <h3>Nouvelle séance</h3>
      @if (cours().length === 0 || salles().length === 0) {
        <p style="color: #6b7280;">Crée d'abord au moins un cours et une salle.</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="surSoumission()" style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 0.5rem; align-items: end;">
          <div>
            <label style="font-size: 0.8rem;">Date / heure</label>
            <input type="datetime-local" formControlName="dateHeure" />
          </div>
          <div>
            <label style="font-size: 0.8rem;">Cours</label>
            <select formControlName="coursId">
              @for (c of cours(); track c.id) {
                <option [value]="c.id">{{ c.titre }}</option>
              }
            </select>
          </div>
          <div>
            <label style="font-size: 0.8rem;">Salle</label>
            <select formControlName="salleId">
              @for (s of salles(); track s.id) {
                <option [value]="s.id">{{ s.nom }}</option>
              }
            </select>
          </div>
          <button class="btn" type="submit" [disabled]="form.invalid">Créer</button>
        </form>
      }
    </div>

    <!-- ===== Liste des séances ===== -->
    @if (seances().length === 0) {
      <div class="card">Aucune séance.</div>
    } @else {
      <div class="card">Total : <strong>{{ nombreSeances() }}</strong> séances</div>

      @for (s of seances(); track s.id) {
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <strong>{{ s.dateHeure | date: 'EEEE dd/MM/yyyy HH:mm' }}</strong>
              <p style="margin: 0.2rem 0; font-size: 0.9rem; color: #6b7280;">
                {{ s.cours?.titre }} · {{ s.salle?.nom }}
                @if (s.cours?.coach) {
                  · {{ s.cours?.coach?.prenom }} {{ s.cours?.coach?.nom }}
                }
                · {{ s.inscriptions?.length ?? 0 }} / {{ s.cours?.capaciteMax }} inscrits
              </p>
            </div>
            <button class="btn btn-danger" (click)="surSuppression(s.id)">Supprimer</button>
          </div>

          <!-- Gestion des inscriptions (CRUD sur Inscription) -->
          <details>
            <summary>Gérer les inscriptions</summary>
            <div style="display: flex; gap: 0.5rem; margin: 0.5rem 0;">
              <select #selectMembre style="flex: 1;">
                @for (m of membres(); track m.id) {
                  <option [value]="m.id">{{ m.prenom }} {{ m.nom }}</option>
                }
              </select>
              <button class="btn" (click)="surInscription(s.id, +selectMembre.value)">Inscrire</button>
            </div>

            @if (s.inscriptions && s.inscriptions.length > 0) {
              <table>
                <thead><tr><th>Membre</th><th>Présence</th><th>Actions</th></tr></thead>
                <tbody>
                  @for (i of s.inscriptions; track i.membreId) {
                    <tr>
                      <td>{{ nomMembre(i.membreId) }}</td>
                      <td>
                        <input
                          type="checkbox"
                          [checked]="i.presence"
                          (change)="surTogglePresence(i.membreId, s.id, $event)"
                        />
                      </td>
                      <td>
                        <button class="btn btn-danger" (click)="surDesinscription(i.membreId, s.id)">Désinscrire</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </details>
        </div>
      }
    }
  `,
})
export class SeancesListComponent implements OnInit {
  private readonly seanceService = inject(SeanceService);
  private readonly coursService = inject(CoursService);
  private readonly salleService = inject(SalleService);
  private readonly membreService = inject(MembreService);
  private readonly inscriptionService = inject(InscriptionService);
  private readonly fb = inject(FormBuilder);

  readonly seances = signal<Seance[]>([]);
  readonly cours = signal<Cours[]>([]);
  readonly salles = signal<Salle[]>([]);
  readonly membres = signal<Membre[]>([]);
  readonly erreur = signal<string | null>(null);

  readonly nombreSeances = computed(() => this.seances().length);

  readonly form: FormGroup<SeanceFormControls> = this.fb.nonNullable.group({
    dateHeure: ['', Validators.required],
    coursId: [0, [Validators.required, Validators.min(1)]],
    salleId: [0, [Validators.required, Validators.min(1)]],
  });

  async ngOnInit(): Promise<void> {
    await this.rechargerTout();
  }

  private async rechargerTout(): Promise<void> {
    try {
      this.cours.set(await this.coursService.listerTous());
      this.salles.set(await this.salleService.listerTous());
      this.membres.set(await this.membreService.listerTous());
      this.seances.set(await this.seanceService.listerTous());

      const c = this.cours()[0];
      const s = this.salles()[0];
      if (c && s) {
        this.form.patchValue({ coursId: c.id, salleId: s.id });
      }
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur chargement');
    }
  }

  nomMembre(id: number): string {
    const m = this.membres().find((x) => x.id === id);
    return m ? `${m.prenom} ${m.nom}` : `#${id}`;
  }

  async surSoumission(): Promise<void> {
    if (this.form.invalid) return;
    try {
      const v = this.form.getRawValue();
      // datetime-local renvoie "2026-05-19T14:30" — on convertit en ISO pour Prisma.
      await this.seanceService.creer({
        dateHeure: new Date(v.dateHeure).toISOString(),
        coursId: v.coursId,
        salleId: v.salleId,
      });
      this.seances.set(await this.seanceService.listerTous());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur création');
    }
  }

  async surSuppression(id: number): Promise<void> {
    if (!confirm('Supprimer cette séance ? Ses inscriptions seront perdues (cascade).')) return;
    try {
      await this.seanceService.supprimer(id);
      this.seances.set(await this.seanceService.listerTous());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur suppression');
    }
  }

  async surInscription(seanceId: number, membreId: number): Promise<void> {
    if (!membreId) return;
    try {
      await this.inscriptionService.inscrire({ membreId, seanceId });
      this.seances.set(await this.seanceService.listerTous());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur inscription');
    }
  }

  async surTogglePresence(membreId: number, seanceId: number, event: Event): Promise<void> {
    const presence = (event.target as HTMLInputElement).checked;
    try {
      await this.inscriptionService.modifierPresence(membreId, seanceId, presence);
      this.seances.set(await this.seanceService.listerTous());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur présence');
    }
  }

  async surDesinscription(membreId: number, seanceId: number): Promise<void> {
    try {
      await this.inscriptionService.desinscrire(membreId, seanceId);
      this.seances.set(await this.seanceService.listerTous());
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur désinscription');
    }
  }
}
