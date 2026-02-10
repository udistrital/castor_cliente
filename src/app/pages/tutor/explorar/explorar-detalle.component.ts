import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';

import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { TutorContextService } from 'src/app/@core/services/tutor/tutor-context.service';
import { TutorExplorarService } from 'src/app/@core/services/tutor/tutor-explorar.service';
import { TutorInvitacionesService } from 'src/app/@core/services/tutor/tutor-invitaciones.service';
import { TutorOfertasService } from 'src/app/@core/services/tutor/tutor-ofertas.service';
import { TutorPostulacionesService } from 'src/app/@core/services/tutor/tutor-postulaciones.service';

import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DocumentosService } from 'src/app/@core/services/documentos.service';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';

@Component({
  selector: 'app-explorar-detalle',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './explorar-detalle.component.html',
  styleUrls: ['./explorar-detalle.component.scss'],
})
export class ExplorarDetalleComponent implements OnInit {
  // ID crudo desde la ruta
  routeId: number | null = null;
  // Tercero real para /estudiantes/perfil
  terceroId: number | null = null;
  // PerfilId cuando viene desde explorar
  perfilIdExplorar: number | null = null;

  tutorId: number | null = null;

  // ESTE es el que necesitamos para visitas/bookmarks
  perfilId: number | null = null;

  loading = false;
  perfil: any | null = null;
  bookmark = false;

  ofertasTutor: any[] = [];
  ofertaSeleccionada: number | null = null;
  mensaje = '';

  // MODO
  from: 'postulaciones' | 'explorar' | 'invitaciones' = 'explorar';
  fromInvitaciones = false;
  canInvitar = true;
  ofertaIdFrom: number | null = null;
  postulacionIdFrom: number | null = null;

  // Contexto Postulación (estado y botones)
  postulacionLoading = false;
  postulacionCtx: any | null = null;

  // ✅ Detalle de oferta (para saber si permite gestionar postulaciones)
  ofertaDetalle: any | null = null;
  ofertaLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,

    private tutorContext: TutorContextService,
    private explorarService: TutorExplorarService,
    private invitacionesService: TutorInvitacionesService,
    private ofertasService: TutorOfertasService,
    private tutorPostulaciones: TutorPostulacionesService,

    private alert: AlertService,
    private docs: DocumentosService,
    private loadingSvc: LoadingService,
  ) {
    const raw = this.route.snapshot.paramMap.get('perfilId');
    const parsed = raw ? Number(raw) : NaN;
    this.routeId = Number.isFinite(parsed as number) ? (parsed as number) : null;
  }

  ngOnInit(): void {
    // leer query params
    const qp = this.route.snapshot.queryParamMap;
    const fromRaw = String(qp.get('from') || '').toLowerCase();
    if (fromRaw === 'postulaciones') {
      this.from = 'postulaciones';
    } else if (fromRaw === 'invitaciones') {
      this.from = 'invitaciones';
    } else {
      this.from = 'explorar';
    }
    this.fromInvitaciones = fromRaw === 'invitaciones';
    this.canInvitar = !this.fromInvitaciones && this.from !== 'postulaciones';

    if (this.from === 'explorar' || this.from === 'invitaciones') {
      const terceroRaw = qp.get('tercero_id');
      const terceroNum = terceroRaw ? Number(terceroRaw) : NaN;
      this.terceroId = Number.isFinite(terceroNum) && terceroNum > 0 ? terceroNum : null;
    }

    const ofertaId = Number(qp.get('oferta_id'));
    this.ofertaIdFrom = Number.isFinite(ofertaId) && ofertaId > 0 ? ofertaId : null;

    const postId = Number(qp.get('postulacion_id'));
    this.postulacionIdFrom = Number.isFinite(postId) && postId > 0 ? postId : null;

    this.tutorContext.ensureLoaded().subscribe((ctx) => {
      this.tutorId = ctx?.tutor_id ?? null;

      if (!this.tutorId || !this.routeId) {
        this.alert.error('Error', 'No pudimos cargar el perfil.');
        return;
      }

      if (this.from === 'explorar' || this.from === 'invitaciones') {
        if (this.terceroId) {
          this.loadDetalle(this.terceroId, this.tutorId as number);
          if (this.canInvitar) {
            this.loadOfertasTutor(this.tutorId as number);
          }
          return;
        }

        this.perfilIdExplorar = this.routeId;
        this.explorarService.detallePerfil(this.perfilIdExplorar, this.tutorId).subscribe({
          next: (resp) => {
            const terceroId =
              resp?.tercero_id ??
              resp?.TerceroId ??
              resp?.terceroId ??
              null;
            if (!terceroId) {
              this.alert.error('Error', 'No pudimos resolver el tercero del perfil.');
              return;
            }
            this.terceroId = Number(terceroId);
            this.loadDetalle(this.terceroId, this.tutorId as number);
            if (this.canInvitar) {
              this.loadOfertasTutor(this.tutorId as number);
            }
          },
          error: (err) => {
            console.warn('[TUTOR] Error detalle perfil', err);
            this.alert.error('Error', 'No pudimos cargar el perfil.');
          },
        });
        return;
      }

      // modo postulaciones: routeId es tercero_id
      this.terceroId = this.routeId;
      this.loadDetalle(this.terceroId, this.tutorId);

      if (this.ofertaIdFrom) {
        void this.loadOfertaDetalle(this.ofertaIdFrom);
        void this.loadPostulacionCtx(this.ofertaIdFrom, this.tutorId);
      }
    });
  }

  // ------------------------
  // Navegación (como postulaciones)
  // ------------------------

  volverOrigen(): void {
    if (this.from === 'postulaciones') {
      if (this.ofertaIdFrom) {
        this.router.navigate(['/pages/tutor/ofertas', this.ofertaIdFrom]);
        return;
      }
      this.location.back();
      return;
    }

    this.volver();
  }

  volver(): void {
    if (this.fromInvitaciones) {
      const tutorId = this.route.snapshot.queryParamMap.get('tutor_id');
      this.router.navigate(['/pages/tutor/invitaciones'], {
        queryParams: tutorId ? { tutor_id: tutorId } : undefined,
        queryParamsHandling: tutorId ? undefined : 'preserve',
      });
      return;
    }

    this.router.navigate(['/pages/tutor/explorar-estudiantes'], { queryParamsHandling: 'preserve' });
  }

  goDashboard(): void {
    this.router.navigateByUrl('/pages/tutor/dashboard');
  }

  // ------------------------
  // Bookmark (solo explorar)
  // ------------------------

  toggleBookmark(): void {
    if (this.from === 'postulaciones') return;

    if (!this.tutorId || !this.perfilId) {
      this.alert.error('Error', 'Aún no tenemos el perfil_id para guardar bookmark.');
      return;
    }

    const call$ = this.bookmark
      ? this.explorarService.removeBookmark(this.perfilId, this.tutorId)
      : this.explorarService.addBookmark(this.perfilId, this.tutorId);

    call$.subscribe({
      next: () => {
        this.bookmark = !this.bookmark;
        this.alert.info('Listo', this.bookmark ? 'Bookmark agregado.' : 'Bookmark eliminado.');
      },
      error: (err) => {
        console.warn('[TUTOR] Error bookmark', err);
        this.alert.error('Error', 'No pudimos actualizar el bookmark.');
      },
    });
  }

  // ------------------------
  // Invitación (solo explorar)
  // ------------------------

  enviarInvitacion(): void {
    if (!this.canInvitar) return;

    if (!this.tutorId || !this.perfilId) return;

    const payload = {
      oferta_pasantia_id: this.ofertaSeleccionada ?? null,
      mensaje: this.mensaje?.trim() || null,
    };

    this.invitacionesService.enviarInvitacion(this.tutorId, this.perfilId, payload).subscribe({
      next: (resp) => {
        const status = Number((resp as any)?.Status ?? (resp as any)?.status ?? NaN);
        const ok =
          (resp as any)?.Success === true ||
          status === 200 ||
          status === 201;

        if (!ok) {
          this.alert.error('Error', 'No pudimos enviar la invitación.');
          return;
        }

        this.alert.success('Listo', 'Invitación enviada.');
        this.mensaje = '';
        this.ofertaSeleccionada = null;
        this.router.navigateByUrl('/pages/tutor/dashboard');
      },
      error: (err) => {
        console.warn('[TUTOR] Error enviando invitación', err);
        this.alert.error('Error', 'No pudimos enviar la invitación.');
      },
    });
  }

  // ------------------------
  // UI helpers
  // ------------------------

  getNombre(): string {
    return String(
      this.perfil?.NombreCompleto ??
        this.perfil?.nombre_completo ??
        this.perfil?.nombreCompleto ??
        this.perfil?.nombre ??
        this.perfil?.tercero_nombre ??
        'Estudiante',
    ).trim();
  }

  getCarrera(): string {
    const pcAny: any = (this.perfil as any)?.proyecto_curricular;

    const nombre =
      (this.perfil as any)?.proyecto_curricular_nombre ||
      (typeof pcAny === 'string' ? pcAny : null) ||
      pcAny?.nombre ||
      pcAny?.Nombre ||
      '';

    if (String(nombre).trim()) return String(nombre).trim();

    const pcId = Number(
      (this.perfil as any)?.proyecto_curricular_id ??
      (this.perfil as any)?.proyectocurricularid ??
      pcAny?.id ??
      0
    );
    return Number.isFinite(pcId) && pcId > 0 ? `Proyecto curricular #${pcId}` : '-';
  }

  getHabilidades(): string {
    const hab = this.perfil?.habilidades ?? this.perfil?.skills ?? [];
    return Array.isArray(hab) ? hab.join(', ') : String(hab || '-');
  }

  getResumen(): string {
    const r = this.perfil?.resumen ?? this.perfil?.Resumen ?? '';
    return String(r || '—').trim() || '—';
  }

  // ------------------------
  // Estado Postulación (modo postulaciones)
  // ------------------------

  private getPostulacionEstadoCodigo(postulacion: any): string {
    return String(
      postulacion?.Estado?.code ||
        postulacion?.Estado?.Code ||
        postulacion?.estado_det?.code ||
        postulacion?.estado_det?.Code ||
        postulacion?.estado_postulacion ||
        postulacion?.EstadoPostulacion ||
        postulacion?.estado ||
        postulacion?.Estado ||
        '',
    )
      .trim()
      .toUpperCase();
  }

  getEstadoPostulacionLabel(): string {
    const p = this.postulacionCtx;

    const label = String(
      p?.Estado?.nombre ||
        p?.Estado?.Nombre ||
        p?.estado_det?.nombre ||
        p?.estado_det?.Nombre ||
        p?.estado_nombre ||
        p?.EstadoNombre ||
        '',
    ).trim();

    const code = this.getPostulacionEstadoCodigo(p);
    return (label || code || '—').trim() || '—';
  }

  getEstadoPostulacionCode(): string {
    return this.getPostulacionEstadoCodigo(this.postulacionCtx);
  }

  // ✅ Chip class según estado
  getEstadoChipClass(): string {
    const code = this.getPostulacionEstadoCodigo(this.postulacionCtx).toUpperCase();
    switch (code) {
      case 'PSPO_CTR':
        return 'chip-pspo';
      case 'PSRV_CTR':
        return 'chip-psrv';
      case 'PSPR_CTR':
        return 'chip-pspr';
      case 'PSSL_CTR':
        return 'chip-pssl';
      case 'PSRJ_CTR':
        return 'chip-psrj';
      default:
        return 'chip-default';
    }
  }

  // ------------------------
  // Estado Oferta / gestión postulaciones (idéntico a oferta-postulaciones)
  // ------------------------

  private getOfertaEstadoCodigo(): string {
    const o: any = this.ofertaDetalle;
    const code = String(
      o?.Estado?.code ||
        o?.Estado?.Code ||
        o?.estado?.code ||
        o?.estado?.Code ||
        o?.estado ||
        o?.Estado ||
        '',
    )
      .trim()
      .toUpperCase();

    return code;
  }

  canGestionarPostulacion(): boolean {
    // Solo cuando la oferta está Abierta/Creada
    const code = this.getOfertaEstadoCodigo();
    return code === 'OPC_CTR';
  }

  private isDescartado(postulacion: any): boolean {
    return this.getPostulacionEstadoCodigo(postulacion) === 'PSRJ_CTR';
  }

  canPreseleccionar(): boolean {
    const p = this.postulacionCtx;
    if (!p) return false;

    if (!this.canGestionarPostulacion()) return false;
    if (this.isDescartado(p)) return false;

    const code = this.getPostulacionEstadoCodigo(p);

    // Regla: si está Postulada (PSPO_CTR), NO permitir acciones
    if (code === 'PSPO_CTR') return false;

    // Preseleccionar permitido desde revisión
    return code === 'PSRV_CTR';
  }

  canSeleccionar(): boolean {
    const p = this.postulacionCtx;
    if (!p) return false;

    if (!this.canGestionarPostulacion()) return false;
    if (this.isDescartado(p)) return false;

    const code = this.getPostulacionEstadoCodigo(p);

    // Regla: si está Postulada (PSPO_CTR), NO permitir acciones
    if (code === 'PSPO_CTR') return false;

    // Seleccionar permitido desde revisión o preseleccionada
    return code === 'PSRV_CTR' || code === 'PSPR_CTR';
  }

  canDescartar(): boolean {
    const p = this.postulacionCtx;
    if (!p) return false;

    if (!this.canGestionarPostulacion()) return false;
    if (this.isDescartado(p)) return false;

    const code = this.getPostulacionEstadoCodigo(p);

    // Regla: si está Postulada (PSPO_CTR), NO permitir descartar
    if (code === 'PSPO_CTR') return false;

    return true;
  }

  getTooltipAccion(accion: 'PRESELECCIONAR' | 'SELECCIONAR' | 'DESCARTAR'): string {
    // 1) Oferta no permite gestión
    if (!this.canGestionarPostulacion()) {
      return 'La oferta no permite gestionar postulaciones en este estado.';
    }

    const code = this.getPostulacionEstadoCodigo(this.postulacionCtx).toUpperCase();

    // 2) Caso PSPO
    if (code === 'PSPO_CTR') {
      return 'Primero abre el perfil para marcar la postulación como revisada.';
    }

    // 3) Caso descartada
    if (this.isDescartado(this.postulacionCtx)) {
      return 'La postulación está descartada.';
    }

    // 4) Tooltip específico por acción si está bloqueada por reglas
    if (accion === 'DESCARTAR' && !this.canDescartar()) return 'Acción no disponible.';
    if (accion === 'PRESELECCIONAR' && !this.canPreseleccionar()) return 'Acción no disponible.';
    if (accion === 'SELECCIONAR' && !this.canSeleccionar()) return 'Acción no disponible.';

    return '';
  }

  async preseleccionar(): Promise<void> {
    if (!this.tutorId) return;
    const postulacionId = Number(this.postulacionCtx?.id ?? this.postulacionCtx?.postulacion_id);
    if (!Number.isFinite(postulacionId) || postulacionId <= 0) return;

    await this.aplicarAccionPostulacion(postulacionId, 'PRESELECCIONAR');
  }

  async seleccionar(): Promise<void> {
    if (!this.tutorId) return;
    const postulacionId = Number(this.postulacionCtx?.id ?? this.postulacionCtx?.postulacion_id);
    if (!Number.isFinite(postulacionId) || postulacionId <= 0) return;

    await this.aplicarAccionPostulacion(postulacionId, 'SELECCIONAR');
  }

  async descartar(): Promise<void> {
    if (!this.tutorId) return;
    const postulacionId = Number(this.postulacionCtx?.id ?? this.postulacionCtx?.postulacion_id);
    if (!Number.isFinite(postulacionId) || postulacionId <= 0) return;

    await this.aplicarAccionPostulacion(postulacionId, 'DESCARTAR');
  }

  private async aplicarAccionPostulacion(postulacionId: number, accion: string): Promise<void> {
    try {
      await firstValueFrom(
        this.tutorPostulaciones.accionPostulacion(postulacionId, this.tutorId as number, accion as any),
      );

      // ✅ Recargar estado REAL post-acción
      if (this.ofertaIdFrom) {
        await this.loadPostulacionCtx(this.ofertaIdFrom, this.tutorId as number);
      }
    } catch (e) {
      console.warn('[ExplorarDetalle] accion postulacion error', e);
      this.alert.error('Error', 'No pudimos aplicar la acción.');
    }
  }

  // ------------------------
  // Data loaders
  // ------------------------

  private loadDetalle(terceroId: number, tutorId: number): void {
    this.loading = true;

    const call$ = this.from === 'explorar'
      ? this.explorarService.detalleEstudiantePublico(terceroId)
      : this.explorarService.detalleEstudiante(terceroId, tutorId);

    call$.subscribe({
      next: (resp) => {
        this.perfil = this.normalizePerfilResponse(resp);

        // ✅ Normalizar Proyecto Curricular
        if (this.perfil) {
          const pcAny: any = (this.perfil as any)?.proyecto_curricular;

          const pcNombre =
            (this.perfil as any)?.proyecto_curricular_nombre ||
            (typeof pcAny === 'string' ? pcAny : null) ||
            pcAny?.nombre ||
            pcAny?.Nombre ||
            null;

          if (pcNombre && String(pcNombre).trim()) {
            (this.perfil as any).proyecto_curricular_nombre = String(pcNombre).trim();
          } else {
            const pcId = Number((this.perfil as any)?.proyecto_curricular_id ?? pcAny?.id ?? 0);
            (this.perfil as any).proyecto_curricular_nombre =
              Number.isFinite(pcId) && pcId > 0 ? `Proyecto curricular #${pcId}` : '';
          }
        }

        // perfilId para visitas/bookmarks
        const pid = Number(
          (this.perfil as any)?.id ?? (this.perfil as any)?.perfil_id ?? (this.perfil as any)?.PerfilID,
        );
        this.perfilId = Number.isFinite(pid) && pid > 0 ? pid : null;

        this.bookmark = Boolean((resp as any)?.guardado ?? (resp as any)?.bookmark ?? false);

        this.loading = false;

        // ✅ Registrar visita SOLO en modo explorar
        if (this.from !== 'postulaciones' && this.perfilId) {
          this.explorarService.registrarVisita(this.perfilId, tutorId).subscribe({
            error: (e) => console.warn('[ExplorarDetalle] registrarVisita error', e),
          });
        }
      },
      error: (err) => {
        this.loading = false;
        console.warn('[TUTOR] Error detalle estudiante', err);
        this.alert.error('Error', 'No pudimos cargar el detalle.');
      },
    });
  }

  private loadOfertasTutor(tutorId: number): void {
    this.ofertasService.listarMisOfertas(tutorId, null, 1, 50).subscribe({
      next: (resp) => {
        this.ofertasTutor = Array.isArray(resp.items) ? resp.items : [];
      },
      error: () => {
        this.ofertasTutor = [];
      },
    });
  }

  private async loadOfertaDetalle(ofertaId: number): Promise<void> {
    this.ofertaLoading = true;
    this.ofertaDetalle = null;

    try {
      const resp = await firstValueFrom(this.ofertasService.getOfertaDetalle(ofertaId).pipe(catchError(() => of(null))));
      // el service a veces retorna envelope o directo
      this.ofertaDetalle = (resp as any)?.Data ?? resp ?? null;
    } catch (e) {
      console.warn('[ExplorarDetalle] loadOfertaDetalle error', e);
      this.ofertaDetalle = null;
    } finally {
      this.ofertaLoading = false;
    }
  }

  private async loadPostulacionCtx(ofertaId: number, tutorId: number): Promise<void> {
    this.postulacionLoading = true;
    this.postulacionCtx = null;

    try {
      const resp = await firstValueFrom(this.tutorPostulaciones.listarPostulacionesOferta(ofertaId, tutorId, undefined, 1, 200));
      const items = Array.isArray(resp?.items) ? resp.items : [];

      let found: any | null = null;

      // 1) Preferimos buscar por postulacion_id si viene
      if (this.postulacionIdFrom) {
        found =
          items.find((x: any) => Number(x?.id ?? x?.postulacion_id) === this.postulacionIdFrom) ?? null;
      }

      // 2) Fallback: buscar por estudiante_id == terceroId
      if (!found && this.terceroId) {
        found =
          items.find((x: any) => Number(x?.estudiante_id ?? x?.EstudianteId) === Number(this.terceroId)) ?? null;
      }

      this.postulacionCtx = found;
    } catch (e) {
      console.warn('[ExplorarDetalle] loadPostulacionCtx error', e);
    } finally {
      this.postulacionLoading = false;
    }
  }

  // ------------------------
  // CV
  // ------------------------

  async verHojaDeVida(): Promise<void> {
    try {
      const docId = (this.perfil as any)?.cv_documento_id
        ?? (this.perfil as any)?.cvDocumentoId
        ?? (this.perfil as any)?.cvdocumentoid
        ?? null;

      if (!docId) {
        this.alert.info('Sin hoja de vida', 'Este estudiante no tiene un PDF adjunto.');
        return;
      }

      this.loadingSvc.show('Abriendo PDF…');

      await firstValueFrom(
        this.docs.openPdfByDocumentoId(String(docId)).pipe(
          catchError((e) => {
            console.error('[CV] Error abriendo PDF', e);
            return of(void 0);
          }),
        ),
      );

      this.loadingSvc.hide();
    } catch (e) {
      console.error('[CV] Error general abriendo PDF', e);
      this.loadingSvc.hide();
      this.alert.error('Error', 'No fue posible abrir el PDF.');
    }
  }

  get habilidadesChips(): string[] {
    const h: any = (this.perfil as any)?.habilidades ?? (this.perfil as any)?.skills ?? null;
    if (!h) return [];

    const list = Array.isArray(h) ? h : String(h).split(',');
    return list
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0);
  }

  get primaryAction(): 'PRESELECCIONAR' | 'SELECCIONAR' | null {
    const code = this.getPostulacionEstadoCodigo(this.postulacionCtx).toUpperCase();

    // PSRV -> lo natural es preseleccionar (paso siguiente)
    if (code === 'PSRV_CTR' && this.canPreseleccionar()) return 'PRESELECCIONAR';

    // PSPR -> lo natural es seleccionar (paso siguiente)
    if (code === 'PSPR_CTR' && this.canSeleccionar()) return 'SELECCIONAR';

    // fallback: si solo se puede seleccionar, que sea primaria
    if (this.canSeleccionar()) return 'SELECCIONAR';
    if (this.canPreseleccionar()) return 'PRESELECCIONAR';

    return null;
  }

  private normalizePerfilResponse(raw: any): any {
    const p = raw ?? {};
    const out: any = { ...p };

    // IDs / fechas
    out.cv_documento_id = p.cv_documento_id ?? p.cvdocumentoid ?? p.CvDocumentoId ?? p.CVDocumentoID ?? null;
    out.fecha_creacion = p.fecha_creacion ?? p.fechacreacion ?? p.FechaCreacion ?? null;
    out.fecha_modificacion = p.fecha_modificacion ?? p.fechamodificacion ?? p.FechaModificacion ?? null;
    out.tercero_id = p.tercero_id ?? p.terceroid ?? p.TerceroId ?? null;
    out.proyecto_curricular_id = p.proyecto_curricular_id ?? p.proyectocurricularid ?? p.ProyectoCurricularId ?? null;

    // Nombre completo (si viene ausente, deja null; el UI hará fallback)
    out.nombre_completo =
      p.nombre_completo ??
      p.NombreCompleto ??
      p.nombre ??
      p.tercero_nombre ??
      null;

    // Proyecto curricular (objeto y nombre)
    const pcAny = p.proyecto_curricular ?? p.proyectoCurricular ?? null;
    out.proyecto_curricular = pcAny ?? null;

    const pcNombre =
      p.proyecto_curricular_nombre ??
      (pcAny?.nombre ?? pcAny?.Nombre ?? null);

    out.proyecto_curricular_nombre = pcNombre ? String(pcNombre).trim() : null;

    // Resumen/habilidades
    out.resumen = p.resumen ?? p.Resumen ?? null;
    out.habilidades = p.habilidades ?? p.Habilidades ?? null;

    // Flags
    out.visible = (p.visible ?? p.Visible ?? true);
    out.tratamiento_datos_aceptado =
      (p.tratamiento_datos_aceptado ??
        p.tratamientodatosaceptado ??
        p.TratamientoDatosAceptado ??
        false);

    return out;
  }
}
