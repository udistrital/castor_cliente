import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PagesComponent } from './pages.component';
import { NavGuard } from '../@core/components/guard/nav.guard';
import { RoleGuard } from '../@core/components/guard/role.guard';

const routes: Routes = [{
  path: '',
  component: PagesComponent,
  children: [
    {
      path: 'check',
      loadComponent: () => import('./check/check.component').then(m => m.CheckComponent),
    },
    {
      path: 'home',
      loadComponent: () => import('./estudiante/home-estudiante.component').then(m => m.HomeEstudianteComponent),
    },
    {
      path: 'registro',
      loadComponent: () => import('./estudiante/registro-estudiante.component').then(m => m.RegistroEstudianteComponent),
    },
    {
      path: 'dashboard',
      children: [
        {
          path: '',
          loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
        },
        {
          path: 'tutor',
          loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
        },
      ],
    },
/* Ejemplo ruta con guards
    {
      path: 'plantillas',
      component: PlantillasComponent,
      canActivate: [NavGuard, RoleGuard],
      runGuardsAndResolvers: 'always',
    },
*/
    {
      path: '', pathMatch: 'full', redirectTo: 'check',
    },
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
