import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { GlobalLoadingOverlayComponent } from '../../@shared/components/global-loading-overlay.component';
import { TokenService } from '../../@core/services/auth/token.service';
import { LoadingService } from '../../@core/services/ui/loading.service';
import { EstudiantesService } from '../../@core/services/estudiantes.service';
import { CatalogosService } from '../../@core/services/catalogos/catalogos.service';
import { UserContextService } from '../../@core/services/user-context.service';
import { PerfilEstudiante } from '../../@core/models/perfil.model';
import { AcademicService } from 'src/app/@core/services/academica/academic.service';
import { DependenciasService } from 'src/app/@core/services/dependencias/dependencias.service';
import { take } from 'rxjs/operators';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';


@Component({
  standalone: true,
  selector: 'app-home-estudiante',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    GlobalLoadingOverlayComponent,
  ],
  templateUrl: './home-estudiante.component.html',
  styleUrls: ['./home-estudiante.component.scss'],
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
    private academica: AcademicService,
    private dependencias: DependenciasService,
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
        const resolved = nombre || `Proyecto curricular #${id}`;
        this.pcNombre = resolved;
        this.ctxPcNombre = resolved;
      },
      error: () => {
        const fallback = `Proyecto curricular #${id}`;
        this.pcNombre = fallback;
        this.ctxPcNombre = fallback;
      },
    });
  }

  private bootstrapContext(): void {
    const ctx = this.readJson('castor_estudiante_ctx');
    this.ctxNombre = (ctx?.nombre || '').toString().trim();
    this.ctxCodigo = ctx?.codigo || this.token.codigo || '';
    this.ctxPcId = ctx?.carrera ? String(ctx.carrera) : '';

    // Si el contexto no trae nombre (y tenemos código), lo traemos desde Académica
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

            // opcional: persistir para no pedirlo cada vez
            const currentCtx = this.readJson('castor_estudiante_ctx') || {};
            localStorage.setItem(
              'castor_estudiante_ctx',
              JSON.stringify({ ...currentCtx, nombre }),
            );
          }
        });
    }


    if (this.ctxPcId) {
      const codigo = Number(this.ctxPcId);
      if (Number.isFinite(codigo) && codigo > 0) {
        this.dependencias.getProyectoNombrePorCodigo(codigo).subscribe({
          next: (nombre) => (this.ctxPcNombre = nombre),
          error: () => (this.ctxPcNombre = null),
        });
      } else {
        this.ctxPcNombre = null;
      }
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

  get habilidadesList(): string[] {
  const h: any = this.perfil?.habilidades;

  if (!h) return [];

  const list = Array.isArray(h)
    ? h
    : String(h).split(',');

  return list
    .map((x) => String(x ?? '').trim())
    .filter((x) => x.length > 0);
  }

}
