/**
 * Composant racine — shell de l'application (barre de nav + router-outlet).
 *
 * Standalone : pas de NgModule, on importe directement les directives dans
 * le tableau `imports` du décorateur.
 */

import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// Important : on importe les types globaux pour activer le typage de window.api.
import './models/api.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="main-nav">
      <span class="brand">GymManager</span>
      <a routerLink="/membres" routerLinkActive="active">Membres</a>
      <a routerLink="/cours" routerLinkActive="active">Cours</a>
      <a routerLink="/coachs" routerLinkActive="active">Coachs</a>
      <a routerLink="/salles" routerLinkActive="active">Salles</a>
      <a routerLink="/seances" routerLinkActive="active">Séances</a>
      <a routerLink="/abonnements" routerLinkActive="active">Abonnements</a>
      <a routerLink="/statistiques" routerLinkActive="active">Statistiques</a>
    </nav>

    <main class="container">
      <router-outlet />
    </main>
  `,
})
export class AppComponent {}
