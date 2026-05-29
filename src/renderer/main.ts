/**
 * BOOTSTRAP de l'application Angular.
 *
 * On utilise `bootstrapApplication` (API standalone, sans NgModule) avec :
 *  - provideRouter : pour activer le routing (différentes "pages")
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)],
}).catch((err) => console.error(err));
