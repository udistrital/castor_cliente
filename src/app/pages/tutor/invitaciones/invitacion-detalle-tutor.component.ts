import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { InvitacionesTutorService, InvitacionTutorItem } from 'src/app/@core/services/invitaciones-tutor.service';
import { CatalogosService } from 'src/app/@core/services/catalogos/catalogos.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';

@Component({
  selector: 'app-invitacion-detalle-tutor',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './invitacion-detalle-tutor.component.html',
  styleUrls: ['./invitacion-detalle-tutor.component.scss'],
})
export class InvitacionDetalleTutorComponent implements OnInit {
  id: number | null = null;
  invitacion: InvitacionTutorItem | null = null;
  pcNombre = '';
  pcId: number | null = null;

  cargando = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: InvitacionesTutorService,
    private catalogos: CatalogosService,
    private token: TokenService,
    private userContext: UserContextService,
  ) {}

  async ngOnInit(): Promise<void> {
    const raw = this.route.snapshot.paramMap.get('id');
    const parsed = raw ? Number(raw) : null;
    this.id = Number.isFinite(parsed as number) ? (parsed as number) : null;

    if (!this.id) {
      this.error = 'ID inválido.';
      return;
    }

    await this.load();
  }

  volver(): void {
    this.router.navigate(['/pages/tutor/invitaciones'], { queryParamsHandling: 'preserve' });
  }

  private get estudianteSource(): any {
    return this.invitacion?.estudiante_detalle || (this.invitacion as any)?.estudiante_resumen || null;
  }

  get estudianteNombre(): string {
    return this.estudianteSource?.nombre_completo || '—';
  }

  get estudianteCarrera(): string {
    const detalle = this.invitacion?.estudiante_detalle;
    const resumen = (this.invitacion as any)?.estudiante_resumen;
    const nombre =
      this.pcNombre ||
      detalle?.proyecto_curricular_nombre ||
      resumen?.proyecto_curricular_nombre ||
      '';
    if (String(nombre).trim()) return String(nombre).trim();
    const pcId = Number(
      this.pcId ?? detalle?.proyecto_curricular_id ?? resumen?.proyecto_curricular_id ?? 0
    );
    return Number.isFinite(pcId) && pcId > 0 ? `Proyecto curricular #${pcId}` : '';
  }

  get estudiantePerfilId(): number | null {
    const id = Number(this.estudianteSource?.perfil_id ?? 0);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }

  get estudianteTerceroId(): number | null {
    const id = Number(this.estudianteSource?.tercero_id ?? 0);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }

  goPerfilEstudiante(): void {
    const perfilId = Number(this.estudianteSource?.perfil_id ?? 0);
    if (!perfilId) return;
    const terceroId = Number(this.estudianteSource?.tercero_id ?? 0);
    const tutorIdRaw = this.route.snapshot.queryParamMap.get('tutor_id');
    let tutorId = Number(this.resolveTutorId() ?? 0);
    if (!Number.isFinite(tutorId) || tutorId <= 0) {
      const qpTutorNum = tutorIdRaw ? Number(tutorIdRaw) : NaN;
      tutorId = Number.isFinite(qpTutorNum) ? qpTutorNum : 0;
    }
    this.router.navigate(['pages', 'tutor', 'explorar-estudiantes', perfilId], {
      queryParams: {
        from: 'invitaciones',
        ...(terceroId ? { tercero_id: terceroId } : {}),
        ...(Number.isFinite(tutorId) && tutorId > 0 ? { tutor_id: tutorId } : {}),
      },
    });
  }

  get estadoLabel(): string {
    return this.invitacion?.estado_det?.nombre || this.invitacion?.estado_raw || this.invitacion?.estado || '—';
  }

  get estadoClass(): string {
    const raw = String(this.invitacion?.estado_raw ?? this.invitacion?.estado ?? '').toUpperCase().trim();
    if (raw === 'INV_ACE_CTR' || raw === 'ACEPTADA') return 'estado-ok';
    if (raw === 'INV_REC_CTR' || raw === 'RECHAZADA') return 'estado-bad';
    if (raw === 'INV_CAN_CTR' || raw === 'CANCELADA') return 'estado-off';
    return 'estado-warn';
  }

  canCancelar(): boolean {
    const raw = String(this.invitacion?.estado_raw ?? this.invitacion?.estado ?? '').toUpperCase().trim();
    return raw === 'INV_ENV_CTR' || raw === 'ENVIADA';
  }

  async cancelar(): Promise<void> {
    if (!this.id) return;
    const tutorId = this.resolveTutorId();
    if (!tutorId) return;

    await firstValueFrom(
      this.service.cancelar(this.id, tutorId).pipe(catchError(() => of(null))),
    );

    await this.load();
  }

  async load(): Promise<void> {
    const tutorId = this.resolveTutorId();
    if (!tutorId) {
      this.error = 'No fue posible identificar tu usuario.';
      return;
    }

    this.cargando = true;
    this.error = '';

    try {
      const det = await firstValueFrom(
        this.service.getDetalle(this.id!, tutorId).pipe(catchError(() => of(null))),
      );

      if (!det) {
        this.error = 'No encontramos la invitación.';
        this.invitacion = null;
        return;
      }

      this.invitacion = det;
      const detalle: any = (this.invitacion as any)?.estudiante_detalle;
      const resumen: any = (this.invitacion as any)?.estudiante_resumen;
      const pcId = Number(detalle?.proyecto_curricular_id ?? resumen?.proyecto_curricular_id ?? 0);
      this.pcId = Number.isFinite(pcId) && pcId > 0 ? pcId : null;
      this.pcNombre = String(
        detalle?.proyecto_curricular_nombre ?? resumen?.proyecto_curricular_nombre ?? ''
      ).trim();
      if (this.pcId && !this.pcNombre) {
        try {
          const nombre = await firstValueFrom(this.catalogos.getNombreProyectoCurricular(this.pcId));
          if (nombre && String(nombre).trim()) {
            this.pcNombre = String(nombre).trim();
          }
        } catch {
          // best-effort: no bloquear si falla
        }
      }
    } finally {
      this.cargando = false;
    }
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

  private resolveTutorId(): number | null {
    const qpTutor = this.route.snapshot.queryParamMap.get('tutor_id');
    const currentUser: any = this.token.currentUser as any;
    const ctx: any = (this.userContext as any)?.getTutorContext?.() ?? null;

    // fallback por si solo tienes tercero_id
    const qpTercero = this.route.snapshot.queryParamMap.get('tercero_id');

    const tutorId =
      qpTutor ??
      qpTercero ??
      ctx?.tutor_id ??
      ctx?.tercero_id ??
      currentUser?.rawTokenPayload?.tercero_id ??
      currentUser?.tercero_id ??
      null;

    const id = Number(tutorId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }
}
