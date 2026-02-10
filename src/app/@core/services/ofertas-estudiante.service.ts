import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../models/comunes.model';

export interface OfertaDisponibleItem {
  id: number;
  titulo?: string;
  descripcion?: string;
  empresa_id?: number | string;
  estado_det?: any;
  fecha_publicacion?: string;
  proyecto_curricular_ids?: number[];
}

export interface OfertasDisponiblesResponse {
  items: OfertaDisponibleItem[];
  total: number;
  page: number;
  size: number;
}

const ESTADOS_DISPONIBLES = ['OPC_CTR'].join(',');

@Injectable({ providedIn: 'root' })
export class OfertasEstudianteService {
  constructor(private requestManager: RequestManager) {}

  getDisponibles(
    estudianteId: number,
    page = 1,
    size = 10,
    q?: string,
  ): Observable<OfertasDisponiblesResponse> {
    const params: Record<string, unknown> = {
      estudiante_id: estudianteId,
      estado: ESTADOS_DISPONIBLES,
      exclude_postuladas: true,
      page,
      size,
    };
    if (q?.trim()) params.q = q.trim();

    return this.requestManager
      .get<ApiEnvelope<OfertasDisponiblesResponse>>('castor_mid', 'ofertas', params)
      .pipe(map((res) => res?.Data ?? { items: [], total: 0, page, size }));
  }

  getOfertasDisponibles(estudianteId: number, page = 1, size = 10): Observable<OfertasDisponiblesResponse> {
    return this.getDisponibles(estudianteId, page, size);
  }

  getDetalle(ofertaId: number): Observable<any> {
    return this.requestManager.get<ApiEnvelope<any>>('castor_mid', `ofertas/${ofertaId}`)
      .pipe(map((res) => res?.Data ?? res));
  }

  postular(ofertaId: number, estudianteId: number): Observable<any> {
    // Querystring para evitar cambios en RequestManager / headers.
    const path = `ofertas/${ofertaId}/postular?estudiante_id=${encodeURIComponent(estudianteId)}`;
    return this.requestManager.castorMidPost(path, {});
  }
}
