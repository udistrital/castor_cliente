import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import {
  InvitacionesTutorService,
  InvitacionTutorItem,
  InvitacionTutorBandeja,
} from 'src/app/@core/services/invitaciones-tutor.service';

import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';

type EstadoChip = { label: string; value: string | null };

@Component({
  standalone: true,
  selector: 'app-invitaciones-tutor',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './invitaciones-tutor.component.html',
  styleUrls: ['./invitaciones-tutor.component.scss'],
})
export class InvitacionesTutorComponent implements OnInit {
  readonly estudianteDetalleRouteBase = '/pages/tutor/explorar-estudiantes';
  tutorId = 0;
  invitaciones: InvitacionTutorItem[] = [];

  total = 0;
  page = 1;
  size = 20;

  estado: string | null = null;

  cargando = false;

  estadoChips: EstadoChip[] = [
    { label: 'Todas', value: null },
    { label: 'Enviadas', value: 'INV_ENV_CTR' },
    { label: 'Aceptadas', value: 'INV_ACE_CTR' },
    { label: 'Rechazadas', value: 'INV_REC_CTR' },
    { label: 'Canceladas', value: 'INV_CAN_CTR' }, // si existe en parámetros
  ];

  constructor(
    private service: InvitacionesTutorService,
    private token: TokenService,
    private userContext: UserContextService,
    private router: Router,
    private route: ActivatedRoute,
  ) {console.log('[TUTOR INVITACIONES] constructor');}

  ngOnInit(): void {
    console.log('[TUTOR INVITACIONES] ngOnInit');
    this.tutorId = this.resolveTutorId();
    console.log('[TUTOR INVITACIONES] tutorId resolved =', this.tutorId);
      if (this.tutorId > 0) {
      this.load(1);
    } else {
      // opcional: mostrar mensaje UI
      console.warn('[TUTOR INVITACIONES] No se pudo resolver tutorId');
    }
  }

  

  volver(): void {
    // ajusta si tu dashboard tutor está en otra ruta
    this.router.navigateByUrl('/pages/tutor/home');
  }

  async load(page = this.page): Promise<void> {
    this.cargando = true;
    this.page = page;

    const tutorId = this.resolveTutorId();
    if (!tutorId) {
      this.cargando = false;
      return;
    }

    try {
      const resp: InvitacionTutorBandeja = await firstValueFrom(
        this.service.getBandeja(tutorId, this.estado ?? undefined, this.page, this.size).pipe(
          catchError((err) => {
            console.warn('[TUTOR INVITACIONES] Error cargando bandeja', err);
            return of({ items: [], total: 0, page: this.page, size: this.size } as InvitacionTutorBandeja);
          }),
        ),
      );

      this.invitaciones = resp?.items ?? [];
      this.total = resp?.total ?? 0;
    } finally {
      this.cargando = false;
    }
  }

  setEstadoFilter(value: string | null): void {
    this.estado = value;
    this.load(1);
  }

  goDetalle(id: number): void {
    if (!id) return;
    // preserva queryParams si estás pasando tutor_id por URL en algún lado
    this.router.navigate(['/pages/tutor/invitaciones', id], { queryParamsHandling: 'preserve' });
  }

  goPerfil(inv: InvitacionTutorItem, evt?: Event): void {
    evt?.stopPropagation();
    if (!inv) return;
    const perfilRaw = (inv as any)?.estudiante_resumen?.perfil_id ?? inv?.perfil_estudiante_id ?? 0;
    const perfilId = Number(perfilRaw);
    if (!Number.isFinite(perfilId) || perfilId <= 0) return;

    const terceroRaw = (inv as any)?.estudiante_resumen?.tercero_id ?? 0;
    const terceroId = Number(terceroRaw);

    let tutorId = this.resolveTutorId() ?? 0;
    if (!Number.isFinite(tutorId) || tutorId <= 0) {
      const qpTutor = this.route.snapshot.queryParamMap.get('tutor_id');
      const qpTutorNum = qpTutor ? Number(qpTutor) : NaN;
      tutorId = Number.isFinite(qpTutorNum) ? qpTutorNum : 0;
    }

    this.router.navigate(['pages', 'tutor', 'explorar-estudiantes', perfilId], {
      queryParams: {
        from: 'invitaciones',
        ...(Number.isFinite(terceroId) && terceroId > 0 ? { tercero_id: terceroId } : {}),
        ...(Number.isFinite(tutorId) && tutorId > 0 ? { tutor_id: tutorId } : {}),
      },
    });
  }

  canCancelar(inv: InvitacionTutorItem): boolean {
    const raw = String(inv?.estado_raw ?? inv?.estado ?? '').toUpperCase().trim();
    return raw === 'INV_ENV_CTR' || raw === 'ENVIADA';
  }

  async cancelar(inv: InvitacionTutorItem, evt?: Event): Promise<void> {
    evt?.stopPropagation();

    const tutorId = this.resolveTutorId();
    if (!tutorId) return;

    if (!this.canCancelar(inv)) return;

    await firstValueFrom(
      this.service.cancelar(inv.id, tutorId).pipe(
        catchError((err) => {
          console.error('[TUTOR INVITACIONES] Error cancelando', err);
          return of(null);
        }),
      ),
    );

    await this.load(this.page);
  }

  estadoClass(inv: InvitacionTutorItem): string {
    const raw = String(inv?.estado_raw ?? inv?.estado ?? '').toUpperCase().trim();
    if (raw === 'INV_ACE_CTR' || raw === 'ACEPTADA') return 'estado-ok';
    if (raw === 'INV_REC_CTR' || raw === 'RECHAZADA') return 'estado-bad';
    if (raw === 'INV_CAN_CTR' || raw === 'CANCELADA') return 'estado-off';
    return 'estado-warn'; // enviada por defecto
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

  get totalPages(): number {
    const s = Number(this.size || 20);
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

  

  private resolveTutorId(): number | null {
    // 1) query param (por si lo estás pasando)
    const qp = this.route.snapshot.queryParamMap.get('tutor_id');

    // 2) context tutor (si ya lo guardas)
    const ctx: any = (this.userContext as any)?.getTutorContext?.() ?? null;

    // 3) token payload
    const currentUser: any = this.token.currentUser as any;

    const tutorId =
      qp ??
      ctx?.tutor_id ??
      ctx?.tercero_id ??
      currentUser?.rawTokenPayload?.tercero_id ??
      currentUser?.tercero_id ??
      null;

    const id = Number(tutorId);
    console.log('[TUTOR INVITACIONES] tutorId resolved =', tutorId, '=>', id);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }
}
