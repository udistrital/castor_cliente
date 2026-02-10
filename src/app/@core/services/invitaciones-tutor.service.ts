import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../models/comunes.model';

export interface EstadoDet {
  code?: string;
  nombre?: string;
}

export interface OfertaResumen {
  id?: number;
  titulo?: string;
}

export interface InvitacionTutorItem {
  id: number;

  estado?: string;
  estado_det?: EstadoDet;
  estado_raw?: string;

  mensaje?: string;

  oferta_pasantia_id?: number;
  oferta_resumen?: OfertaResumen;

  fecha_creacion?: string;
  fecha_estado?: string;

  perfil_estudiante_id?: number;
  tutor_id?: number;

  // UI flatten
  oferta?: string;
  fecha?: string;

  // Enriched (detalle)
  oferta_detalle?: any;
  empresa_detalle?: any;
  tutor_detalle?: any;
  estudiante_detalle?: any; // si luego lo enriqueces
}

export interface InvitacionTutorBandeja {
  items: InvitacionTutorItem[];
  total: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class InvitacionesTutorService {
  constructor(private requestManager: RequestManager) {}

  getBandeja(
    tutorId: number,
    estado?: string,
    page = 1,
    size = 20,
  ): Observable<InvitacionTutorBandeja> {
    const params: Record<string, unknown> = { tutor_id: tutorId, page, size };
    if (estado) params.estado = estado;

    return this.requestManager
      .get<ApiEnvelope<any>>('castor_mid', 'tutores/invitaciones', params)
      .pipe(
        map((res) => {
          const data = res?.Data ?? {};
          const rawItems: any[] = data.items ?? [];

          const items: InvitacionTutorItem[] = rawItems.map((it: any) => {
            const ofertaTitulo =
              it?.oferta_resumen?.titulo ??
              it?.oferta ??
              (it?.oferta_pasantia_id ? `Oferta #${it.oferta_pasantia_id}` : `Invitación #${it?.id}`);

            const fecha = it?.fecha_estado ?? it?.fecha_creacion ?? it?.fecha ?? null;

            return {
              ...it,
              estado_raw: String(it?.estado_raw ?? it?.estado ?? '').toUpperCase().trim(),
              estado: String(it?.estado ?? it?.estado_det?.code ?? '').trim() || undefined,
              oferta: String(ofertaTitulo ?? '').trim() || undefined,
              fecha: fecha ?? undefined,
            } as InvitacionTutorItem;
          });

          const total = Number(data.total ?? items.length);
          return { items, total, page, size };
        }),
      );
  }

  getDetalle(invId: number, tutorId: number): Observable<InvitacionTutorItem | null> {
    // ✅ endpoint real del detalle es /v1/invitaciones/:id
    return this.requestManager
      .get<ApiEnvelope<any>>('castor_mid', `invitaciones/${invId}`, { tutor_id: tutorId })
      .pipe(
        map((res) => {
          const it = res?.Data ?? null;
          if (!it) return null;

          const ofertaTitulo =
            it?.oferta_resumen?.titulo ??
            it?.oferta_detalle?.titulo ??
            it?.oferta ??
            (it?.oferta_pasantia_id ? `Oferta #${it.oferta_pasantia_id}` : `Invitación #${it?.id}`);

          const fecha = it?.fecha_estado ?? it?.fecha_creacion ?? it?.fecha ?? null;

          return {
            ...it,
            estado_raw: String(it?.estado_raw ?? it?.estado ?? '').toUpperCase().trim(),
            oferta: String(ofertaTitulo ?? '').trim() || undefined,
            fecha: fecha ?? undefined,
          } as InvitacionTutorItem;
        }),
      );
  }

  cancelar(invId: number, tutorId: number): Observable<unknown> {
    // ✅ asumimos endpoint MID: PUT /v1/invitaciones/:id/cancelar
    return this.requestManager.castorMidPut(`invitaciones/${invId}/cancelar`, { tutor_id: tutorId });
  }
}
