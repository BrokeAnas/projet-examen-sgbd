/**
 * Configuration des routes de l'application.
 *
 * On utilise le LAZY LOADING via `loadComponent` : chaque composant n'est
 * chargé QUE quand l'utilisateur visite sa route. Avantage : bundle initial
 * plus léger.
 */

import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'membres', pathMatch: 'full' },

  {
    path: 'membres',
    loadComponent: () =>
      import('./components/membres-list/membres-list.component').then((m) => m.MembresListComponent),
  },
  {
    path: 'membres/nouveau',
    loadComponent: () =>
      import('./components/membre-form/membre-form.component').then((m) => m.MembreFormComponent),
  },
  {
    path: 'membres/:id/modifier',
    loadComponent: () =>
      import('./components/membre-form/membre-form.component').then((m) => m.MembreFormComponent),
  },
  {
    path: 'cours',
    loadComponent: () =>
      import('./components/cours-list/cours-list.component').then((m) => m.CoursListComponent),
  },
  {
    path: 'coachs',
    loadComponent: () =>
      import('./components/coachs-list/coachs-list.component').then((m) => m.CoachsListComponent),
  },
  {
    path: 'salles',
    loadComponent: () =>
      import('./components/salles-list/salles-list.component').then((m) => m.SallesListComponent),
  },
  {
    path: 'seances',
    loadComponent: () =>
      import('./components/seances-list/seances-list.component').then((m) => m.SeancesListComponent),
  },
  {
    path: 'abonnements',
    loadComponent: () =>
      import('./components/abonnements-list/abonnements-list.component').then((m) => m.AbonnementsListComponent),
  },
  {
    path: 'statistiques',
    loadComponent: () =>
      import('./components/statistiques/statistiques.component').then((m) => m.StatistiquesComponent),
  },

  { path: '**', redirectTo: 'membres' },
];
