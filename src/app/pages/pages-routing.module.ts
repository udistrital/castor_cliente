import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PagesComponent } from './pages.component';
import { NavGuard } from '../@core/components/guard/nav.guard';
import { RoleGuard } from '../@core/components/guard/role.guard';

const routes: Routes = [{
  path: '',
  component: PagesComponent,
  children: [
    {
      path: 'dashboard',
      component: DashboardComponent,
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
      path: '', redirectTo: 'dashboard', pathMatch: 'full',
    },
  ]
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
