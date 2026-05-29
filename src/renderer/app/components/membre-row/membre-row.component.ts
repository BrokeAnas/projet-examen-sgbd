/**
 * MembreRowComponent — composant ENFANT qui affiche une ligne de membre.
 *
 * Démontre :
 *  - input.required<T>() : reçoit un Membre obligatoire du parent
 *  - output<T>()         : émet des événements vers le parent (modifier/supprimer)
 *
 * C'est la NOUVELLE syntaxe des signaux Angular (≥ 17.3). Plus de @Input/@Output.
 */

import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { Membre } from '../../models/domain.types';

@Component({
  selector: 'app-membre-row',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <tr>
      <td>{{ membre().nom }}</td>
      <td>{{ membre().prenom }}</td>
      <td>{{ membre().email }}</td>
      <td>
        <span class="badge badge-{{ membre().statut }}">{{ membre().statut }}</span>
      </td>
      <td>{{ membre().dateInscription | date: 'dd/MM/yyyy' }}</td>
      <td style="display: flex; gap: 0.4rem;">
        <a class="btn btn-secondary" [routerLink]="['/membres', membre().id, 'modifier']">
          Modifier
        </a>
        <button class="btn btn-danger" (click)="onSupprimer()">Supprimer</button>
      </td>
    </tr>
  `,
})
export class MembreRowComponent {
  readonly membre = input.required<Membre>();
  readonly supprime = output<number>();

  onSupprimer(): void {
    this.supprime.emit(this.membre().id);
  }
}
