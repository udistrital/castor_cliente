import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GlobalLoadingOverlayComponent } from '../../@shared/components/global-loading-overlay.component';
import { TokenService } from '../../@core/services/auth/token.service';
import { LoadingService } from '../../@core/services/ui/loading.service';
import { EstudiantesService } from '../../@core/services/estudiantes.service';
import { UserContextService } from '../../@core/services/user-context.service';
import { PerfilEstudiante } from '../../@core/models/perfil.model';
import { AcademicService } from 'src/app/@core/services/academica/academic.service';
import { AlertService } from 'src/app/@core/services/ui/alert.service';

import { OfertasEstudianteService, OfertaDisponibleItem } from 'src/app/@core/services/ofertas-estudiante.service';
import { InvitacionesEstudianteService, InvitacionEstudianteItem } from 'src/app/@core/services/invitaciones-estudiante.service';
import { DocumentosService } from 'src/app/@core/services/documentos.service';

import {
  EstudianteDashboardService,
  EstudianteDashboardResumen,
  EstudianteDashboard,
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
    MatSlideToggleModule,
    MatTooltipModule,
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

  // ✅ NUEVO: Secciones Home
  invitacionesRecientes: InvitacionEstudianteItem[] = [];
  ofertasRecomendadas: any[] = []; // vienen como unknown[] en EstudianteDashboard
  kpiVisitasPerfil = 0;
  kpiVisitasHoy = 0;
  visitasPerfilRecientes: any[] = [];
  pasanteActivo = false;
  pasantiaActiva: any | null = null;
  perfilVisible: boolean | null = null;

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
    // Use AlertService wrapper to avoid Swal runtime errors.
    private alert: AlertService,
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

      if (this.perfil) {
        this.perfilVisible = !!this.perfil.visible;
      }

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
      this.alert.fire('Error', 'No pudimos cargar tu perfil. Intenta más tarde.', 'error');
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

      // 1) Dashboard MID
      const dashboard: EstudianteDashboard | null = await firstValueFrom(
        this.dashboardService.getDashboard(estudianteId).pipe(catchError(() => of(null))),
      );

      const resumen: EstudianteDashboardResumen | undefined = dashboard?.resumen;
      this.pasanteActivo = Boolean((resumen as any)?.pasante_activo);
      this.pasantiaActiva = (resumen as any)?.pasantia_activa ?? null;
      if (this.perfilVisible == null) {
        this.perfilVisible = (resumen as any)?.perfil_visible ?? null;
      }

      // Postulaciones por estado (chips)
      const postulacionesPorEstado =
        resumen?.postulaciones_por_estado ?? (resumen as any)?.postulaciones;

      this.chipsPostulacionesPorEstado = this.normalizePostulacionesPorEstado(postulacionesPorEstado);

      // KPI postulaciones: suma de chips
      this.kpiPostulaciones = this.chipsPostulacionesPorEstado.reduce(
        (acc, x) => acc + (x.total ?? 0),
        0,
      );

      // 2) KPI + Sección Invitaciones recientes (pedimos size=5)
      const invitResp = await firstValueFrom(
        this.invitacionesService
          .getBandeja(estudianteId, undefined, 1, 5)
          .pipe(catchError(() => of({ items: [], total: 0, page: 1, size: 5 }))),
      );
      this.kpiInvitaciones = invitResp.total;
      this.invitacionesRecientes = Array.isArray(invitResp.items) ? invitResp.items.slice(0, 5) : [];

      // 3) KPI ofertas (para count) + fallback visual si quieres
      const ofertasResp = await firstValueFrom(
        this.ofertasService
          .getDisponibles(estudianteId, 1, 1) // solo count
          .pipe(catchError(() => of({ items: [], total: 0, page: 1, size: 1 }))),
      );
      this.kpiOfertas = ofertasResp.total;

      // 4) Ofertas recomendadas (vienen en dashboard, según tu interface)
      this.ofertasRecomendadas = Array.isArray(dashboard?.ofertas_recomendadas)
        ? (dashboard?.ofertas_recomendadas ?? [])
            .map((x: any) => ({
              ...x,
              id: x?.id ?? x?.Id ?? x?.oferta_id ?? x?.ofertaId ?? null,
            }))
            .slice(0, 5)
        : [];

      // 5) Quién ha visto tu perfil
      const visitasRaw =
        (resumen as any)?.visitas_perfil ??
        (dashboard as any)?.visitas_perfil ??
        null;

      // reset seguro
      this.kpiVisitasPerfil = 0;
      this.kpiVisitasHoy = 0;
      this.visitasPerfilRecientes = [];

      if (typeof visitasRaw === 'number') {
        // legado (solo total)
        this.kpiVisitasPerfil = visitasRaw;
      } else if (Array.isArray(visitasRaw)) {
        // legado (lista simple)
        this.kpiVisitasPerfil = visitasRaw.length;
        this.visitasPerfilRecientes = visitasRaw.slice(0, 5);
      } else if (visitasRaw && typeof visitasRaw === 'object') {
        const total = Number((visitasRaw as any)?.total ?? 0);
        const hoy = Number((visitasRaw as any)?.hoy ?? 0);
        const items = (visitasRaw as any)?.items ?? [];

        this.kpiVisitasPerfil = Number.isFinite(total) ? total : 0;
        this.kpiVisitasHoy = Number.isFinite(hoy) ? hoy : 0;

        // Normalizamos keys para que el template funcione:
        // template espera: tutor_id, total, ultima_visita, empresa
        const normalized = Array.isArray(items)
  ? items.map((it: any) => {
      const tutorId =
        it?.tutor_id ?? it?.TutorID ?? it?.TutorId ?? it?.tutorId ?? null;

      const nombre =
        (it?.nombre ?? it?.Nombre ?? it?.NombreCompleto ?? it?.nombre_completo ?? '')
          .toString()
          .trim();

      const empresa =
        (it?.empresa ?? it?.Empresa ?? '')
          .toString()
          .trim();

      const ultima =
        it?.ultima_visita ?? it?.UltimaVisita ?? it?.ultimaVisita ?? null;

      return {
        // ✅ para el template
        tercero_id: tutorId,          // <- para que el fallback sea correcto
        nombre: nombre || null,       // <- esto hará que ya no muestre el ID
        empresa: empresa || null,

        // ✅ lo que ya tenías / necesitas
        tutor_id: tutorId,
        total: Number(it?.total ?? it?.Total ?? 0),
        ultima_visita: ultima,

        // ✅ opcional: tu template usa displayFecha(v.fecha)
        fecha: it?.fecha ?? ultima,
      };
    })
  : [];

        // Ordenar por última visita desc (por si acaso)
        normalized.sort((a: any, b: any) => {
          const ta = a?.ultima_visita ? new Date(a.ultima_visita).getTime() : 0;
          const tb = b?.ultima_visita ? new Date(b.ultima_visita).getTime() : 0;
          return tb - ta;
        });

        this.visitasPerfilRecientes = normalized.slice(0, 5);
}


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

  // ✅ abrir PDF adjunto (Gestor Documental)
  async verPdfAdjunto(): Promise<void> {
    try {
      const docId = (this.perfil as any)?.cv_documento_id;
      if (!docId) {
        this.alert.fire('Sin hoja de vida', 'Aún no tienes un PDF adjunto.', 'info');
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
      this.alert.fire('Error', 'No fue posible abrir el PDF.', 'error');
    }
  }

  goToOfertas(): void {
    this.router.navigateByUrl('/pages/estudiante/ofertas');
  }

  goToInvitaciones(): void {
  const stored = this.readJson('castor_estudiante_ctx');
  const ctx = this.userContext.getEstudianteContext();
  const currentUser = this.token.currentUser as any;

  const terceroId =
    ctx?.tercero_id ??
    stored?.tercero_id ??
    currentUser?.rawTokenPayload?.tercero_id ??
    currentUser?.tercero_id ??
    null;

  const id = Number(terceroId);
  if (!Number.isFinite(id) || id <= 0) {
    this.alert.fire('Error', 'No fue posible identificar tu usuario.', 'error');
    return;
  }

  this.router.navigate(['/pages/estudiante/invitaciones'], {
    queryParams: { tercero_id: id },
  });
}


  goToPostulaciones(): void {
    this.router.navigateByUrl('/pages/estudiante/postulaciones');
  }

  goToInvitacionDetalle(id?: number): void {
    if (!id) return;
    this.router.navigate(['/pages/estudiante/invitaciones', id]);
  }

  goToOfertaDetalle(id?: number): void {
    if (!id) return;
    this.router.navigate(['/pages/estudiante/ofertas', id]);
  }

  goToPostulacionDetalle(id?: number): void {
    if (!id) return;
    this.router.navigate(['/pages/estudiante/postulaciones', id]);
  }

  goToActualizarCv(): void {
    this.router.navigateByUrl('/pages/estudiante/actualizar-cv');
  }

  async onToggleVisibilidad(next: boolean): Promise<void> {
    if (this.pasanteActivo) return;

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
    if (!Number.isFinite(estudianteId) || estudianteId <= 0) {
      this.alert.fire('Error', 'No fue posible identificar tu usuario.', 'error');
      return;
    }

    const prev = this.perfilVisible;

    // Optimistic UI
    this.perfilVisible = next;

    try {
      this.loading.show('Actualizando visibilidad…');

      await firstValueFrom(this.estudiantes.putVisibilidad(estudianteId, next));

      // Refrescar datos
      await this.loadDashboard();
      await this.loadPerfil();

      this.alert.fire({
        icon: 'success',
        title: 'Listo',
        text: next
          ? 'Tu perfil ahora es visible para tutores.'
          : 'Tu perfil ahora está oculto para tutores.',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e: any) {
      console.error('[VISIBILIDAD] Error actualizando', e);

      // 409: ya tiene pasantía activa
      if (e?.status === 409) {
        this.perfilVisible = prev;
        this.alert.fire(
          'No permitido',
          'No puedes cambiar la visibilidad mientras tengas una pasantía activa.',
          'warning',
        );
        await this.loadDashboard();
        return;
      }

      // Revertir UI
      this.perfilVisible = prev;
      this.alert.fire('Error', 'No pudimos actualizar la visibilidad. Intenta más tarde.', 'error');
    } finally {
      this.loading.hide();
    }
  }

  get habilidadesList(): string[] {
    const h: any = this.perfil?.habilidades;
    if (!h) return [];

    const list = Array.isArray(h) ? h : String(h).split(',');
    return list
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0);
  }

  // ✅ Helpers para mostrar textos bonitos sin romper
  displayFecha(raw: any): string {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return String(raw);
      return d.toLocaleString();
    } catch {
      return String(raw);
    }
  }

  displayOfertaTitulo(x: any): string {
    return String(x?.titulo ?? x?.titulo_oferta ?? 'Oferta');
  }

  getInvitacionEstadoNombre(inv: any): string {
    const detNombre =
      inv?.estado_det?.nombre ||
      inv?.EstadoDet?.Nombre ||
      inv?.estadoDet?.nombre ||
      null;

    if (detNombre && String(detNombre).trim()) {
      return String(detNombre).trim();
    }

    const raw = String(inv?.estado_raw ?? inv?.estado ?? inv?.Estado ?? '').toUpperCase().trim();
    const map: Record<string, string> = {
      INV_ENV_CTR: 'Enviada',
      INV_ACE_CTR: 'Aceptada',
      INV_REC_CTR: 'Rechazada',
      INV_EXP_CTR: 'Expirada',
      INV_CAN_CTR: 'Cancelada',
      ENVIADA: 'Enviada',
      ACEPTADA: 'Aceptada',
      RECHAZADA: 'Rechazada',
      EXPIRADA: 'Expirada',
      CANCELADA: 'Cancelada',
    };
    return map[raw] ?? raw;
  }

  private normalizePostulacionesPorEstado(
    value: EstudianteDashboardResumen['postulaciones_por_estado'],
  ): Array<{ estado: string; total: number }> {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .map((item) => ({
          estado: String((item as any)?.estado ?? ''),
          total: Number((item as any)?.total ?? 0),
        }))
        .filter((item) => item.estado);
    }

    return Object.entries(value as Record<string, any>)
      .map(([estado, total]) => ({ estado, total: Number(total ?? 0) }))
      .filter((item) => item.estado);
  }
}
