import { Injectable } from '@angular/core';
import { Observable, of, map, tap, catchError } from 'rxjs';
import { TokenService } from '../auth/token.service';
import { TutorDashboardService } from './tutor-dashboard.service';

type TutorEstadoData = {
  tutor_id: number;
  empresa_id: number | null;
  needs_empresa: boolean;
  estado?: string | null;
  empresa_nombre?: string | null;
};

type TutorEstadoEnvelope = {
  Success?: boolean;
  Status?: number;
  Message?: string;
  Data?: TutorEstadoData;
};

export interface TutorContext {
  tutor_id: number;
  empresa_id?: number | null;
  needs_empresa?: boolean;
  estado?: string | null;
  empresa_nombre?: string | null;
}

const STORAGE_KEY = 'castor_tutor_ctx_v1';

@Injectable({ providedIn: 'root' })
export class TutorContextService {
  private cached: TutorContext | null = null;

  constructor(
    private tokenService: TokenService,
    private tutorDashboard: TutorDashboardService,
  ) {}

  // Normaliza el envelope de /tutores/estado (Data vs root).
  private normalizeEstado(resp: TutorEstadoEnvelope | TutorEstadoData | any): TutorEstadoData {
    if (resp && typeof resp === 'object' && 'Data' in resp) {
      return resp.Data as TutorEstadoData;
    }
    if (resp && typeof resp === 'object' && 'tutor_id' in resp) {
      return resp as TutorEstadoData;
    }
    return { tutor_id: 0, empresa_id: null, needs_empresa: true };
  }

  ensureLoaded(): Observable<TutorContext> {
    const cached = this.getCached();
    if (cached) {
      return of(cached);
    }

    const documento = this.tokenService.documento;
    if (!documento) {
      return of({ tutor_id: 0, empresa_id: null, estado: null, empresa_nombre: null });
    }

    return this.tutorDashboard.getEstado({ numero_documento: documento }).pipe(
      map((res: TutorEstadoEnvelope) => this.normalizeEstado(res)),
      map((estado) => ({
        tutor_id: estado.tutor_id,
        empresa_id: estado.empresa_id,
        needs_empresa: estado.needs_empresa,
        estado: estado.estado ?? null,
        empresa_nombre: estado.empresa_nombre ?? null,
      })),
      tap((ctx) => this.setCached(ctx)),
      catchError(() => of({ tutor_id: 0, empresa_id: null, needs_empresa: false, estado: null, empresa_nombre: null })),
    );
  }

  getTutorIdSync(): number | null {
    const cached = this.getCached();
    return cached?.tutor_id ?? null;
  }

  clear(): void {
    this.cached = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  }

  private getCached(): TutorContext | null {
    if (this.cached) {
      return this.cached;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as TutorContext;
      this.cached = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  private setCached(ctx: TutorContext): void {
    this.cached = ctx;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    } catch {
      // noop
    }
  }
}
