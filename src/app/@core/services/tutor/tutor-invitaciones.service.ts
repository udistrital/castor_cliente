import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../../models/comunes.model';

@Injectable({ providedIn: 'root' })
export class TutorInvitacionesService {
  constructor(private rm: RequestManager) {}

  listarInvitaciones(
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
      .get<ApiEnvelope<any>>('castor_mid', 'tutores/invitaciones', params)
      .pipe(map((res) => this.normalizeList(res?.Data ?? res, page, size)));
  }

  detalleInvitacion(tutorId: number, invitacionId: number): Observable<any> {
    const params: Record<string, unknown> = { tutor_id: tutorId };
    return this.rm
      .get<ApiEnvelope<any>>('castor_mid', `tutores/invitaciones/${invitacionId}`, params)
      .pipe(map((res) => res?.Data ?? res));
  }

  enviarInvitacion(
    tutorId: number,
    perfilId: number,
    payload: { oferta_pasantia_id?: number | null; mensaje?: string | null },
  ): Observable<any> {
    const path = `explorar/estudiantes/${encodeURIComponent(perfilId)}/invitar?tutor_id=${encodeURIComponent(tutorId)}`;
    const body = {
      mensaje: payload?.mensaje ?? null,
      oferta_pasantia_id: payload?.oferta_pasantia_id ?? null,
    };
    return this.rm.castorMidPost(path, body);
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
