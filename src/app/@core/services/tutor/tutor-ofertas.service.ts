import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../../models/comunes.model';

@Injectable({ providedIn: 'root' })
export class TutorOfertasService {
  constructor(private rm: RequestManager) {}

  listarMisOfertas(
    tutorId: number,
    estado?: string | null,
    page = 1,
    size = 10,
  ): Observable<{ items: any[]; total: number; page: number; size: number }> {
    const params: Record<string, unknown> = { tutor_id: tutorId, page, size };
    if (estado) {
      params.estado = estado;
    }
    return this.rm
      .get<ApiEnvelope<any>>('castor_mid', 'ofertas', params)
      .pipe(map((res) => this.normalizeList(res?.Data ?? res, page, size)));
  }

  cancelarOferta(tutorId: number, ofertaId: number): Observable<any> {
    return this.rm.castorMidPutRaw(
      `ofertas/${encodeURIComponent(ofertaId)}/cancelar`,
      {},
      { tutor_id: tutorId }
    );
  }

  finalizarOferta(tutorId: number, ofertaId: number): Observable<any> {
    return this.rm.castorMidPutRaw(
      `ofertas/${encodeURIComponent(ofertaId)}/finalizar`,
      {},
      { tutor_id: tutorId }
    );
  }

  pausarOferta(tutorId: number, ofertaId: number): Observable<any> {
    return this.rm.castorMidPutRaw(
      `ofertas/${encodeURIComponent(ofertaId)}/pausar`,
      {},
      { tutor_id: tutorId }
    );
  }

  reactivarOferta(tutorId: number, ofertaId: number): Observable<any> {
    return this.rm.castorMidPutRaw(
      `ofertas/${encodeURIComponent(ofertaId)}/reactivar`,
      {},
      { tutor_id: tutorId }
    );
  }

  getOfertaDetalle(ofertaId: number): Observable<any> {
    return this.rm.get('castor_mid', `ofertas/${encodeURIComponent(ofertaId)}`);
  }

  private normalizeList(raw: any, page: number, size: number) {
    const data = raw ?? {};
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      items,
      total: Number(data?.total ?? items.length),
      page: Number(data?.page ?? page),
      size: Number(data?.size ?? size),
    };
  }
}
