import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TutorDashboardService } from 'src/app/@core/services/tutor/tutor-dashboard.service';
import { EstadoChipComponent } from '../../components/estado-chip/estado-chip.component';

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
  ],
  templateUrl: './tutor-oferta-detalle.component.html',
  styleUrls: ['./tutor-oferta-detalle.component.scss'],
})
export class TutorOfertaDetalleComponent implements OnInit {
  ofertaId: number | null = null;
  loading = true;
  errorMessage = '';
  postulaciones: any[] = [];
  estadoSeleccionado = 'TODOS';
  estadosDisponibles: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tutorDashboard: TutorDashboardService,
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
      void this.loadPostulaciones(parsed);
    });
  }

  get postulacionesFiltradas(): any[] {
    if (this.estadoSeleccionado === 'TODOS') {
      return this.postulaciones;
    }
    return this.postulaciones.filter(
      (postulacion) => this.getEstadoCodigo(postulacion) === this.estadoSeleccionado
    );
  }

  goBack(): void {
    this.router.navigateByUrl('/pages/tutor/dashboard');
  }

  getPostulanteNombre(postulacion: any): string {
    const nombre =
      postulacion?.NombreCompleto ||
      postulacion?.nombre_completo ||
      postulacion?.Nombre ||
      postulacion?.nombre ||
      '';
    return String(nombre).trim() || 'Estudiante';
  }

  getEstadoCodigo(postulacion: any): string {
    return String(
      postulacion?.estado?.Codigo ||
      postulacion?.Estado?.Codigo ||
      postulacion?.estado_codigo ||
      postulacion?.EstadoCodigo ||
      postulacion?.estado ||
      postulacion?.Estado ||
      ''
    );
  }

  private async loadPostulaciones(ofertaId: number): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(this.tutorDashboard.getPostulacionesByOfertaId(ofertaId));
      const data = (response as any)?.Data ?? response ?? [];
      this.postulaciones = Array.isArray(data) ? data : [];
      this.estadosDisponibles = this.buildEstadosDisponibles(this.postulaciones);
    } catch (error) {
      console.error('[TutorOfertaDetalle] load error', error);
      this.errorMessage = 'No pudimos cargar las postulaciones.';
      this.postulaciones = [];
      this.estadosDisponibles = [];
    } finally {
      this.loading = false;
    }
  }

  private buildEstadosDisponibles(postulaciones: any[]): string[] {
    const estados = new Set<string>();
    postulaciones.forEach((postulacion) => {
      const codigo = this.getEstadoCodigo(postulacion);
      if (codigo) {
        estados.add(codigo);
      }
    });
    return Array.from(estados);
  }
}
