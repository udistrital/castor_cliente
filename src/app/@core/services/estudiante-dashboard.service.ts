import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../models/comunes.model';

export interface EstudianteDashboardResumen {
  ofertas?: number;
  invitaciones?: number | Record<string, number>;
  postulaciones?: number | Record<string, number>;
  postulaciones_por_estado?: Record<string, number> | Array<{ estado: string; total: number }>;
}


export interface EstudianteDashboard {
  resumen?: EstudianteDashboardResumen;
  mis_postulaciones_recientes?: unknown[];
  ofertas_recomendadas?: unknown[];
}

@Injectable({ providedIn: 'root' })
export class EstudianteDashboardService {
  constructor(private requestManager: RequestManager) {}

  getDashboard(estudianteId: number): Observable<EstudianteDashboard | null> {
    return this.requestManager
      .get<ApiEnvelope<EstudianteDashboard>>('castor_mid', 'estudiantes/dashboard', {
        estudiante_id: estudianteId,
      })
      .pipe(map((res) => res?.Data ?? null));
  }
  getOfertasDisponiblesCount(estudianteId: number): Observable<number> {
  return this.requestManager
    .get<ApiEnvelope<any>>('castor_mid', 'ofertas', {
      estado: 'OPC_CTR',
      estudiante_id: estudianteId,
      exclude_postuladas: true,
      page: 1,
      size: 1,
    })
    .pipe(map((res) => Number(res?.Data?.total ?? 0)));
  }
  getInvitacionesCount(estudianteId: number): Observable<number> {
  return this.requestManager
    .get<ApiEnvelope<any>>('castor_mid', 'estudiantes/invitaciones', {
      estudiante_id: estudianteId,
      page: 1,
      size: 1,
    })
    .pipe(map((res) => Number(res?.Data?.total ?? (res?.Data?.items?.length ?? 0))));
  }

}


