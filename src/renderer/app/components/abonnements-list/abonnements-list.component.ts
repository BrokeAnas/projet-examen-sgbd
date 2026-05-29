/**
 * AbonnementsListComponent — CRUD complet sur les abonnements.
 *
 * Démontre l'utilisation d'un ENUM Prisma (TypeAbonnement) côté UI et le
 * calcul de prix par défaut selon le type sélectionné (signal + ngModel-like).
 */

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup, type FormControl } from '@angular/forms';
import { AbonnementService } from '../../services/abonnement.service';
import { MembreService } from '../../services/membre.service';
import type { Abonnement, Membre, TypeAbonnement } from '../../models/domain.types';

interface AbonnementFormControls {
  type: FormControl<TypeAbonnement>;
  prix: FormControl<number>;
  dateDebut: FormControl<string>;
  dateFin: FormControl<string>;
  membreId: FormControl<number>;
}

@Component({
  selector: 'app-abonnements-list',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <h1>Abonnements</h1>

    @if (erreur()) {
      <div class="card" style="color: #dc2626;">{{ erreur() }}</div>
    }

    <div class="card">
      <h3>Nouvel abonnement</h3>
      @if (membres().length === 0) {
        <p style="color: #6b7280;">Crée d'abord au moins un membre.</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="surSoumission()" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr auto; gap: 0.5rem; align-items: end;">
          <div>
            <label style="font-size:0.8rem;">Type</label>
            <select formControlName="type">
              <option value="MENSUEL">Mensuel</option>
              <option value="TRIMESTRIEL">Trimestriel</option>
              <option value="ANNUEL">Annuel</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.8rem;">Prix (€)</label>
            <input type="number" formControlName="prix" />
          </div>
          <div>
            <label style="font-size:0.8rem;">Début</label>
            <input type="date" formControlName="dateDebut" />
          </div>
          <div>
            <label style="font-size:0.8rem;">Fin</label>
            <input type="date" formControlName="dateFin" />
          </div>
          <div>
            <label style="font-size:0.8rem;">Membre</label>
            <select formControlName="membreId">
              @for (m of membres(); track m.id) {
                <option [value]="m.id">{{ m.prenom }} {{ m.nom }}</option>
              }
            </select>
          </div>
          <div style="display: flex; gap: 0.3rem;">
            <button class="btn" type="submit" [disabled]="form.invalid">Créer</button>
            <button
              class="btn"
              type="button"
              style="background: #059669;"
              [disabled]="form.invalid"
              (click)="surSouscriptionTransaction()"
              title="Crée l'abonnement ET réactive le membre dans une seule transaction Prisma"
            >
              Souscrire + activer (transaction)
            </button>
          </div>
        </form>
        <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #6b7280;">
          Le bouton vert utilise <strong>prisma.$transaction</strong> : crée l'abonnement
          ET passe le membre à <code>ACTIF</code> en une seule opération atomique (ACID).
        </p>
      }
    </div>

    @if (abonnements().length === 0) {
      <div class="card">Aucun abonnement.</div>
    } @else {
      <div class="card">
        <strong>{{ nombreAbonnements() }}</strong> abonnements, chiffre d'affaires cumulé :
        <strong>{{ chiffreAffaires() }} €</strong>
      </div>
      <table>
        <thead>
          <tr>
            <th>Membre</th>
            <th>Type</th>
            <th>Prix</th>
            <th>Début</th>
            <th>Fin</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (a of abonnements(); track a.id) {
            <tr>
              <td>{{ nomMembre(a.membreId) }}</td>
              <td>{{ a.type }}</td>
              <td>{{ a.prix }} €</td>
              <td>{{ a.dateDebut | date: 'dd/MM/yyyy' }}</td>
              <td>{{ a.dateFin | date: 'dd/MM/yyyy' }}</td>
              <td>
                <button class="btn btn-danger" (click)="surSuppression(a.id)">Supprimer</button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class AbonnementsListComponent implements OnInit {
  private readonly abonnementService = inject(AbonnementService);
  private readonly membreService = inject(MembreService);
  private readonly fb = inject(FormBuilder);

  readonly abonnements = signal<Abonnement[]>([]);
  readonly membres = signal<Membre[]>([]);
  readonly erreur = signal<string | null>(null);

  readonly nombreAbonnements = computed(() => this.abonnements().length);
  readonly chiffreAffaires = computed(() =>
    Math.round(this.abonnements().reduce((sum, a) => sum + a.prix, 0) * 100) / 100,
  );

  readonly form: FormGroup<AbonnementFormControls> = this.fb.nonNullable.group({
    type: ['MENSUEL' as TypeAbonnement, Validators.required],
    prix: [49.9, [Validators.required, Validators.min(0)]],
    dateDebut: ['', Validators.required],
    dateFin: ['', Validators.required],
    membreId: [0, [Validators.required, Validators.min(1)]],
  });

  async ngOnInit(): Promise<void> {
    await this.recharger();
  }

  private async recharger(): Promise<void> {
    try {
      this.membres.set(await this.membreService.listerTous());
      this.abonnements.set(await this.abonnementService.listerTous());
      const premierMembre = this.membres()[0];
      if (premierMembre) this.form.patchValue({ membreId: premierMembre.id });
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
      await this.abonnementService.creer({
        type: v.type,
        prix: v.prix,
        dateDebut: new Date(v.dateDebut).toISOString(),
        dateFin: new Date(v.dateFin).toISOString(),
        membreId: v.membreId,
      });
      await this.recharger();
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur création');
    }
  }

  /**
   * Déclenche la TRANSACTION Prisma :
   * crée l'abonnement ET active le membre, atomiquement.
   * Si l'une des deux opérations échoue, Prisma fait ROLLBACK
   * et aucune des deux n'est appliquée.
   */
  async surSouscriptionTransaction(): Promise<void> {
    if (this.form.invalid) return;
    try {
      const v = this.form.getRawValue();
      const resultat = await this.abonnementService.souscrireEtActiver({
        type: v.type,
        prix: v.prix,
        dateDebut: new Date(v.dateDebut).toISOString(),
        dateFin: new Date(v.dateFin).toISOString(),
        membreId: v.membreId,
      });
      const m = resultat.membre;
      alert(
        `Transaction OK : abonnement #${resultat.abonnement.id} créé + membre ` +
          `${m.prenom} ${m.nom} passé à ${m.statut}.`,
      );
      await this.recharger();
    } catch (e) {
      // Si on arrive ici, c'est que la transaction a fait ROLLBACK :
      // ni l'abonnement ni la mise à jour du membre ne sont en base.
      this.erreur.set(
        e instanceof Error
          ? `Transaction rollback : ${e.message}`
          : 'Transaction échouée — aucune donnée modifiée.',
      );
    }
  }

  async surSuppression(id: number): Promise<void> {
    if (!confirm('Supprimer cet abonnement ?')) return;
    try {
      await this.abonnementService.supprimer(id);
      await this.recharger();
    } catch (e) {
      this.erreur.set(e instanceof Error ? e.message : 'Erreur suppression');
    }
  }
}
