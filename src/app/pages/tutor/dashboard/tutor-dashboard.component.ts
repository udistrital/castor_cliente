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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { TutorDashboardService } from 'src/app/@core/services/tutor/tutor-dashboard.service';
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

  readonly createOfferRoute = '/pages/tutor/ofertas/crear';
  readonly exploreStudentsRoute = '/pages/tutor/explorar-estudiantes';
  readonly postulacionesRoute = '/pages/tutor/ofertas/:id';

  canCrearOferta = false;
  readonly canExplorarEstudiantes = true;
  readonly canVerPostulaciones = true;

  private readonly estadoLabelMap: Record<string, string> = {
    OPC_CTR: 'Abierta',
    OPCUR_CTR: 'En curso',
    OPFIN_CTR: 'Finalizada',
    OPCAN_CTR: 'Cancelada',
  };

  constructor(
    private token: TokenService,
    private tutorDashboard: TutorDashboardService,
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
    if (!this.canCrearOferta) {
      return;
    }
    this.router.navigateByUrl(this.createOfferRoute);
  }

  goToExplorarEstudiantes(): void {
    if (!this.canExplorarEstudiantes) {
      return;
    }
    this.router.navigateByUrl(this.exploreStudentsRoute);
  }

  goToPostulaciones(oferta: any): void {
    if (!this.canVerPostulaciones) {
      return;
    }
    const ofertaId = this.extractOfertaId(oferta);
    if (!ofertaId) {
      return;
    }
    const route = this.postulacionesRoute.replace(':id', String(ofertaId));
    this.router.navigateByUrl(route);
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
    if (Array.isArray(payload?.data)) {
      return payload.data;
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
