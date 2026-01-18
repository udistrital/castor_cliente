import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import {
  InvitacionesEstudianteService,
  InvitacionEstudianteItem,
  InvitacionEstudianteBandeja,
} from 'src/app/@core/services/invitaciones-estudiante.service';

import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';

@Component({
  standalone: true,
  selector: 'app-invitaciones-estudiante',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
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

  // ✅ tu HTML usa "cargando"
  cargando = false;

  constructor(
    private invitacionesService: InvitacionesEstudianteService,
    private token: TokenService,
    private userContext: UserContextService,
  ) {}

  ngOnInit(): void {
    this.load();
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
  } finally {
    this.cargando = false;
  }
}

  
  async aceptar(invId: number): Promise<void> {
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

    await this.load(1);
  }

  async rechazar(invId: number): Promise<void> {
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

    await this.load(1);
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
