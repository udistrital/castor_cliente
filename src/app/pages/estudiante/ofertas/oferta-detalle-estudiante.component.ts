import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { OfertasEstudianteService } from 'src/app/@core/services/ofertas-estudiante.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';
import { TercerosService } from 'src/app/@core/services/terceros.service';
import { PostulacionesEstudianteService } from 'src/app/@core/services/postulaciones-estudiante.service';

@Component({
  selector: 'app-oferta-detalle-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './oferta-detalle-estudiante.component.html',
  styleUrls: ['./oferta-detalle-estudiante.component.scss'],
})
export class OfertaDetalleEstudianteComponent implements OnInit {
  id: number | null = null;
  loading = false;
  oferta: any | null = null;
  empresaNombre: string | null = null;
  estudianteId: number | null = null;
  readonly fromSource: string;
  yaPostulado = false;
  postulacionId: number | null = null;
  postulacionEstadoNombre: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ofertasService: OfertasEstudianteService,
    private tercerosService: TercerosService,
    private token: TokenService,
    private userContext: UserContextService,
    private alert: AlertService,
    private postulacionesService: PostulacionesEstudianteService,
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
    if (!this.id) {
      this.alert.error('Error', 'No pudimos cargar la oferta.');
      return;
    }
    this.loadOferta(this.id);
    if (this.estudianteId) {
      this.checkPostulacion(this.estudianteId, this.id);
    }
  }

  volver(): void {
    if (this.fromSource === 'ofertas-disponibles') {
      this.router.navigate(['/pages/estudiante/ofertas']);
      return;
    }
    this.router.navigate(['/pages/home']);
  }

  postularme(): void {
    if (!this.id || !this.estudianteId) {
      return;
    }
    this.loading = true;
    this.ofertasService.postular(this.id, this.estudianteId).subscribe({
      next: () => {
        this.loading = false;
        this.alert.success('Listo', 'Postulación creada.');
        this.router.navigate(['/pages/estudiante/postulaciones']);
      },
      error: (err: any) => {
        this.loading = false;
        const message = String(err?.message ?? err?.error?.message ?? '');
        if (err?.status === 409 || message.toLowerCase().includes('postulado')) {
          this.alert.info('Información', 'Ya estabas postulado, te llevamos a tu postulación.');
          this.refreshPostulacionRedirect();
          return;
        }
        this.alert.error('Error', 'No pudimos postularte.');
      },
    });
  }

  verMiPostulacion(): void {
    if (!this.postulacionId) {
      return;
    }
    this.router.navigate(['/pages/estudiante/postulaciones', this.postulacionId]);
  }

  get canPostular(): boolean {
    if (this.loading) return false;
    if (!this.estudianteId) return false;
    if (this.yaPostulado) return false;
    return true;
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
      this.oferta?.estado_det?.nombre ||
      this.oferta?.estado_det?.Nombre ||
      this.oferta?.estado ||
      'Creada/Publicada'
    );
  }

  getEmpresaNombre(): string {
    if (this.empresaNombre) return this.empresaNombre;
    const empresaId = this.oferta?.empresa_id ?? this.oferta?.empresaId;
    return empresaId ? `Empresa #${empresaId}` : 'Empresa';
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

  private loadOferta(id: number): void {
    this.loading = true;
    this.ofertasService.getDetalle(id).subscribe({
      next: (resp) => {
        this.oferta = resp ?? null;
        const empresaId = resp?.empresa_id ?? resp?.empresaId;
        if (empresaId) {
          this.loadEmpresa(Number(empresaId));
        } else {
          this.empresaNombre = null;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.alert.error('Error', 'No pudimos cargar la oferta.');
      },
    });
  }

  private checkPostulacion(estudianteId: number, ofertaId: number): void {
    this.postulacionesService.findByOfertaId(estudianteId, ofertaId).subscribe({
      next: (post) => {
        this.yaPostulado = Boolean(post);
        this.postulacionId = post?.id ?? null;
        const estadoNombre = post?.Estado?.nombre ?? post?.estado ?? null;
        this.postulacionEstadoNombre = estadoNombre ? String(estadoNombre) : null;
      },
      error: () => {
        this.yaPostulado = false;
        this.postulacionId = null;
        this.postulacionEstadoNombre = null;
      },
    });
  }

  private refreshPostulacionRedirect(): void {
    if (!this.estudianteId || !this.id) {
      return;
    }
    this.postulacionesService.findByOfertaId(this.estudianteId, this.id).subscribe({
      next: (post) => {
        if (post?.id) {
          this.router.navigate(['/pages/estudiante/postulaciones', post.id]);
        }
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
