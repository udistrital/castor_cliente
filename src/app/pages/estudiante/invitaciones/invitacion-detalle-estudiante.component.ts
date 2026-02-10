import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

import { InvitacionesEstudianteService, InvitacionEstudianteItem } from 'src/app/@core/services/invitaciones-estudiante.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';
import { EstudianteDashboardService } from 'src/app/@core/services/estudiante-dashboard.service';

type EstadoUI = 'ENVIADA' | 'ACEPTADA' | 'RECHAZADA' | 'OTRO';

@Component({
  selector: 'app-invitacion-detalle-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  templateUrl: './invitacion-detalle-estudiante.component.html',
  styleUrls: ['./invitacion-detalle-estudiante.component.scss'],
})
export class InvitacionDetalleEstudianteComponent implements OnInit {
  id: number | null = null;
  invitacion: any | null = null; // viene enriquecida: oferta_detalle, empresa_detalle, tutor_detalle

  cargando = false;
  error = '';

  pasanteActivo = false;
  yaAceptoAlguna = false;

  // UX helper
  disabledReason = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invitacionesService: InvitacionesEstudianteService,
    private token: TokenService,
    private userContext: UserContextService,
    private dashboardService: EstudianteDashboardService,
  ) {}

  async ngOnInit(): Promise<void> {
    const raw = this.route.snapshot.paramMap.get('id');
    const parsed = raw ? Number(raw) : null;
    this.id = Number.isFinite(parsed as number) ? (parsed as number) : null;

    if (!this.id) {
      this.error = 'ID inválido.';
      return;
    }

    await this.cargarDetalle();
  }

  // ---------- navegación ----------
  volver(): void {
    this.router.navigate(['/pages/estudiante/invitaciones'], { queryParamsHandling: 'preserve' });
  }

  // ---------- carga ----------
  async cargarDetalle(): Promise<void> {
    const estudianteId = this.resolveTerceroId();
    if (!estudianteId) {
      this.error = 'No fue posible identificar tu usuario.';
      return;
    }

    this.cargando = true;
    this.error = '';
    this.disabledReason = '';

    try {
      // 1) flags globales
      const dash = await firstValueFrom(
        this.dashboardService.getDashboard(estudianteId).pipe(catchError(() => of(null))),
      );
      const resumen: any = (dash as any)?.resumen ?? null;
      this.pasanteActivo = Boolean(resumen?.pasante_activo);

      // 2) regla global: si ya aceptó alguna invitación, no permitir más acciones
      const bandeja = await firstValueFrom(
        this.invitacionesService.getBandeja(estudianteId, undefined, 1, 200).pipe(
          catchError(() => of({ items: [], total: 0, page: 1, size: 200 })),
        ),
      );
      this.yaAceptoAlguna = (bandeja.items || []).some((x: any) => {
        const raw = String(x?.estado_raw ?? x?.estado ?? '').toUpperCase().trim();
        return raw === 'ACEPTADA' || raw === 'INV_ACE_CTR';
      });

      // 3) detalle
      const det = await firstValueFrom(
        this.invitacionesService.getDetalle(this.id!, estudianteId).pipe(catchError(() => of(null))),
      );

      // si el detalle falla, intentamos usar el item de bandeja
      this.invitacion =
        det ??
        (bandeja.items || []).find((x: any) => Number(x?.id) === this.id) ??
        null;

      if (!this.invitacion) {
        this.error = 'No encontramos la invitación.';
        return;
      }

      // recalcular reason de botones
      this.computeDisabledReason();
    } finally {
      this.cargando = false;
    }
  }

  // ---------- estado / UI ----------
  private estadoUI(): EstadoUI {
    const raw = String(this.invitacion?.estado_raw ?? this.invitacion?.estado ?? '').toUpperCase().trim();
    if (raw === 'INV_ENV_CTR' || raw === 'ENVIADA') return 'ENVIADA';
    if (raw === 'INV_ACE_CTR' || raw === 'ACEPTADA') return 'ACEPTADA';
    if (raw === 'INV_REC_CTR' || raw === 'RECHAZADA') return 'RECHAZADA';
    return 'OTRO';
  }

  estadoNombre(): string {
    const n = String(this.invitacion?.estado_det?.nombre ?? this.invitacion?.estado ?? '').trim();
    return n || 'Estado';
  }

  estadoCss(): string {
    const st = this.estadoUI();
    if (st === 'ENVIADA') return 'estado-enviada';
    if (st === 'ACEPTADA') return 'estado-aceptada';
    if (st === 'RECHAZADA') return 'estado-rechazada';
    return 'estado-otro';
  }

  canAct(): boolean {
    if (!this.invitacion) return false;
    if (this.pasanteActivo) return false;
    if (this.yaAceptoAlguna) return false;
    return this.estadoUI() === 'ENVIADA';
  }

  private computeDisabledReason(): void {
    if (!this.invitacion) {
      this.disabledReason = '';
      return;
    }
    if (this.pasanteActivo) {
      this.disabledReason = 'Tienes una pasantía activa, por eso no puedes responder invitaciones.';
      return;
    }
    if (this.yaAceptoAlguna && this.estadoUI() !== 'ACEPTADA') {
      this.disabledReason = 'Ya aceptaste una invitación. No puedes aceptar o rechazar otras.';
      return;
    }
    const st = this.estadoUI();
    if (st === 'ACEPTADA') {
      this.disabledReason = 'Esta invitación ya fue aceptada.';
      return;
    }
    if (st === 'RECHAZADA') {
      this.disabledReason = 'Esta invitación ya fue rechazada.';
      return;
    }
    this.disabledReason = '';
  }

  // ---------- acciones ----------
  async aceptar(): Promise<void> {
    if (!this.id || !this.canAct()) return;
    const terceroId = this.resolveTerceroId();
    if (!terceroId) return;

    await firstValueFrom(this.invitacionesService.aceptar(this.id, terceroId).pipe(catchError(() => of(null))));
    await this.cargarDetalle();
  }

  async rechazar(): Promise<void> {
    if (!this.id || !this.canAct()) return;
    const terceroId = this.resolveTerceroId();
    if (!terceroId) return;

    await firstValueFrom(this.invitacionesService.rechazar(this.id, terceroId).pipe(catchError(() => of(null))));
    await this.cargarDetalle();
  }

  // ---------- display helpers ----------
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

  get empresaNombre(): string {
    return String(this.invitacion?.empresa_detalle?.nombre_completo ?? '').trim() || 'Empresa';
  }

  get tutorNombre(): string {
    return String(this.invitacion?.tutor_detalle?.nombre_completo ?? '').trim() || 'Tutor';
  }

  get oferta(): any {
    return this.invitacion?.oferta_detalle ?? null;
  }

  get ofertaTitulo(): string {
    return String(this.oferta?.titulo ?? this.invitacion?.oferta_resumen?.titulo ?? 'Oferta').trim();
  }

  get ofertaEstadoNombre(): string {
    return String(this.oferta?.estado_det?.nombre ?? this.oferta?.estado ?? '').trim() || 'Estado oferta';
  }

  private resolveTerceroId(): number | null {
    const ctx = this.userContext.getEstudianteContext();
    const currentUser = this.token.currentUser as any;

    const qp = this.route.snapshot.queryParamMap.get('tercero_id');

    let stored: any = null;
    try {
      const raw = localStorage.getItem('castor_estudiante_ctx');
      stored = raw ? JSON.parse(raw)?.tercero_id : null;
    } catch {}

    const terceroId =
      qp ??
      ctx?.tercero_id ??
      stored ??
      currentUser?.rawTokenPayload?.tercero_id ??
      currentUser?.tercero_id ??
      null;

    const id = Number(terceroId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }
}
