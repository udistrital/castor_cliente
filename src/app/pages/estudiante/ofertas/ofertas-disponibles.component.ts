import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';
import {
  OfertasEstudianteService,
  OfertaDisponibleItem,
} from 'src/app/@core/services/ofertas-estudiante.service';

@Component({
  selector: 'app-ofertas-disponibles',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './ofertas-disponibles.component.html',
  styleUrls: ['./ofertas-disponibles.component.scss'],
})
export class OfertasDisponiblesComponent implements OnInit {
  ofertas: OfertaDisponibleItem[] = [];
  cargando = false;
  errorMessage = '';

  total = 0;
  page = 1;
  size = 9;

  constructor(
    private ofertasService: OfertasEstudianteService,
    private userContext: UserContextService,
    private token: TokenService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    void this.loadOfertas(1);
  }

  async loadOfertas(page = this.page): Promise<void> {
    const estudianteId = this.resolveEstudianteId();
    if (!estudianteId) {
      this.ofertas = [];
      this.total = 0;
      this.errorMessage = 'No pudimos identificar tu usuario. Vuelve a iniciar sesión.';
      return;
    }
    try {
      this.cargando = true;
      this.errorMessage = '';
      this.page = page;
      const resp = await firstValueFrom(
        this.ofertasService
          .getOfertasDisponibles(estudianteId, this.page, this.size)
          .pipe(
            catchError((err) => {
              console.warn('[OFERTAS] Error cargando disponibles', err);
              return of(null);
            }),
          ),
      );
      const data = (resp as any)?.Data ?? resp;
      this.ofertas = Array.isArray(data) ? data : (data?.items ?? []);
      this.total = Number(data?.total ?? this.ofertas.length ?? 0);
      this.page = Number(data?.page ?? this.page);
      this.size = Number(data?.size ?? this.size);
    } finally {
      this.cargando = false;
    }
  }

  goDetalle(id: number): void {
    if (!id) return;
    this.router.navigate(['/pages/estudiante/ofertas', id]);
  }

  volver(): void {
    this.router.navigateByUrl('/pages/home');
  }

  formatDateHuman(raw: any): string {
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

  getEstadoNombre(oferta: any): string {
    return (
      oferta?.estado_det?.nombre ||
      oferta?.estado_det?.Nombre ||
      oferta?.estado ||
      'Creada/Publicada'
    );
  }

  getEmpresaNombre(oferta: any): string {
    const nombre =
      oferta?.empresa_detalle?.nombre_completo ||
      oferta?.empresa_detalle?.NombreCompleto ||
      oferta?.empresa_nombre ||
      oferta?.empresa?.nombre ||
      oferta?.empresa?.Nombre ||
      '';
    if (String(nombre).trim()) {
      return String(nombre).trim();
    }
    const empresaId = oferta?.empresa_id || oferta?.empresaId || oferta?.empresa?.id;
    return empresaId ? `Empresa #${empresaId}` : 'Empresa';
  }

  getOfertaId(oferta: any): number | null {
    const raw = oferta?.id || oferta?.Id || oferta?.oferta_id || oferta?.ofertaId || null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  get totalPages(): number {
    const s = Number(this.size || 9);
    const t = Number(this.total || 0);
    if (!s || !t) return 1;
    return Math.max(1, Math.ceil(t / s));
  }

  prevPage(): void {
    if (this.page > 1) void this.loadOfertas(this.page - 1);
  }

  nextPage(): void {
    if (this.page < this.totalPages) void this.loadOfertas(this.page + 1);
  }

  private resolveEstudianteId(): number | null {
    // userContext
    const ctx: any = this.userContext.getEstudianteContext();
    const ctxId = ctx?.tercero_id ?? ctx?.estudiante_id ?? null;
    if (ctxId) {
      const id = Number(ctxId);
      if (Number.isFinite(id) && id > 0) return id;
    }

    // localStorage castor_estudiante_ctx
    try {
      const raw = localStorage.getItem('castor_estudiante_ctx');
      const stored = raw ? JSON.parse(raw) : null;
      const storedId = stored?.tercero_id ?? stored?.estudiante_id ?? null;
      if (storedId) {
        const id = Number(storedId);
        if (Number.isFinite(id) && id > 0) return id;
      }
    } catch {
      // ignore
    }

    console.warn('[OFERTAS DISP] No se pudo resolver estudianteId (tercero_id).');
    return null;
  }
}
