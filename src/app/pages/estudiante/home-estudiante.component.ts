import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';

import { GlobalLoadingOverlayComponent } from '../../@shared/components/global-loading-overlay.component';
import { TokenService } from '../../@core/services/auth/token.service';
import { LoadingService } from '../../@core/services/ui/loading.service';
import { EstudiantesService } from '../../@core/services/estudiantes.service';
import { UserContextService } from '../../@core/services/user-context.service';
import { PerfilEstudiante } from '../../@core/models/perfil.model';
import { AcademicService } from 'src/app/@core/services/academica/academic.service';

import { OfertasEstudianteService } from 'src/app/@core/services/ofertas-estudiante.service';
import { InvitacionesEstudianteService } from 'src/app/@core/services/invitaciones-estudiante.service';
import { DocumentosService } from 'src/app/@core/services/documentos.service';

import {
  EstudianteDashboardService,
  EstudianteDashboardResumen,
} from 'src/app/@core/services/estudiante-dashboard.service';

@Component({
  standalone: true,
  selector: 'app-home-estudiante',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    GlobalLoadingOverlayComponent,
  ],
  templateUrl: './home-estudiante.component.html',
  styleUrls: ['./home-estudiante.component.scss'],
})
export class HomeEstudianteComponent implements OnInit {
  perfil: PerfilEstudiante | null = null;

  kpiOfertas = 0;
  kpiInvitaciones = 0;
  kpiPostulaciones = 0;

  chipsPostulacionesPorEstado: Array<{ estado: string; total: number }> = [];

  pcNombre = '';
  codigoEstudiante = '';

  ctxNombre = '';
  ctxCodigo = '';
  ctxPcId = '';
  ctxPcNombre: string | null = null;

  constructor(
    private token: TokenService,
    private loading: LoadingService,
    private estudiantes: EstudiantesService,
    private userContext: UserContextService,
    private academica: AcademicService,
    private dashboardService: EstudianteDashboardService,
    private router: Router,
    private ofertasService: OfertasEstudianteService,
    private invitacionesService: InvitacionesEstudianteService,
    private docs: DocumentosService,
  ) {}

  ngOnInit(): void {
    this.bootstrapContext();
    this.loadPerfil();
    this.loadDashboard();
  }

  private async loadPerfil(): Promise<void> {
    try {
      const stored = this.readJson('castor_estudiante_ctx');
      const ctx = this.userContext.getEstudianteContext();
      const currentUser = this.token.currentUser as any;

      const terceroId =
        ctx?.tercero_id ??
        stored?.tercero_id ??
        currentUser?.rawTokenPayload?.tercero_id ??
        currentUser?.tercero_id ??
        null;

      const codigo =
        currentUser?.rawTokenPayload?.Codigo ??
        currentUser?.Codigo ??
        this.token.codigo ??
        ctx?.codigo ??
        null;

      this.codigoEstudiante = codigo ?? '';

      this.loading.show('Cargando tu perfil…');

      if (terceroId) {
        try {
          this.perfil = await firstValueFrom(this.estudiantes.getMiPerfil(terceroId));
        } catch (error: any) {
          const message = String(error?.message || '');
          if (message.includes('404')) {
            this.perfil = null;
          } else {
            throw error;
          }
        }
      }

      this.loading.hide();

      if (!this.perfil) return;

      const pcNombre =
        this.perfil?.proyecto_curricular_nombre ||
        (this.perfil as any)?.proyecto_curricular?.nombre ||
        (this.perfil?.proyecto_curricular_id
          ? `Proyecto curricular #${this.perfil.proyecto_curricular_id}`
          : 'Proyecto curricular sin especificar');

      this.pcNombre = pcNombre;
      this.ctxPcNombre = pcNombre;

    } catch (error) {
      console.error('[HOME ESTUDIANTE] Error cargando perfil', error);
      this.loading.hide();
      Swal.fire('Error', 'No pudimos cargar tu perfil. Intenta más tarde.', 'error');
    }
  }

  private async loadDashboard(): Promise<void> {
    try {
      const stored = this.readJson('castor_estudiante_ctx');
      const ctx = this.userContext.getEstudianteContext();
      const currentUser = this.token.currentUser as any;

      const terceroId =
        ctx?.tercero_id ??
        stored?.tercero_id ??
        currentUser?.rawTokenPayload?.tercero_id ??
        currentUser?.tercero_id ??
        null;

      const estudianteId = Number(terceroId);
      if (!Number.isFinite(estudianteId) || estudianteId <= 0) return;

      const dashboard = await firstValueFrom(this.dashboardService.getDashboard(estudianteId));
      const resumen: EstudianteDashboardResumen | undefined = dashboard?.resumen;

      const postulacionesPorEstado =
        resumen?.postulaciones_por_estado ?? (resumen as any)?.postulaciones;

      this.chipsPostulacionesPorEstado = this.normalizePostulacionesPorEstado(postulacionesPorEstado);

      this.kpiPostulaciones = this.chipsPostulacionesPorEstado.reduce(
        (acc, x) => acc + (x.total ?? 0),
        0,
      );

      // Ofertas (paginación 1, tamaño 1 para traer total)
      const ofertasResp = await firstValueFrom(
        this.ofertasService
          .getDisponibles(estudianteId, 1, 1)
          .pipe(catchError(() => of({ items: [], total: 0, page: 1, size: 1 }))),
      );
      this.kpiOfertas = ofertasResp.total;

      // Invitaciones (paginación 1, tamaño 1 para traer total)
      const invitResp = await firstValueFrom(
        this.invitacionesService
          .getBandeja(estudianteId, undefined, 1, 1)
          .pipe(catchError(() => of({ items: [], total: 0, page: 1, size: 1 }))),
      );
      this.kpiInvitaciones = invitResp.total;

    } catch (error) {
      console.warn('[HOME ESTUDIANTE] No se pudo cargar el dashboard', error);
    }
  }

  private bootstrapContext(): void {
    const ctx = this.readJson('castor_estudiante_ctx');
    this.ctxNombre = (ctx?.nombre || '').toString().trim();
    this.ctxCodigo = ctx?.codigo || this.token.codigo || '';
    this.ctxPcId = ctx?.carrera ? String(ctx.carrera) : '';

    if ((!this.ctxNombre || this.ctxNombre.includes('@')) && this.ctxCodigo) {
      this.academica
        .getDatosEstudiantePorCodigo(this.ctxCodigo)
        .pipe(
          take(1),
          catchError(() => of(null)),
        )
        .subscribe((data) => {
          const nombre = data?.Nombre?.trim();
          if (nombre) {
            this.ctxNombre = nombre;
            const currentCtx = this.readJson('castor_estudiante_ctx') || {};
            localStorage.setItem('castor_estudiante_ctx', JSON.stringify({ ...currentCtx, nombre }));
          }
        });
    }

    this.ctxPcNombre = null;
  }

  private readJson(key: string): any {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  // ✅ NUEVO: abrir PDF adjunto (Gestor Documental)
  async verPdfAdjunto(): Promise<void> {
    try {
      const docId = (this.perfil as any)?.cv_documento_id;
      if (!docId) {
        Swal.fire('Sin hoja de vida', 'Aún no tienes un PDF adjunto.', 'info');
        return;
      }
      this.loading.show('Abriendo PDF…');

      await firstValueFrom(
        this.docs.openPdfByDocumentoId(docId).pipe(
          catchError((e) => {
            console.error('[CV] Error abriendo PDF', e);
            return of(void 0);
          }),
        ),
      );

      this.loading.hide();
    } catch (e) {
      console.error('[CV] Error general abriendo PDF', e);
      this.loading.hide();
      Swal.fire('Error', 'No fue posible abrir el PDF.', 'error');
    }
  }

  goToOfertas(): void {
    this.router.navigateByUrl('/pages/estudiante/ofertas');
  }

  goToInvitaciones(): void {
    this.router.navigateByUrl('/pages/estudiante/invitaciones');
  }

  goToPostulaciones(): void {
    this.router.navigateByUrl('/pages/estudiante/postulaciones');
  }

  goToActualizarCv(): void {
    this.router.navigateByUrl('/pages/estudiante/actualizar-cv');
  }

  get habilidadesList(): string[] {
    const h: any = this.perfil?.habilidades;
    if (!h) return [];

    const list = Array.isArray(h) ? h : String(h).split(',');
    return list
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0);
  }

  private normalizePostulacionesPorEstado(
    value: EstudianteDashboardResumen['postulaciones_por_estado'],
  ): Array<{ estado: string; total: number }> {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .map((item) => ({
          estado: String(item?.estado ?? ''),
          total: Number(item?.total ?? 0),
        }))
        .filter((item) => item.estado);
    }

    return Object.entries(value)
      .map(([estado, total]) => ({ estado, total: Number(total ?? 0) }))
      .filter((item) => item.estado);
  }
}
