import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import {
  PostulacionesEstudianteService,
  PostulacionDetalle,
} from 'src/app/@core/services/postulaciones-estudiante.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';
import { OfertasEstudianteService } from 'src/app/@core/services/ofertas-estudiante.service';
import { TercerosService } from 'src/app/@core/services/terceros.service';

@Component({
  selector: 'app-postulacion-detalle-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './postulacion-detalle-estudiante.component.html',
  styleUrls: ['./postulacion-detalle-estudiante.component.scss'],
})
export class PostulacionDetalleEstudianteComponent implements OnInit {
  id: number | null = null;
  loading = false;
  detalle: any | null = null;
  estudianteId: number | null = null;
  oferta: any | null = null;
  empresaNombre: string | null = null;
  readonly fromSource: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postulacionesService: PostulacionesEstudianteService,
    private alert: AlertService,
    private token: TokenService,
    private userContext: UserContextService,
    private ofertasService: OfertasEstudianteService,
    private tercerosService: TercerosService,
  ) {
    const raw = this.route.snapshot.paramMap.get('id');
    const parsed = raw ? Number(raw) : null;
    this.id = Number.isFinite(parsed as number) ? (parsed as number) : null;
    this.fromSource =
      this.route.snapshot.queryParamMap.get('from') ||
      (this.router.getCurrentNavigation()?.extras?.state as any)?.from ||
      (history?.state as any)?.from ||
      '';
  }

  ngOnInit(): void {
    this.estudianteId = this.resolveEstudianteId();
    if (!this.estudianteId) {
      this.alert.error('Error', 'No pudimos identificar tu usuario.');
      this.router.navigate(['/pages/check']);
      return;
    }
    if (!this.id) {
      this.alert.error('Error', 'No pudimos cargar la postulación.');
      return;
    }
    this.fetchDetalle(this.estudianteId, this.id);
  }

  volver(): void {
    this.router.navigate(['/pages/estudiante/postulaciones']);
  }

  verOferta(): void {
    const ofertaId = this.detalle?.oferta_resumen?.id ?? this.detalle?.oferta_id;
    if (!ofertaId) {
      return;
    }
    this.router.navigate(['/pages/estudiante/ofertas', ofertaId]);
  }

  aceptarSeleccion(): void {
    if (!this.estudianteId || !this.id) {
      return;
    }
    this.loading = true;
    this.postulacionesService.aceptarSeleccion(this.estudianteId, this.id).subscribe({
      next: () => {
        this.alert.success('Listo', 'Aceptamos tu selección.');
        this.fetchDetalle(this.estudianteId as number, this.id as number);
      },
      error: (err) => {
        this.loading = false;
        console.warn('[POSTULACIONES] Error aceptando selección', err);
        this.alert.error('Error', 'No pudimos aceptar tu selección.');
      },
    });
  }

  cancelarPostulacion(): void {
    if (!this.estudianteId || !this.id) {
      return;
    }
    this.loading = true;
    this.postulacionesService.cancelar(this.estudianteId, this.id).subscribe({
      next: () => {
        this.loading = false;
        this.alert.success('Listo', 'Postulación cancelada.');
        this.router.navigate(['/pages/estudiante/postulaciones']);
      },
      error: (err) => {
        this.loading = false;
        console.warn('[POSTULACIONES] Error cancelando', err);
        this.alert.error('Error', 'No pudimos cancelar tu postulación.');
      },
    });
  }

  puedeAceptarSeleccion(): boolean {
    const code = this.detalle?.estado_det?.code ?? this.detalle?.estado ?? '';
    const normalized = String(code).toUpperCase();
    return normalized.includes('SELECCIONADO') || normalized.includes('SELECCIONAR');
  }

  puedeCancelar(): boolean {
    const code = this.detalle?.estado_det?.code ?? this.detalle?.estado ?? '';
    const normalized = String(code).toUpperCase().trim();
    return normalized === 'PSPO_CTR' || normalized === 'PSRV_CTR';
  }

  displayFecha(raw: any): string {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return String(raw);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(raw);
    }
  }

  getEstadoNombre(): string {
    return (
      this.detalle?.estado_det?.nombre ||
      (this.detalle as any)?.Estado?.nombre ||
      this.detalle?.estado ||
      'Postulado'
    );
  }

  getOfertaTitulo(): string {
    return (
      this.oferta?.titulo ||
      this.detalle?.oferta_resumen?.titulo ||
      (this.detalle?.oferta_id ? `Oferta #${this.detalle?.oferta_id}` : 'Oferta')
    );
  }

  getTutorNombre(): string {
    const nombre =
      this.oferta?.tutor_detalle?.nombre_completo ||
      this.oferta?.tutor_detalle?.NombreCompleto ||
      this.oferta?.tutor_nombre ||
      '';
    if (String(nombre).trim()) return String(nombre).trim();
    const tutorId = this.oferta?.tutor_id ?? this.oferta?.tutorId;
    return tutorId ? `Tutor #${tutorId}` : 'Tutor';
  }

  private fetchDetalle(estudianteId: number, id: number): void {
    this.loading = true;
    this.postulacionesService.getDetalle(estudianteId, id).subscribe({
      next: (resp) => {
        this.detalle = resp;
        this.loadOferta(resp?.oferta_id ?? resp?.oferta_resumen?.id);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.warn('[POSTULACIONES] Error cargando detalle', err);
        this.alert.error('Error', 'No pudimos cargar el detalle de la postulación.');
      },
    });
  }

  private loadOferta(ofertaId?: number): void {
    if (!ofertaId) {
      this.oferta = null;
      this.empresaNombre = null;
      return;
    }
    this.ofertasService.getDetalle(ofertaId).subscribe({
      next: (resp) => {
        this.oferta = resp ?? null;
        const empresaId = resp?.empresa_id ?? resp?.empresaId;
        if (empresaId) {
          this.loadEmpresa(Number(empresaId));
        } else {
          this.empresaNombre = null;
        }
      },
      error: () => {
        this.oferta = null;
      },
    });
  }

  private loadEmpresa(empresaId: number): void {
    this.tercerosService.getEmpresaById(empresaId).subscribe({
      next: (empresa) => {
        this.empresaNombre = this.formatEmpresaNombre(empresa);
      },
      error: () => {
        this.empresaNombre = null;
      },
    });
  }

  private formatEmpresaNombre(empresa: any): string | null {
    return (
      empresa?.NombreCompleto ||
      empresa?.RazonSocial ||
      empresa?.razon_social ||
      empresa?.nombre ||
      null
    );
  }

  private resolveEstudianteId(): number | null {
    const stored = this.readJson('castor_estudiante_ctx');
    const ctx = this.userContext.getEstudianteContext();
    const currentUser = this.token.currentUser as any;

    const terceroId =
      ctx?.tercero_id ??
      stored?.tercero_id ??
      currentUser?.rawTokenPayload?.tercero_id ??
      currentUser?.tercero_id ??
      null;

    const parsed = Number(terceroId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private readJson(key: string): any {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
