import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  InvitacionesEstudianteService,
  InvitacionEstudianteItem,
  InvitacionEstudianteBandeja,
} from 'src/app/@core/services/invitaciones-estudiante.service';

import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';
import { EstudianteDashboardService } from 'src/app/@core/services/estudiante-dashboard.service'; // ✅

type EstadoChip = { label: string; value: string | null };

@Component({
  standalone: true,
  selector: 'app-invitaciones-estudiante',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './invitaciones-estudiante.component.html',
  styleUrls: ['./invitaciones-estudiante.component.scss'],
})
export class InvitacionesEstudianteComponent implements OnInit {
  invitaciones: InvitacionEstudianteItem[] = [];

  total = 0;
  page = 1;
  size = 10;

  estado: string | null = null;

  cargando = false;
  expandedId: number | null = null;

  // ✅ reglas globales
  pasanteActivo = false;
  existeAceptada = false;

  estadoChips: EstadoChip[] = [
    { label: 'Todas', value: null },
    { label: 'Enviadas', value: 'INV_ENV_CTR' },
    { label: 'Aceptadas', value: 'INV_ACE_CTR' },
    { label: 'Rechazadas', value: 'INV_REC_CTR' },
    { label: 'Expiradas', value: 'INV_EXP_CTR' },
    { label: 'Canceladas', value: 'INV_CAN_CTR' },
  ];

  constructor(
    private invitacionesService: InvitacionesEstudianteService,
    private token: TokenService,
    private userContext: UserContextService,
    private dashboardService: EstudianteDashboardService, // ✅
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    void this.bootstrapFlagsAndLoad();
  }

  private async bootstrapFlagsAndLoad(): Promise<void> {
    const estudianteId = this.resolveTerceroIdAsEstudianteId();
    if (!estudianteId) {
      console.warn('[INVITACIONES] No pude resolver estudianteId (tercero_id).');
      return;
    }

    // 1) Pasante activo (desde dashboard MID, igual que Home)
    try {
      const dash = await firstValueFrom(
        this.dashboardService.getDashboard(estudianteId).pipe(catchError(() => of(null))),
      );
      const resumen: any = (dash as any)?.resumen ?? {};
      this.pasanteActivo = Boolean(resumen?.pasante_activo);
    } catch {
      this.pasanteActivo = false; // fallback seguro
    }

    // 2) Cargar bandeja
    await this.load(1);
  }

  async load(page = this.page): Promise<void> {
    this.cargando = true;
    this.page = page;

    const estudianteId = this.resolveTerceroIdAsEstudianteId();
    if (!estudianteId) {
      this.cargando = false;
      return;
    }

    try {
      const resp: InvitacionEstudianteBandeja = await firstValueFrom(
        this.invitacionesService
          .getBandeja(estudianteId, this.estado ?? undefined, this.page, this.size)
          .pipe(
            catchError((err) => {
              console.warn('[INVITACIONES] Error cargando bandeja', err);
              return of({
                items: [],
                total: 0,
                page: this.page,
                size: this.size,
              } as InvitacionEstudianteBandeja);
            }),
          ),
      );

      this.invitaciones = resp?.items ?? [];
      this.total = resp?.total ?? 0;

      // ✅ si existe alguna aceptada, bloquea acciones globalmente
      this.existeAceptada = this.invitaciones.some((x) => this.isAceptada(x));

      if (this.expandedId != null && !this.invitaciones.some((x) => x?.id === this.expandedId)) {
        this.expandedId = null;
      }
    } finally {
      this.cargando = false;
    }
  }

  setEstadoFilter(value: string | null): void {
    this.estado = value;
    this.expandedId = null;
    void this.load(1);
  }

  goDetalle(id: number): void {
    if (!id) return;
    this.router.navigate(['/pages/estudiante/invitaciones', id]);
  }

  // ---- acciones ----

  async aceptar(invId: number, evt?: Event): Promise<void> {
    evt?.stopPropagation();
    if (!this.canActById(invId)) return;

    const terceroId = this.resolveTerceroIdAsEstudianteId();
    if (!terceroId) return;

    await firstValueFrom(
      this.invitacionesService.aceptar(invId, terceroId).pipe(
        catchError((err) => {
          console.error('[INVITACIONES] Error aceptando', err);
          return of(null);
        }),
      ),
    );

    await this.load(this.page);
  }

  async rechazar(invId: number, evt?: Event): Promise<void> {
    evt?.stopPropagation();
    if (!this.canActById(invId)) return;

    const terceroId = this.resolveTerceroIdAsEstudianteId();
    if (!terceroId) return;

    await firstValueFrom(
      this.invitacionesService.rechazar(invId, terceroId).pipe(
        catchError((err) => {
          console.error('[INVITACIONES] Error rechazando', err);
          return of(null);
        }),
      ),
    );

    await this.load(this.page);
  }

  // ✅ habilita/deshabilita por invitación + reglas globales
  canAct(inv: any): boolean {
    if (this.pasanteActivo) return false;
    if (this.existeAceptada) return false;
    return this.isEnviada(inv);
  }

  private canActById(invId: number): boolean {
    const inv = this.invitaciones.find((x) => x.id === invId);
    return inv ? this.canAct(inv) : false;
  }

  // ---- colores ----

  getCardTone(inv: any): string {
    if (this.isAceptada(inv)) return 'tone-accepted';
    if (this.isRechazada(inv)) return 'tone-rejected';
    if (this.isEnviada(inv)) return 'tone-sent';
    return 'tone-default';
  }

  // ---- normalización de estado ----
  private getEstadoRaw(inv: any): string {
    return String(inv?.estado_det?.code ?? inv?.estado_raw ?? inv?.estado ?? '').toUpperCase().trim();
  }

  private isEnviada(inv: any): boolean {
    const s = this.getEstadoRaw(inv);
    return s === 'ENVIADA' || s === 'INV_ENV_CTR';
  }

  private isAceptada(inv: any): boolean {
    const s = this.getEstadoRaw(inv);
    return s === 'ACEPTADA' || s === 'INV_ACE_CTR';
  }

  private isRechazada(inv: any): boolean {
    const s = this.getEstadoRaw(inv);
    return s === 'RECHAZADA' || s === 'INV_REC_CTR';
  }

  displayFecha(raw: any): string {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return String(raw);
      return d.toLocaleString();
    } catch {
      return String(raw);
    }
  }

  // paginación simple
  get totalPages(): number {
    const s = Number(this.size || 10);
    const t = Number(this.total || 0);
    if (!s || !t) return 1;
    return Math.max(1, Math.ceil(t / s));
  }

  prevPage(): void {
    if (this.page > 1) void this.load(this.page - 1);
  }

  nextPage(): void {
    if (this.page < this.totalPages) void this.load(this.page + 1);
  }

  // ✅ topbar
  volver(): void {
    this.router.navigateByUrl('/pages/home');
  }

  irDashboard(): void {
    this.router.navigateByUrl('/pages/home');
  }

  private resolveTerceroIdAsEstudianteId(): number | null {
  const ctx = this.userContext.getEstudianteContext();
  const currentUser = this.token.currentUser as any;

  // ✅ 1) query param (lo que te está llegando)
  const qp = this.route.snapshot.queryParamMap.get('tercero_id');

  // ✅ 2) localStorage (por si existe)
  let storedTercero: any = null;
  try {
    const raw = localStorage.getItem('castor_estudiante_ctx');
    storedTercero = raw ? JSON.parse(raw)?.tercero_id : null;
  } catch {
    storedTercero = null;
  }

  const terceroId =
    qp ??
    ctx?.tercero_id ??
    storedTercero ??
    currentUser?.rawTokenPayload?.tercero_id ??
    currentUser?.tercero_id ??
    null;

  const id = Number(terceroId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

}
