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
      path: 'estudiante',
      children: [
        {
          path: 'ofertas',
          loadComponent: () => import('./estudiante/ofertas/ofertas-disponibles.component').then(m => m.OfertasDisponiblesComponent),
        },
        {
          path: 'ofertas/:id',
          loadComponent: () => import('./estudiante/ofertas/oferta-detalle-estudiante.component').then(m => m.OfertaDetalleEstudianteComponent),
        },
        {
          path: 'invitaciones',
          loadComponent: () => import('./estudiante/invitaciones/invitaciones-estudiante.component').then(m => m.InvitacionesEstudianteComponent),
        },
        {
          path: 'invitaciones/:id',
          loadComponent: () => import('./estudiante/invitaciones/invitacion-detalle-estudiante.component').then(m => m.InvitacionDetalleEstudianteComponent),
        },
        {
          path: 'postulaciones',
          loadComponent: () => import('./estudiante/postulaciones/mis-postulaciones.component').then(m => m.MisPostulacionesComponent),
        },
        {
          path: 'postulaciones/:id',
          loadComponent: () => import('./estudiante/postulaciones/postulacion-detalle-estudiante.component').then(m => m.PostulacionDetalleEstudianteComponent),
        },
        {
          path: 'actualizar-cv',
          loadComponent: () => import('./estudiante/perfil/actualizar-cv.component').then(m => m.ActualizarCvComponent),
        },
      ],
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
          //canActivate: [RoleGuard],
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
          path: 'ofertas/nueva',
          loadComponent: () => import('./tutor/ofertas/nueva/tutor-oferta-nueva.component').then(m => m.TutorOfertaNuevaComponent),
        },
        {
          path: 'ofertas/:id',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/ofertas/oferta-detalle/tutor-oferta-detalle.component').then(m => m.TutorOfertaDetalleComponent),
        },
        {
          path: 'ofertas/:id/postulaciones',
          canActivate: [NavGuard, RoleGuard],
          loadComponent: () => import('./tutor/postulaciones/oferta-postulaciones.component').then(m => m.OfertaPostulacionesComponent),
        },
        {
          path: 'invitaciones',
          
          loadComponent: () => import('./tutor/invitaciones/invitaciones-tutor.component').then(m => m.InvitacionesTutorComponent),
        },
        {
          path: 'invitaciones/:id',
          
          loadComponent: () => import('./tutor/invitaciones/invitacion-detalle-tutor.component').then(m => m.InvitacionDetalleTutorComponent),
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
