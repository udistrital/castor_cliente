import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../../models/comunes.model';

@Injectable({ providedIn: 'root' })
export class TutorPostulacionesService {
  constructor(private rm: RequestManager) {}

  listarPostulacionesOferta(
    ofertaId: number,
    tutorId: number,
    estado?: string | null,
    page = 1,
    size = 10,
  ): Observable<{ items: any[]; total: number; page: number; size: number }> {
    // Nota: El MID hoy exige tutor_id y oferta_id en path.
    // page/size/estado pueden ser ignorados por el backend, pero no rompen.
    const params: Record<string, unknown> = { tutor_id: tutorId, page, size };
    if (estado) params.estado = estado;

    return this.rm
      .get<ApiEnvelope<any>>('castor_mid', `ofertas/${ofertaId}/postulaciones`, params)
      .pipe(map((res) => this.normalizeList(res?.Data ?? res, page, size)));
  }

  accionPostulacion(
    postulacionId: number,
    tutorId: number,
    action: 'VISTO' | 'DESCARTAR' | 'PRESELECCIONAR' | 'SELECCIONAR',
    comentario?: string | null,
  ): Observable<any> {
    // El RequestManager no permite params en castorMidPost directamente,
    // así que mandamos tutor_id por query string.
    const path = `postulaciones/${postulacionId}/accion?tutor_id=${encodeURIComponent(tutorId)}`;
    const body: any = { accion: action };
    if (comentario) body.comentario = comentario;

    return this.rm.castorMidPost(path, body);
  }

  // Compatibilidad: componentes antiguos envían payload con accion/tutor_id/comentario.
  accion(
    postulacionId: number,
    payload: { accion: string; tutor_id?: number; comentario?: string | null },
  ): Observable<any> {
    const action = String(payload?.accion ?? '').trim().toUpperCase();
    const tutorId = payload?.tutor_id;

    // Requerido por MID: tutor_id. Si no llega, intentamos sin él (pero MID lo rechazará).
    const qs = tutorId ? `?tutor_id=${encodeURIComponent(tutorId)}` : '';
    const path = `postulaciones/${postulacionId}/accion${qs}`;

    const body: any = { accion: action };
    if (payload?.comentario) body.comentario = payload.comentario;

    return this.rm.castorMidPost(path, body);
  }

  marcarVisto(postulacionId: number, tutorId: number): Observable<any> {
    return this.rm.castorMidPutRaw(
      `postulaciones/${postulacionId}/visto`,
      {},
      { tutor_id: tutorId }
    );
  }

  marcarEnRevision(postulacionId: number, tutorId: number): Observable<any> {
    // Accion VISTO suele mover a PSRV_CTR (en revision) en el MID.
    return this.accionPostulacion(postulacionId, tutorId, 'VISTO');
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
