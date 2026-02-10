import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TutorPostulacionesService } from 'src/app/@core/services/tutor/tutor-postulaciones.service';
import { TutorContextService } from 'src/app/@core/services/tutor/tutor-context.service';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { EstadoChipComponent } from '../components/estado-chip/estado-chip.component';
import { PostulacionAccionDialogComponent } from '../components/dialogs/postulacion-accion.dialog';

@Component({
  selector: 'app-oferta-postulaciones',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    EstadoChipComponent,
  ],
  templateUrl: './oferta-postulaciones.component.html',
  styleUrls: ['./oferta-postulaciones.component.scss'],
})
export class OfertaPostulacionesComponent implements OnInit {
  ofertaId: string | null = null;
  tutorId: number | null = null;
  loading = true;
  errorMessage = '';
  postulaciones: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postulacionesService: TutorPostulacionesService,
    private tutorContext: TutorContextService,
    private alert: AlertService,
    private dialog: MatDialog,
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
      this.tutorContext.ensureLoaded().subscribe((ctx) => {
        this.tutorId = ctx?.tutor_id ?? null;
        if (!this.tutorId) {
          this.errorMessage = 'No pudimos identificar tu perfil de tutor.';
          this.loading = false;
          return;
        }
        void this.loadPostulaciones(id, this.tutorId);
      });
    });
  }

  async loadPostulaciones(ofertaId: string, tutorId: number): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    try {
      const response = await firstValueFrom(
        this.postulacionesService.listarPostulacionesOferta(Number(ofertaId), tutorId, undefined, 1, 200)
      );
      this.postulaciones = Array.isArray(response?.items) ? response.items : [];
    } catch (error) {
      console.error('[OfertaPostulaciones] load error', error);
      this.errorMessage = 'No pudimos cargar las postulaciones.';
      this.alert.error('Error', 'No pudimos cargar las postulaciones.');
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

  openAccionDialog(postulacion: any): void {
    if (!this.tutorId || !this.ofertaId) {
      this.alert.error('Error', 'No pudimos identificar tutor u oferta.');
      return;
    }
    const rawId = this.getPostulacionId(postulacion);
    const parsed = Number(rawId);
    const postulacionId = Number.isFinite(parsed) ? parsed : parseInt(String(rawId), 10);
    if (!Number.isFinite(postulacionId)) {
      this.alert.error('Error', 'No pudimos identificar la postulación.');
      return;
    }
    const estadoActual = this.getEstadoCodigo(postulacion);
    const ref = this.dialog.open(PostulacionAccionDialogComponent, {
      data: { postulacionId, estadoActual, tutorId: this.tutorId },
    });
    ref.afterClosed().subscribe((result) => {
      if (result === true && this.ofertaId && this.tutorId) {
        void this.loadPostulaciones(this.ofertaId, this.tutorId);
      }
    });
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
