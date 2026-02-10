import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { TutorContextService } from 'src/app/@core/services/tutor/tutor-context.service';
import { TutorOfertasService } from 'src/app/@core/services/tutor/tutor-ofertas.service';
import { TutorPostulacionesService } from 'src/app/@core/services/tutor/tutor-postulaciones.service';
import { EstadoChipComponent } from '../../components/estado-chip/estado-chip.component';
import { MatTooltipModule } from '@angular/material/tooltip';


@Component({
  selector: 'app-tutor-oferta-detalle',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    EstadoChipComponent,
    MatTooltipModule,
  ],
  templateUrl: './tutor-oferta-detalle.component.html',
  styleUrls: ['./tutor-oferta-detalle.component.scss'],
})
export class TutorOfertaDetalleComponent implements OnInit {
  ofertaId: number | null = null;
  tutorId: number | null = null;
  loading = true;
  errorMessage = '';
  ofertaDetalle: any | null = null;
  actionLoading = false;
  postulaciones: any[] = [];
  estadoSeleccionado = 'TODOS';
  estadosDisponibles: string[] = [];
  private readonly estadoNombreMap: Record<string, string> = {
    PSPO_CTR: 'Postulada',
    PSRV_CTR: 'En revisión',
    PSPR_CTR: 'Preseleccionada',
    PSSE_CTR: 'Seleccionada',
    PSRJ_CTR: 'Descartada',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorContext: TutorContextService,
    private tutorPostulaciones: TutorPostulacionesService,
    private tutorOfertas: TutorOfertasService,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      const parsed = rawId ? Number(rawId) : NaN;
      if (!rawId || Number.isNaN(parsed)) {
        this.errorMessage = 'No se encontro la oferta solicitada.';
        this.loading = false;
        return;
      }
      this.ofertaId = parsed;
      this.tutorContext.ensureLoaded().subscribe((ctx) => {
        this.tutorId = ctx?.tutor_id ?? null;
        if (!this.tutorId) {
          this.errorMessage = 'No pudimos identificar tu perfil de tutor.';
          this.loading = false;
          return;
        }
        void this.loadAll(parsed, this.tutorId);
      });
    });
  }

  get postulacionesFiltradas(): any[] {
    if (this.estadoSeleccionado === 'TODOS') {
      return this.postulaciones;
    }
    return this.postulaciones.filter(
      (postulacion) => this.getPostulacionEstadoCodigo(postulacion) === this.estadoSeleccionado
    );
  }

  goBack(): void {
    this.router.navigateByUrl('/pages/tutor/dashboard');
  }

  goMisOfertas(): void {
    this.router.navigateByUrl('/pages/tutor/ofertas');
  }

  goDashboard(): void {
    this.router.navigateByUrl('/pages/tutor/dashboard');
  }

  getOfertaTitulo(): string {
    return this.ofertaDetalle?.titulo || this.ofertaDetalle?.Titulo || `Oferta #${this.ofertaId ?? 'N/D'}`;
  }

  getOfertaFecha(): string {
    return this.ofertaDetalle?.fecha_publicacion || this.ofertaDetalle?.created_at || '';
  }

  getOfertaEstadoCodigo(): string {
    return String(
      this.ofertaDetalle?.estado_det?.code ||
      this.ofertaDetalle?.estado_det?.Codigo ||
      this.ofertaDetalle?.Estado?.Codigo ||
      this.ofertaDetalle?.estado ||
      this.ofertaDetalle?.Estado ||
      ''
    );
  }

  getOfertaEstadoNombre(): string {
    return String(
      this.ofertaDetalle?.estado_det?.nombre ||
      this.ofertaDetalle?.Estado?.Nombre ||
      this.ofertaDetalle?.estado ||
      ''
    );
  }

  isOfertaAbierta(): boolean {
    return this.getOfertaEstadoCodigo().toUpperCase() === 'OPC_CTR';
  }

  isOfertaEnCurso(): boolean {
  return this.getOfertaEstadoCodigo().toUpperCase() === 'OPCUR_CTR';
  }

  isOfertaPausada(): boolean {
    return this.getOfertaEstadoCodigo().toUpperCase() === 'OPPAU_CTR';
  }

  isOfertaFinalizada(): boolean {
    return this.getOfertaEstadoCodigo().toUpperCase() === 'OPFIN_CTR';
  }

  canGestionarPostulaciones(): boolean {
  // Solo cuando la oferta está Abierta/Creada
  const code = this.getOfertaEstadoCodigo().toUpperCase();
  return code === 'OPC_CTR';
  }

  isOfertaCancelada(): boolean {
    return this.getOfertaEstadoCodigo().toUpperCase() === 'OPCAN_CTR';
  }

  canCambiarEstadoOferta(): boolean {
    const code = this.getOfertaEstadoCodigo().toUpperCase();
    return code === 'OPC_CTR' || code === 'OPPAU_CTR' || code === 'OPCUR_CTR';
  }

  /**
  * Botones de acción de la oferta: SOLO si está Abierta o Pausada.
  * (Ocultar si está En curso, Cancelada o Finalizada)
  */
  canAccionarOferta(): boolean {
    const code = this.getOfertaEstadoCodigo().toUpperCase();
    return code === 'OPC_CTR' || code === 'OPPAU_CTR';
  }

  async finalizarOferta(): Promise<void> {
    if (!this.tutorId || !this.ofertaId) {
      return;
    }
    const ok = await this.confirmAction('¿Finalizar oferta?');
    if (!ok) {
      return;
    }
    this.actionLoading = true;
    this.tutorOfertas.finalizarOferta(this.tutorId, this.ofertaId).subscribe({
      next: () => {
        this.alert.success('Listo', 'Oferta finalizada.');
        void this.loadAll(this.ofertaId as number, this.tutorId as number);
      },
      error: (err) => {
        console.warn('[TutorOfertaDetalle] finalizar error', err);
        this.alert.error('Error', 'No pudimos finalizar la oferta.');
      },
      complete: () => {
        this.actionLoading = false;
      },
    });
  }

  async cancelarOferta(): Promise<void> {
    if (!this.tutorId || !this.ofertaId) {
      return;
    }
    const ok = await this.confirmAction('¿Cancelar oferta?');
    if (!ok) {
      return;
    }
    this.actionLoading = true;
    this.tutorOfertas.cancelarOferta(this.tutorId, this.ofertaId).subscribe({
      next: () => {
        this.alert.success('Listo', 'Oferta cancelada.');
        void this.loadAll(this.ofertaId as number, this.tutorId as number);
      },
      error: (err) => {
        console.warn('[TutorOfertaDetalle] cancelar error', err);
        this.alert.error('Error', 'No pudimos cancelar la oferta.');
      },
      complete: () => {
        this.actionLoading = false;
      },
    });
  }

  async pausarOferta(): Promise<void> {
    if (!this.tutorId || !this.ofertaId) {
      return;
    }
    const ok = await this.confirmAction('¿Pausar oferta?');
    if (!ok) {
      return;
    }
    this.actionLoading = true;
    this.tutorOfertas.pausarOferta(this.tutorId, this.ofertaId).subscribe({
      next: () => {
        this.alert.success('Listo', 'Oferta pausada.');
        void this.loadAll(this.ofertaId as number, this.tutorId as number);
      },
      error: (err) => {
        console.warn('[TutorOfertaDetalle] pausar error', err);
        this.alert.error('Error', 'No pudimos pausar la oferta.');
      },
      complete: () => {
        this.actionLoading = false;
      },
    });
  }

  async reactivarOferta(): Promise<void> {
    if (!this.tutorId || !this.ofertaId) {
      return;
    }
    const ok = await this.confirmAction('¿Reactivar oferta?');
    if (!ok) {
      return;
    }
    this.actionLoading = true;
    this.tutorOfertas.reactivarOferta(this.tutorId, this.ofertaId).subscribe({
      next: () => {
        this.alert.success('Listo', 'Oferta reactivada.');
        void this.loadAll(this.ofertaId as number, this.tutorId as number);
      },
      error: (err) => {
        console.warn('[TutorOfertaDetalle] reactivar error', err);
        this.alert.error('Error', 'No pudimos reactivar la oferta.');
      },
      complete: () => {
        this.actionLoading = false;
      },
    });
  }

  async openPostulante(postulacion: any): Promise<void> {
  const estudianteId = this.getPostulanteId(postulacion);
  const postulacionId = postulacion?.id ?? postulacion?.postulacion_id ?? null;
  if (!estudianteId) {
    console.warn('[TutorOfertaDetalle] no estudianteId para navegar');
    return;
  }

  // Si NO se puede gestionar (oferta pausada/cancelada/etc), solo navegar (sin acciones)
  if (!this.canGestionarPostulaciones()) {
    this.router.navigate(['/pages/tutor/explorar-estudiantes', estudianteId], {
      queryParams: {
      from: 'postulaciones',
      oferta_id: this.ofertaId,
      postulacion_id: postulacionId,
  },
    });
    
    return;
  }

  // Solo si está Postulada, al abrir el perfil se marca "VISTO" => PSRV_CTR
  if (this.getPostulacionEstadoCodigo(postulacion) === 'PSPO_CTR') {
    try {
      await this.registrarAccion(postulacion?.id ?? postulacion?.postulacion_id, 'VISTO');
      postulacion.estado_det = { code: 'PSRV_CTR', nombre: 'En revisión' };
      if (postulacion?.estado_postulacion) {
        postulacion.estado_postulacion = 'PSRV_CTR';
      }
    } catch (error) {
      console.warn('[TutorOfertaDetalle] accion visto error', error);
    }
  }

  this.router.navigate(['/pages/tutor/explorar-estudiantes', estudianteId], {
    queryParams: {
    from: 'postulaciones',
    oferta_id: this.ofertaId ?? null,
  },
  });
}


  preseleccionar(postulacion: any): void {
    this.doAccion(postulacion, 'PRESELECCIONAR');
  }

  onPreseleccionar(postulacion: any, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.preseleccionar(postulacion);
  }

  seleccionar(postulacion: any): void {
    this.doAccion(postulacion, 'SELECCIONAR');
  }

  onSeleccionar(postulacion: any, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.seleccionar(postulacion);
  }

  descartar(postulacion: any): void {
    this.doAccion(postulacion, 'DESCARTAR');
  }

  async onDescartar(postulacion: any, event?: MouseEvent): Promise<void> {
    if (event) {
      event.stopPropagation();
    }
    if (!postulacion?.id) {
      return;
    }
    if (!this.canDescartar(postulacion)) {
      return;
    }
    try {
      await this.registrarAccion(postulacion.id, 'DESCARTAR');
      postulacion.estado_det = { code: 'PSRJ_CTR', nombre: 'Descartada' };
      if (postulacion?.estado_postulacion) {
        postulacion.estado_postulacion = 'PSRJ_CTR';
      }
    } catch (e) {
      console.error('[TutorOfertaDetalle] descartar error', e);
    }
  }

  formatFecha(value?: string): string {
  if (!value) return '—';

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  // Compatible con typings viejos (sin dateStyle/timeStyle)
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}


  getOfertaFechaFormateada(): string {
    return this.formatFecha(this.getOfertaFecha());
  }

  getOfertaDescripcion(): string {
    return this.ofertaDetalle?.descripcion || this.ofertaDetalle?.Descripcion || '—';
  }

  getProyectoCurricularNombre(postulacion: any): string {
    return postulacion?.proyecto_curricular_nombre || postulacion?.proyecto_curricular?.nombre || '—';
  }

  getNombreEstado(code: string): string {
    const c = String(code || '').trim();
    return this.estadoNombreMap[c] || c || '—';
  }

  getPostulacionEstadoCodigo(postulacion: any): string {
    return String(
      postulacion?.estado_det?.code ||
      postulacion?.estado_det?.Code ||
      postulacion?.estado_postulacion ||
      postulacion?.EstadoPostulacion ||
      postulacion?.estado ||
      postulacion?.Estado ||
      ''
    ).trim();
  }

  getEstadoCodigo(postulacion: any): string {
    return this.getPostulacionEstadoCodigo(postulacion);
  }

  getPostulacionEstadoNombre(postulacion: any): string {
    const nombre = postulacion?.estado_det?.nombre || postulacion?.estado_det?.Nombre;
    if (String(nombre || '').trim()) return String(nombre).trim();
    const code = this.getPostulacionEstadoCodigo(postulacion);
    return this.estadoNombreMap[code] || code || '—';
  }

  getPostulanteId(postulacion: any): number | null {
    const id =
      postulacion?.estudiante_id ??
      postulacion?.EstudianteId ??
      postulacion?.estudiante?.Id ??
      postulacion?.estudiante?.id ??
      null;
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  getPostulanteNombre(postulacion: any): string {
    return String(
      postulacion?.estudiante?.NombreCompleto ||
      postulacion?.estudiante_nombre ||
      postulacion?.NombreCompleto ||
      postulacion?.nombre_estudiante ||
      postulacion?.estudiante?.nombre_completo ||
      'Estudiante'
    ).trim();
  }

  getPostulacionClass(postulacion: any): string {
    const code = this.getPostulacionEstadoCodigo(postulacion);
    const map: Record<string, string> = {
      PSPO_CTR: 'pst pst-postulada',
      PSRV_CTR: 'pst pst-revision',
      PSPR_CTR: 'pst pst-preseleccion',
      PSSE_CTR: 'pst pst-seleccion',
      PSRJ_CTR: 'pst pst-descartada',
    };
    return map[code] || 'pst pst-default';
  }

  isDescartado(postulacion: any): boolean {
    const code = (this as any).getPostulacionEstadoCodigo
      ? (this as any).getPostulacionEstadoCodigo(postulacion)
      : String(
        postulacion?.estado_det?.code ||
        postulacion?.estado_postulacion ||
        postulacion?.EstadoPostulacion ||
        postulacion?.estado ||
        ''
      ).trim();
    return code === 'PSRJ_CTR';
  }

  canPreseleccionar(postulacion: any): boolean {
  if (!this.canGestionarPostulaciones()) return false;
  if (this.isDescartado(postulacion)) return false;

  const code = this.getPostulacionEstadoCodigo(postulacion);

  // Regla: si está Postulada (PSPO_CTR), NO permitir acciones
  if (code === 'PSPO_CTR') return false;

  // Preseleccionar permitido desde revisión
  return code === 'PSRV_CTR';
}

canSeleccionar(postulacion: any): boolean {
  if (!this.canGestionarPostulaciones()) return false;
  if (this.isDescartado(postulacion)) return false;

  const code = this.getPostulacionEstadoCodigo(postulacion);

  // Regla: si está Postulada (PSPO_CTR), NO permitir acciones
  if (code === 'PSPO_CTR') return false;

  // Seleccionar permitido desde revisión o preseleccionada
  return code === 'PSRV_CTR' || code === 'PSPR_CTR';
}

canDescartar(postulacion: any): boolean {
  if (!this.canGestionarPostulaciones()) return false;
  if (this.isDescartado(postulacion)) return false;

  const code = this.getPostulacionEstadoCodigo(postulacion);

  // Regla: si está Postulada (PSPO_CTR), NO permitir descartar
  if (code === 'PSPO_CTR') return false;

  return true;
}

  getTooltipAccion(postulacion: any, accion: 'PRESELECCIONAR' | 'SELECCIONAR' | 'DESCARTAR'): string {
  // 1) Oferta en estado que no permite gestión
  if (!this.canGestionarPostulaciones()) {
    return 'La oferta no permite gestionar postulaciones en este estado.';
  }

  const code = this.getPostulacionEstadoCodigo(postulacion);

  // 2) Caso PSPO: según tu regla, no permitir acciones hasta abrir perfil y pasar a revisión
  if (code === 'PSPO_CTR') {
    return 'Primero abre el perfil para marcar la postulación como revisada.';
  }

  // 3) Caso descartada
  if (this.isDescartado(postulacion)) {
    return 'La postulación está descartada.';
  }

  // 4) Tooltip específico por acción si está bloqueada por reglas
  if (accion === 'DESCARTAR' && !this.canDescartar(postulacion)) {
    return 'Acción no disponible.';
  }
  if (accion === 'PRESELECCIONAR' && !this.canPreseleccionar(postulacion)) {
    return 'Acción no disponible.';
  }
  if (accion === 'SELECCIONAR' && !this.canSeleccionar(postulacion)) {
    return 'Acción no disponible.';
  }

  return '';
}




  private async loadAll(ofertaId: number, tutorId: number): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    await Promise.all([
      this.loadOfertaDetalle(ofertaId),
      this.loadPostulaciones(ofertaId, tutorId),
    ]);
    this.loading = false;
  }

  private async loadOfertaDetalle(ofertaId: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.tutorOfertas.getOfertaDetalle(ofertaId));
      this.ofertaDetalle = (response as any)?.Data ?? response ?? null;
    } catch (error) {
      console.warn('[TutorOfertaDetalle] detalle oferta error', error);
      this.ofertaDetalle = null;
    }
  }

  private async loadPostulaciones(ofertaId: number, tutorId: number): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.tutorPostulaciones.listarPostulacionesOferta(ofertaId, tutorId, undefined, 1, 200)
      );
      const data = response?.items ?? [];
      this.postulaciones = Array.isArray(data) ? data : [];
      this.estadosDisponibles = this.buildEstadosDisponibles(this.postulaciones);
    } catch (error) {
      console.error('[TutorOfertaDetalle] load error', error);
      this.errorMessage = 'No pudimos cargar las postulaciones.';
      this.postulaciones = [];
      this.estadosDisponibles = [];
    }
  }

  private buildEstadosDisponibles(postulaciones: any[]): string[] {
    const estados = new Set<string>();
    postulaciones.forEach((postulacion) => {
      const codigo = this.getPostulacionEstadoCodigo(postulacion);
      if (codigo) {
        estados.add(codigo);
      }
    });
    return Array.from(estados);
  }

  private doAccion(postulacion: any, action: 'VISTO' | 'PRESELECCIONAR' | 'SELECCIONAR' | 'DESCARTAR'): void {
    if (!this.tutorId || !this.ofertaId) {
      return;
    }

    if (!this.canGestionarPostulaciones()) {
      this.alert.error('Acción no disponible', 'La oferta no permite gestionar postulaciones en este estado.');
      return;
    }

    const id = postulacion?.id ?? postulacion?.postulacion_id;
    if (!id) {
      return;
    }
    this.tutorPostulaciones.accionPostulacion(id, this.tutorId, action).subscribe({
      next: () => {
        this.alert.success('Listo', `Acción ${action} aplicada.`);
        void this.loadPostulaciones(this.ofertaId as number, this.tutorId as number);
      },
      error: (err) => {
        console.warn('[TutorOfertaDetalle] accion error', err);
        this.alert.error('Error', 'No pudimos aplicar la acción.');
      },
    });
  }

  private async confirmAction(message: string): Promise<boolean> {
    if (this.alert.confirm) {
      return this.alert.confirm(message);
    }
    return window.confirm(message);
  }

  private async registrarAccion(postulacionId: number, accion: 'VISTO' | 'DESCARTAR' | string): Promise<any> {
    if (!this.tutorId || !postulacionId) {
      return null;
    }
    const response = await firstValueFrom(
      this.tutorPostulaciones.accionPostulacion(postulacionId, this.tutorId, accion as any)
    );
    return (response as any)?.Data ?? response ?? null;
  }
}
