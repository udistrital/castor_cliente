import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TutorPostulacionesService } from 'src/app/@core/services/tutor/tutor-postulaciones.service';
import { EstadoChipComponent } from '../components/estado-chip/estado-chip.component';

@Component({
  selector: 'app-oferta-postulaciones',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    EstadoChipComponent,
  ],
  templateUrl: './oferta-postulaciones.component.html',
  styleUrls: ['./oferta-postulaciones.component.scss'],
})
export class OfertaPostulacionesComponent implements OnInit {
  ofertaId: string | null = null;
  loading = true;
  errorMessage = '';
  postulaciones: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postulacionesService: TutorPostulacionesService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.errorMessage = 'No se encontro la oferta solicitada.';
        this.loading = false;
        return;
      }
      this.ofertaId = id;
      void this.loadPostulaciones(id);
    });
  }

  async loadPostulaciones(ofertaId: string): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(
        this.postulacionesService.obtenerPostulaciones(ofertaId)
      );
      this.postulaciones = this.normalizePostulaciones(response);
    } catch (error) {
      console.error('[OfertaPostulaciones] load error', error);
      this.errorMessage = 'No pudimos cargar las postulaciones.';
      this.postulaciones = [];
    } finally {
      this.loading = false;
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/pages/tutor/dashboard');
  }

  getPostulacionId(postulacion: any): string {
    return String(
      postulacion?.id ||
      postulacion?.Id ||
      postulacion?.postulacion_id ||
      postulacion?.PostulacionId ||
      'N/D'
    );
  }

  getPostulanteNombre(postulacion: any): string {
    const completo =
      postulacion?.NombreCompleto ||
      postulacion?.nombre_completo ||
      postulacion?.nombre ||
      postulacion?.Nombre ||
      '';
    if (String(completo).trim()) {
      return String(completo).trim();
    }
    const partes = [
      postulacion?.PrimerNombre,
      postulacion?.SegundoNombre,
      postulacion?.PrimerApellido,
      postulacion?.SegundoApellido,
    ].filter(Boolean);
    return partes.length ? partes.join(' ').trim() : 'Postulante';
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

  private normalizePostulaciones(payload: any): any[] {
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
    if (Array.isArray(payload?.Postulaciones)) {
      return payload.Postulaciones;
    }
    return [];
  }
}
