import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { TokenService } from '../../@core/services/auth/token.service';
import { LoadingService } from '../../@core/services/ui/loading.service';
import { EstudiantesService } from '../../@core/services/estudiantes.service';
import { CatalogosService } from '../../@core/services/catalogos/catalogos.service';
import { UserContextService } from '../../@core/services/user-context.service';
import { PerfilEstudiante } from '../../@core/models/perfil.model';

@Component({
  standalone: true,
  selector: 'app-home-estudiante',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-estudiante max-w-3xl mx-auto p-6">
      <h2 class="text-2xl font-semibold mb-4">Mi perfil en Castor</h2>

      <div class="ctx-card p-4 border rounded mb-6">
        <div class="ctx-grid">
          <div class="col">
            <span class="label">Nombre</span>
            <div class="ro">{{ ctxNombre || '—' }}</div>
          </div>
          <div class="col">
            <span class="label">Código</span>
            <div class="ro">{{ ctxCodigo || '—' }}</div>
          </div>
          <div class="col">
            <span class="label">Proyecto Curricular</span>
            <div class="ro">
              <ng-container *ngIf="ctxPcNombre; else ctxPcFallback">
                {{ ctxPcNombre }}
              </ng-container>
              <ng-template #ctxPcFallback>
                {{ ctxPcId || '—' }}
                <small class="muted" *ngIf="ctxPcId">(provisional)</small>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <ng-container *ngIf="perfil; else noPerfil">
        <div class="card p-4 border rounded mb-4">
          <h3 class="text-xl font-medium mb-2">
            {{ pcNombre || 'Proyecto curricular sin especificar' }}
          </h3>
          <p class="text-sm text-gray-600 mb-4">
            Código: {{ codigoEstudiante || 'N/A' }}
          </p>
          <div class="mb-4">
            <h4 class="font-semibold mb-1">Resumen</h4>
            <p>{{ perfil?.resumen || 'Aún no registras un resumen.' }}</p>
          </div>
          <div class="mb-4">
            <h4 class="font-semibold mb-1">Habilidades</h4>
            <p>{{ perfil?.habilidades || 'Aún no registras habilidades.' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="px-3 py-1 rounded text-sm"
              [class.bg-green-100]="perfil?.visible"
              [class.bg-gray-200]="!perfil?.visible"
            >
              {{ perfil?.visible ? 'Visible para empleadores' : 'No visible' }}
            </span>
            <a
              *ngIf="perfil?.cv_documento_id"
              [href]="buildCvLink(perfil.cv_documento_id)"
              target="_blank"
              class="text-blue-600 text-sm underline"
            >
              Ver hoja de vida
            </a>
          </div>
        </div>
      </ng-container>

      <ng-template #noPerfil>
        <div class="p-4 border rounded bg-yellow-50">
          No encontramos un perfil registrado. Completa tu registro desde la sección
          <a routerLink="/pages/registro" class="text-blue-600 underline">Registro</a>.
        </div>
      </ng-template>
    </div>
  `,
  styles: [
    `
    .ctx-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .label { font-size: 12px; opacity: .7; margin-bottom: 4px; display:block; }
    .ro {
      background: #f7f7fb;
      border: 1px solid #e3e3ef;
      border-radius: 8px;
      padding: 10px 12px;
      min-height: 40px;
      display:flex;
      align-items:center;
    }
    .muted { opacity: .6; font-size: 12px; margin-left: 4px; }
    `,
  ],
})
export class HomeEstudianteComponent implements OnInit {
  perfil: PerfilEstudiante | null = null;
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
    private catalogos: CatalogosService,
    private userContext: UserContextService,
  ) {}

  ngOnInit(): void {
    this.bootstrapContext();
    this.loadPerfil();
  }

  private async loadPerfil(): Promise<void> {
    try {
      const ctx = this.userContext.getEstudianteContext();
      const currentUser = this.token.currentUser as any;

      const terceroId =
        ctx?.tercero_id ??
        currentUser?.rawTokenPayload?.tercero_id ??
        currentUser?.tercero_id ??
        null;

      const codigo =
        currentUser?.rawTokenPayload?.Codigo ??
        currentUser?.Codigo ??
        currentUser?.document ??
        currentUser?.documento ??
        ctx?.codigo;

      this.codigoEstudiante = codigo ?? '';

      this.loading.show('Cargando tu perfil…');

      if (terceroId) {
        this.perfil = await firstValueFrom(this.estudiantes.obtenerPerfilPorTercero(terceroId));
      } else if (codigo) {
        const resp = await firstValueFrom(this.estudiantes.consultarPorDocumento(codigo));
        this.perfil = resp?.relacionado ? (resp as any).perfil : null;
      }

      this.loading.hide();

      if (!this.perfil) {
        return;
      }

      this.loadProyectoCurricularNombre(this.perfil.proyecto_curricular_id);
    } catch (error) {
      console.error('[HOME ESTUDIANTE] Error cargando perfil', error);
      this.loading.hide();
      Swal.fire('Error', 'No pudimos cargar tu perfil. Intenta más tarde.', 'error');
    }
  }

  private loadProyectoCurricularNombre(id: number): void {
    if (!id) {
      this.pcNombre = 'Proyecto curricular sin especificar';
      return;
    }
    this.catalogos.getNombreProyectoCurricular(id).subscribe({
      next: (nombre) => {
        this.pcNombre = nombre || `Proyecto curricular #${id}`;
      },
      error: () => {
        this.pcNombre = `Proyecto curricular #${id}`;
      },
    });
  }

  private bootstrapContext(): void {
    const ctx = this.readJson('castor_estudiante_ctx');
    this.ctxNombre = ctx?.nombre || this.token.currentUser?.email || '';
    this.ctxCodigo = ctx?.codigo || this.token.codigo || '';
    this.ctxPcId = ctx?.carrera ? String(ctx.carrera) : '';

    if (this.ctxPcId) {
      this.catalogos.getNombreProyectoCurricular(this.ctxPcId).subscribe({
        next: (nombre) => (this.ctxPcNombre = nombre),
        error: () => (this.ctxPcNombre = null),
      });
    } else {
      this.ctxPcNombre = null;
    }
  }

  private readJson(key: string): any {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  buildCvLink(id: string | number | null | undefined): string | null {
    if (!id) {
      return null;
    }
    return `#cv/${id}`;
  }
}
