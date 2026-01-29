import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  // filtro
  estado: string | null = null;

  // UI
  cargando = false;
  expandedId: number | null = null;

  // chips (puedes ajustar labels si ya tienes parámetro bonito)
  estadoChips: EstadoChip[] = [
    { label: 'Todas', value: null },
    { label: 'Enviadas', value: 'ENVIADA' },
    { label: 'Aceptadas', value: 'ACEPTADA' },
    { label: 'Rechazadas', value: 'RECHAZADA' },
    { label: 'Expiradas', value: 'EXPIRADA' },
    { label: 'Canceladas', value: 'CANCELADA' },
  ];

  constructor(
    private invitacionesService: InvitacionesEstudianteService,
    private token: TokenService,
    private userContext: UserContextService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load(1);
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

      // si lo que estaba expandido ya no existe, colapsa
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
    this.load(1);
  }

  toggleDetalle(inv: InvitacionEstudianteItem): void {
    const id = Number((inv as any)?.id ?? 0);
    if (!id) return;
    this.expandedId = this.expandedId === id ? null : id;
  }

  goDetalle(id: number): void {
    if (!id) return;
    this.router.navigate(['/pages/estudiante/invitaciones', id]);
  }

  // ---- acciones ----

  async aceptar(invId: number, evt?: Event): Promise<void> {
    evt?.stopPropagation();
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

  canAct(inv: any): boolean {
    const raw = String(inv?.estado_raw ?? inv?.estado ?? '').toUpperCase().trim();
    return raw === 'ENVIADA';
  }

  // ---- helpers visuales ----

  getTitle(inv: any): string {
    return (
      String(inv?.oferta_resumen?.titulo ?? '').trim() ||
      String(inv?.oferta ?? '').trim() ||
      (inv?.oferta_pasantia_id ? `Oferta #${inv.oferta_pasantia_id}` : `Invitación #${inv?.id ?? '—'}`)
    );
  }

  getEstadoLabel(inv: any): string {
    // si ya llega estado_det.nombre, úsalo; si no, usa estado
    const det = String(inv?.estado_det?.nombre ?? '').trim();
    return det || String(inv?.estado ?? '—').trim() || '—';
  }

  getFecha(inv: any): any {
    // tu response trae fecha_creacion/fecha_estado (y en home usabas inv.fecha)
    return inv?.fecha ?? inv?.fecha_estado ?? inv?.fecha_creacion ?? null;
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
    if (this.page > 1) this.load(this.page - 1);
  }

  nextPage(): void {
    if (this.page < this.totalPages) this.load(this.page + 1);
  }

  private resolveTerceroIdAsEstudianteId(): number | null {
    const ctx = this.userContext.getEstudianteContext();
    const currentUser = this.token.currentUser as any;

    const terceroId =
      ctx?.tercero_id ??
      currentUser?.rawTokenPayload?.tercero_id ??
      currentUser?.tercero_id ??
      null;

    const id = Number(terceroId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }

  
}
