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
    {
      path: 'tutor',
      runGuardsAndResolvers: 'always',
      children: [
        // ✅ Registro SIN RoleGuard (para que nunca lo bloquee el menú)
        {
          path: 'registro',
          loadComponent: () => import('./tutor/registro/tutor-registro.component').then(m => m.TutorRegistroComponent),
        },

        // 🔒 El resto con RoleGuard (menú)
        {
          path: 'dashboard',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/dashboard/tutor-dashboard.component').then(m => m.TutorDashboardComponent),
        },
        {
          path: 'ofertas',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/ofertas/ofertas-list.component').then(m => m.OfertasListComponent),
        },
        {
          path: 'ofertas/crear',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/ofertas/oferta-create.component').then(m => m.OfertaCreateComponent),
        },
        {
          path: 'ofertas/:id/postulaciones',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/postulaciones/oferta-postulaciones.component').then(m => m.OfertaPostulacionesComponent),
        },
        {
          path: 'invitaciones',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/invitaciones/invitaciones-tutor.component').then(m => m.InvitacionesTutorComponent),
        },
        {
          path: 'explorar-estudiantes',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/explorar/explorar-estudiantes.component').then(m => m.ExplorarEstudiantesComponent),
        },
        {
          path: 'explorar-estudiantes/:perfilId',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/explorar/explorar-detalle.component').then(m => m.ExplorarDetalleComponent),
        },

        { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
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
