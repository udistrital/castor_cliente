import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, Routes } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { TutorDashboardService } from 'src/app/@core/services/tutor/tutor-dashboard.service';
import { InvitacionesTutorService } from 'src/app/@core/services/invitaciones-tutor.service';
import { EstadoChipComponent } from '../components/estado-chip/estado-chip.component';

@Component({
  selector: 'app-tutor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    EstadoChipComponent,
  ],
  templateUrl: './tutor-dashboard.component.html',
  styleUrls: ['./tutor-dashboard.component.scss'],
})
export class TutorDashboardComponent implements OnInit {
  loading = true;
  errorMessage = '';
  tutorNombre = '';
  tutorId: number | null = null;
  empresaId: number | null = null;
  empresaNombre = '';
  needsEmpresa = false;
  dashboardLoading = false;
  dashboardError = '';
  resumenOfertas: Record<string, number> = {};
  resumenPostulaciones: Record<string, number> = {};
  resumenInvitaciones: Record<string, number> = {};
  resumenOfertasEstado: Record<string, number> = {};
  resumenPostulacionesEstado: Record<string, number> = {};
  resumenInvitacionesEstado: Record<string, number> = {};

  chipsOfertasPorEstado: { estado: string; total: number }[] = [];
  chipsPostulacionesPorEstado: { estado: string; total: number }[] = [];
  chipsInvitacionesPorEstado: { estado: string; total: number }[] = [];
  postulacionesPorOferta: { ofertaId: number; total: number; ofertaNombre?: string }[] = [];
  loadingPostPorOferta = false;
  errorPostPorOferta = '';

  ofertasAbiertas: any[] = [];
  ofertasEnCurso: any[] = [];
  ofertasFinalizadas: any[] = [];
  ofertasCanceladas: any[] = [];
  loadingOfertas = false;
  errorOfertas = '';
  pcIdCtrl = new FormControl<number | null>(null);
  estudiantes: any[] = [];
  loadingEstudiantes = false;
  errorEstudiantes = '';
  invitacionesEnviadas: any[] = [];
  invitacionesAceptadas: any[] = [];
  invitacionesRechazadas: any[] = [];
  invitacionesCanceladas: any[] = [];

  readonly createOfferRoute = '/tutor/ofertas/nueva';
  readonly exploreStudentsRoute = '/pages/tutor/explorar-estudiantes';
  readonly postulacionesRoute = '/pages/tutor/ofertas/:id';
  readonly ofertasRoute = '/pages/tutor/ofertas';
  readonly invitacionesRoute = '/pages/tutor/invitaciones';

  canCrearOferta = true;
  readonly canExplorarEstudiantes = true;
  readonly canVerPostulaciones = true;

  private readonly estadoLabelMap: Record<string, string> = {
    OPC_CTR: 'Abierta',
    OPCUR_CTR: 'En curso',
    OPFIN_CTR: 'Finalizada',
    OPCAN_CTR: 'Cancelada',
  };

  private readonly estadoNombreMap: Record<string, string> = {
    // Ofertas
    OPC_CTR: 'Creada/Publicada',
    OPCUR_CTR: 'En curso',
    OPPAU_CTR: 'Pausada',
    OPVEN_CTR: 'Vencida',
    OPFIN_CTR: 'Finalizada',
    OPCAN_CTR: 'Cancelada',
    // Postulaciones
    PSPO_CTR: 'Postulado',
    PSRV_CTR: 'En revisión',
    PSPR_CTR: 'Preseleccionada',
    PSSE_CTR: 'Seleccionada',
    PSRJ_CTR: 'Descartada',
    PSAC_CTR: 'Aceptada por estudiante',
    PSRE_CTR: 'Rechazada por elección',
    PSRT_CTR: 'Retirada',
    PSCD_CTR: 'Caducada',
    // Invitaciones
    INV_ENV_CTR: 'Enviada',
    INV_ACE_CTR: 'Aceptada',
    INV_REC_CTR: 'Rechazada',
    INV_EXP_CTR: 'Expirada',
    INV_CAN_CTR: 'Cancelada',
  };

  constructor(
    private token: TokenService,
    private tutorDashboard: TutorDashboardService,
    private invitacionesTutorService: InvitacionesTutorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    void this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    this.canCrearOferta = this.hasRoute(this.createOfferRoute);

    const documento = this.token.documento || this.token.currentUser?.document || '';
    if (!documento) {
      this.errorMessage = 'No encontramos tu documento. Inicia sesion nuevamente.';
      this.loading = false;
      return;
    }

    try {
      const estado = await firstValueFrom(
        this.tutorDashboard.getEstado({ numero_documento: documento })
      );
      const data = (estado as any)?.Data ?? {};
      this.tutorId = Number(data.tutor_id || 0) || null;
      this.empresaId = data.empresa_id ?? null;
      this.needsEmpresa = Boolean(data.needs_empresa);

      if (this.needsEmpresa) {
        this.loading = false;
        this.router.navigateByUrl('/pages/tutor/registro');
        return;
      }

      if (!this.tutorId) {
        this.errorMessage = 'No pudimos identificar el tutor asociado.';
        this.loading = false;
        return;
      }

      const pending: Promise<void>[] = [
        this.loadTutorNombre(this.tutorId),
        this.loadOfertas(this.tutorId),
        this.loadResumenDashboard(this.tutorId),
      ];
      if (this.empresaId) {
        pending.push(this.loadEmpresaNombre(this.empresaId));
      }
      await Promise.all(pending);
    } catch (error) {
      console.error('[TutorDashboard] load error', error);
      this.errorMessage = 'No pudimos cargar tu panel. Intenta mas tarde.';
    } finally {
      this.loading = false;
    }
  }

  goToCrearOferta(): void {    
    this.router.navigate(['pages', 'tutor', 'ofertas', 'nueva'], {
      state: { tutorId: this.tutorId, empresaId: this.empresaId },
    });
  }

  goToExplorarEstudiantes(): void {
    if (!this.canExplorarEstudiantes) {
      return;
    }
    this.router.navigate(['pages', 'tutor', 'explorar-estudiantes']);
  }

  goToOfertas(): void {
    this.router.navigate(['pages', 'tutor', 'ofertas']);
  }

  goToInvitaciones(): void {
    if (!this.tutorId) return;
    this.router.navigate(['pages', 'tutor', 'invitaciones'], {
      queryParams: { tutor_id: this.tutorId },
    });
  }

  goToPostulaciones(oferta: any): void {
    if (!this.canVerPostulaciones) {
      return;
    }
    const ofertaId = this.extractOfertaId(oferta);
    if (!ofertaId) {
      return;
    }
    this.router.navigate(['pages', 'tutor', 'ofertas', ofertaId]);
  }

  async buscarEstudiantes(): Promise<void> {
    const pcId = this.pcIdCtrl.value;
    if (pcId == null) {
      return;
    }
    this.loadingEstudiantes = true;
    this.errorEstudiantes = '';
    try {
      const response = await firstValueFrom(this.tutorDashboard.explorarEstudiantesPorPcId(pcId));
      const data = (response as any)?.Data ?? response ?? [];
      this.estudiantes = Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[TutorDashboard] explorar estudiantes error', error);
      this.errorEstudiantes = 'No se pudieron cargar los estudiantes.';
      this.estudiantes = [];
    } finally {
      this.loadingEstudiantes = false;
    }
  }

  getOfertaNombre(oferta: any): string {
    const nombre =
      oferta?.nombre ||
      oferta?.Nombre ||
      oferta?.titulo ||
      oferta?.Titulo ||
      oferta?.nombre_oferta ||
      '';
    if (String(nombre).trim()) {
      return String(nombre).trim();
    }
    const id = this.extractOfertaId(oferta);
    return id ? `Oferta #${id}` : 'Oferta';
  }

  getEstadoCodigo(oferta: any): string {
    return String(
      oferta?.estado?.Codigo ||
      oferta?.Estado?.Codigo ||
      oferta?.estado_codigo ||
      oferta?.EstadoCodigo ||
      oferta?.estado ||
      oferta?.Estado ||
      ''
    );
  }

  getEstadoNombre(oferta: any): string {
    const codigo = this.getEstadoCodigo(oferta);
    return (
      oferta?.estado?.Nombre ||
      oferta?.Estado?.Nombre ||
      oferta?.nombre_estado ||
      oferta?.NombreEstado ||
      this.estadoLabelMap[codigo] ||
      codigo
    );
  }

  getOfertaIdLabel(oferta: any): string {
    const id = this.extractOfertaId(oferta);
    return id ? String(id) : 'N/D';
  }

  get totalOfertas(): number {
    const fromResumen = Object.values(this.resumenOfertasEstado || {}).reduce((acc, val) => acc + Number(val || 0), 0);
    if (fromResumen > 0) {
      return fromResumen;
    }
    const ids = new Set<number>();
    const all = [
      ...this.ofertasAbiertas,
      ...this.ofertasEnCurso,
      ...this.ofertasFinalizadas,
      ...this.ofertasCanceladas,
    ];
    all.forEach((oferta) => {
      const raw = this.extractOfertaId(oferta);
      const id = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(id) && id > 0) {
        ids.add(id);
      }
    });
    return ids.size;
  }

  get totalPostulaciones(): number {
    return Object.values(this.resumenPostulacionesEstado || {}).reduce((acc, val) => acc + Number(val || 0), 0);
  }

  get totalInvitaciones(): number {
    return Object.values(this.resumenInvitacionesEstado || {}).reduce((acc, val) => acc + Number(val || 0), 0);
  }

  private async loadTutorNombre(tutorId: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.tutorDashboard.getTutorById(tutorId));
      const data = (response as any)?.Data ?? response;
      const tercero = Array.isArray(data) ? data[0] : data;
      this.tutorNombre = this.buildTutorNombre(tercero);
    } catch (error) {
      console.warn('[TutorDashboard] tutor name error', error);
    }
  }

  private async loadEmpresaNombre(empresaId: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.tutorDashboard.getEmpresaById(empresaId));
      const data = (response as any)?.Data ?? response;
      const empresa = Array.isArray(data) ? data[0] : data;
      this.empresaNombre = this.buildEmpresaNombre(empresa);
    } catch (error) {
      console.warn('[TutorDashboard] empresa name error', error);
    }
  }

  private async loadResumenDashboard(tutorId: number): Promise<void> {
    this.dashboardLoading = true;
    this.dashboardError = '';
    try {
      const response = await firstValueFrom(this.tutorDashboard.getDashboardTutor(tutorId));
      const data = (response as any)?.Data ?? response ?? {};
      const rawOfertas = data?.ofertas ?? {};
      const rawInvitaciones = data?.invitaciones ?? {};
      const rawPostulaciones = data?.postulaciones ?? {};
      const rawPostPorEstado = rawPostulaciones?.por_estado ?? {};
      const rawPostPorOferta = rawPostulaciones?.por_oferta ?? {};

      this.resumenOfertas = rawOfertas;
      this.resumenInvitaciones = rawInvitaciones;
      this.resumenPostulaciones = rawPostulaciones;

      this.resumenOfertasEstado = this.filterEstados(rawOfertas, /^OP[A-Z_]+_CTR$/);
      const invitMap = this.extractInvitacionesEstadoMap(rawInvitaciones);
      if (Object.keys(invitMap).length === 0) {
        try {
          const resp = await firstValueFrom(
            this.invitacionesTutorService.getBandeja(tutorId, undefined, 1, 1000)
          );
          const items = (resp as any)?.items ?? (resp as any)?.Items ?? [];
          const map: Record<string, number> = {
            INV_ENV_CTR: 0,
            INV_ACE_CTR: 0,
            INV_REC_CTR: 0,
            INV_CAN_CTR: 0,
          };
          if (Array.isArray(items)) {
            items.forEach((inv: any) => {
              const raw = String(inv?.estado_raw ?? inv?.estado ?? '').toUpperCase().trim();
              if (map[raw] !== undefined) {
                map[raw] += 1;
              }
            });
          }
          this.resumenInvitacionesEstado = map;
        } catch (error) {
          console.warn('[TutorDashboard] invitaciones fallback error', error);
          this.resumenInvitacionesEstado = {};
        }
      } else {
        this.resumenInvitacionesEstado = invitMap;
      }
      this.resumenPostulacionesEstado = this.filterEstados(rawPostPorEstado, /^PS[A-Z_]+_CTR$/);

      this.chipsOfertasPorEstado = this.toChips(this.resumenOfertasEstado);
      this.chipsInvitacionesPorEstado = this.toChips(this.resumenInvitacionesEstado);
      this.chipsPostulacionesPorEstado = this.toChips(this.resumenPostulacionesEstado);

      const ofertasCounts = this.filterOfertaCounts(rawPostPorOferta);
      const ofertaIdSet = this.buildOfertaIdSet();
      const filtradas = ofertaIdSet.size
        ? ofertasCounts.filter((x) => ofertaIdSet.has(x.ofertaId))
        : ofertasCounts;
      this.postulacionesPorOferta = filtradas.map((x) => ({ ofertaId: x.ofertaId, total: x.total }));
      await this.hydrateNombresOfertasDePostulaciones();
    } catch (error) {
      console.warn('[TutorDashboard] resumen error', error);
      this.dashboardError = 'No pudimos cargar el resumen del tutor.';
      this.resumenOfertas = {};
      this.resumenInvitaciones = {};
      this.resumenPostulaciones = {};
      this.resumenOfertasEstado = {};
      this.resumenInvitacionesEstado = {};
      this.resumenPostulacionesEstado = {};
      this.chipsOfertasPorEstado = [];
      this.chipsInvitacionesPorEstado = [];
      this.chipsPostulacionesPorEstado = [];
      this.postulacionesPorOferta = [];
      this.errorPostPorOferta = 'No pudimos cargar postulaciones por oferta.';
    } finally {
      this.dashboardLoading = false;
    }
  }

  private filterEstados(map: any, re: RegExp): Record<string, number> {
    const out: Record<string, number> = {};
    if (!map || typeof map !== 'object') {
      return out;
    }
    Object.entries(map).forEach(([key, value]) => {
      if (typeof key !== 'string' || !re.test(key)) {
        return;
      }
      const num = Number(value);
      if (Number.isFinite(num) && num >= 0) {
        out[key] = num;
      }
    });
    return out;
  }

  private filterOfertaCounts(map: any): { ofertaId: number; total: number }[] {
    if (!map || typeof map !== 'object') {
      return [];
    }
    return Object.entries(map)
      .filter(([key, value]) => /^\d+$/.test(String(key)) && Number.isFinite(Number(value)))
      .map(([key, value]) => ({ ofertaId: Number(key), total: Number(value) }))
      .sort((a, b) => b.total - a.total);
  }

  private toChips(map: Record<string, number>): { estado: string; total: number }[] {
    return Object.entries(map)
      .map(([code, total]) => ({
        estado: this.estadoNombreMap[code] ?? code,
        total: Number(total ?? 0),
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Helpers UI: formato amigable de fechas
  formatDateHuman(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        return String(value);
      }
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(value);
    }
  }

  // Helpers UI: recorte de títulos largos
  shortTitle(text: any, max = 60): string {
    const raw = text == null ? '' : String(text);
    if (!max || raw.length <= max) {
      return raw;
    }
    return raw.slice(0, Math.max(0, max - 1)).replace(/\s+$/, '') + '…';
  }

  // Helpers UI: subtítulo para ofertas
  ofertaSubtitle(oferta: any): string {
    const id = this.extractOfertaId(oferta);
    const label = id ? `Oferta #${id}` : 'Oferta';
    const fecha =
      oferta?.fecha_publicacion ||
      oferta?.FechaPublicacion ||
      oferta?.fechaPublicacion ||
      oferta?.FechaCreacion ||
      oferta?.fecha_creacion ||
      null;
    const human = this.formatDateHuman(fecha);
    return human ? `${label} · Publicada ${human}` : label;
  }

  private extractInvitacionesEstadoMap(raw: any): Record<string, number> {
    if (!raw || typeof raw !== 'object') {
      return {};
    }
    if (raw?.por_estado && typeof raw.por_estado === 'object') {
      return this.filterEstados(raw.por_estado, /^INV[A-Z_]+_CTR$/);
    }
    const hasInvKeys = Object.keys(raw).some((key) => /^INV[A-Z_]+_CTR$/.test(String(key)));
    if (hasInvKeys) {
      return this.filterEstados(raw, /^INV[A-Z_]+_CTR$/);
    }
    if (raw?.total) {
      return {};
    }
    return {};
  }

  private async hydrateNombresOfertasDePostulaciones(): Promise<void> {
    if (!this.postulacionesPorOferta.length) {
      return;
    }
    const getOfertaById = (this.tutorDashboard as any)?.getOfertaById;
    if (typeof getOfertaById !== 'function') {
      return;
    }

    this.loadingPostPorOferta = true;
    this.errorPostPorOferta = '';
    try {
      const top = this.postulacionesPorOferta.slice(0, 6);
      const results = await Promise.all(
        top.map(async (item) => {
          try {
            const resp = await firstValueFrom(getOfertaById.call(this.tutorDashboard, item.ofertaId));
            const data = (resp as any)?.Data ?? resp;
            return { ...item, ofertaNombre: this.getOfertaNombre(data) };
          } catch {
            return item;
          }
        })
      );
      this.postulacionesPorOferta = results.concat(this.postulacionesPorOferta.slice(top.length));
    } catch (error) {
      console.warn('[TutorDashboard] ofertas por postulaciones error', error);
      this.errorPostPorOferta = 'No pudimos cargar los nombres de las ofertas.';
    } finally {
      this.loadingPostPorOferta = false;
    }
  }

  goToPostulacionesPorOfertaId(ofertaId: number): void {
    if (!ofertaId) {
      return;
    }
    this.router.navigate(['pages', 'tutor', 'ofertas', ofertaId]);
  }

  private async loadOfertas(tutorId: number): Promise<void> {
    this.loadingOfertas = true;
    this.errorOfertas = '';
    const [abiertasResult, enCursoResult, otrasResult] = await Promise.all([
      this.safePromise(firstValueFrom(this.tutorDashboard.getOfertasAbiertasByTutorId(tutorId))),
      this.safePromise(firstValueFrom(this.tutorDashboard.getOfertasEnCursoByTutorId(tutorId))),
      this.safePromise(firstValueFrom(this.tutorDashboard.getOfertasTodas(tutorId))),
    ]);

    if (abiertasResult.ok) {
      this.ofertasAbiertas = this.normalizeOfertas(abiertasResult.value);
    } else {
      console.warn('[TutorDashboard] ofertas abiertas error', abiertasResult.error);
      this.ofertasAbiertas = [];
    }

    if (enCursoResult.ok) {
      this.ofertasEnCurso = this.normalizeOfertas(enCursoResult.value);
    } else {
      console.warn('[TutorDashboard] ofertas en curso error', enCursoResult.error);
      this.ofertasEnCurso = [];
    }

    const otras = otrasResult.ok ? this.normalizeOfertas(otrasResult.value) : [];
    if (!otrasResult.ok) {
      console.warn('[TutorDashboard] ofertas otras error', otrasResult.error);
    }

    this.ofertasFinalizadas = otras.filter((oferta) => this.getEstadoCodigo(oferta) === 'OPFIN_CTR');
    this.ofertasCanceladas = otras.filter((oferta) => this.getEstadoCodigo(oferta) === 'OPCAN_CTR');
    if (!abiertasResult.ok || !enCursoResult.ok) {
      this.errorOfertas = 'No se pudieron cargar todas las ofertas.';
    }
    this.loadingOfertas = false;
  }

  private normalizeOfertas(payload: any): any[] {
    if (!payload) {
      return [];
    }
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload?.Data)) {
      return payload.Data;
    }
    if (Array.isArray(payload?.Data?.items)) {
      return payload.Data.items;
    }
    if (Array.isArray(payload?.data)) {
      return payload.data;
    }
    if (Array.isArray(payload?.data?.items)) {
      return payload.data.items;
    }
    if (Array.isArray(payload?.items)) {
      return payload.items;
    }
    if (Array.isArray(payload?.results)) {
      return payload.results;
    }
    if (Array.isArray(payload?.Ofertas)) {
      return payload.Ofertas;
    }
    return [];
  }

  private extractOfertaId(oferta: any): string | number | null {
    return (
      oferta?.id ||
      oferta?.Id ||
      oferta?.id_oferta ||
      oferta?.OfertaId ||
      oferta?.codigo ||
      null
    );
  }

  private buildOfertaIdSet(): Set<number> {
    const ids = new Set<number>();
    const all = [
      ...this.ofertasAbiertas,
      ...this.ofertasEnCurso,
      ...this.ofertasFinalizadas,
      ...this.ofertasCanceladas,
    ];
    all.forEach((oferta) => {
      const raw = this.extractOfertaId(oferta);
      const id = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(id) && id > 0) {
        ids.add(id);
      }
    });
    return ids;
  }

  private buildTutorNombre(tercero: any): string {
    const completo = (tercero?.NombreCompleto || '').trim();
    if (completo) {
      return completo;
    }
    const partes = [
      tercero?.PrimerNombre,
      tercero?.SegundoNombre,
      tercero?.PrimerApellido,
      tercero?.SegundoApellido,
    ].filter(Boolean);
    return partes.join(' ').trim();
  }

  private buildEmpresaNombre(empresa: any): string {
    const razon =
      empresa?.RazonSocial ||
      empresa?.razon_social ||
      empresa?.Nombre ||
      empresa?.NombreCompleto ||
      '';
    if (String(razon).trim()) {
      return String(razon).trim();
    }
    return '';
  }

  private async safePromise<T>(promise: Promise<T>): Promise<{ ok: boolean; value?: T; error?: unknown }> {
    try {
      const value = await promise;
      return { ok: true, value };
    } catch (error) {
      return { ok: false, error };
    }
  }

  private hasRoute(path: string): boolean {
    const cleanPath = path.replace(/^\//, '');
    const segments = cleanPath.split('/').filter(Boolean);
    if (!segments.length) {
      return false;
    }
    return this.searchRoutes(this.router.config, segments);
  }

  private searchRoutes(routes: Routes, segments: string[]): boolean {
    if (!segments.length) {
      return true;
    }
    const [head, ...tail] = segments;
    for (const route of routes) {
      if (route.path === head) {
        if (!tail.length) {
          return true;
        }
        const children =
          route.children ||
          (route as any)?._loadedConfig?.routes ||
          (route as any)?._loadedRoutes ||
          [];
        return this.searchRoutes(children, tail);
      }
    }
    return false;
  }
}
