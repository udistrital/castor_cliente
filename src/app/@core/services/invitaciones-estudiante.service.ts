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

export interface InvitacionEstudianteItem {
  id: number;

  estado?: string;               // ENVIADA, ACEPTADA...
  estado_nombre?: string;
  estado_det?: EstadoDet;        // nombre + code
  estado_raw?: string;

  mensaje?: string;

  oferta_pasantia_id?: number;
  oferta_resumen?: OfertaResumen;

  fecha_creacion?: string;
  fecha_estado?: string;

  tutor_id?: number;

  // ✅ campos “aplanados” para la UI (compatibles con tu HTML actual)
  oferta?: string;               // <- aquí pondremos el titulo
  fecha?: string;                // <- aquí pondremos fecha_estado/fecha_creacion
}

export interface InvitacionEstudianteBandeja {
  items: InvitacionEstudianteItem[];
  total: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class InvitacionesEstudianteService {
  constructor(private requestManager: RequestManager) {}

  getBandeja(
    estudianteId: number,
    estado?: string,
    page = 1,
    size = 10,
  ): Observable<InvitacionEstudianteBandeja> {
    const params: Record<string, unknown> = { estudiante_id: estudianteId, page, size };
    if (estado) params.estado = estado;

    return this.requestManager
      .get<ApiEnvelope<any>>('castor_mid', 'estudiantes/invitaciones', params)
      .pipe(
        map((res) => {
          const data = res?.Data ?? {};
          const rawItems: any[] = data.items ?? data.invitaciones ?? [];

          const items: InvitacionEstudianteItem[] = rawItems.map((it: any) => {
            const ofertaTitulo =
              it?.oferta_resumen?.titulo ??
              it?.oferta ??
              (it?.oferta_pasantia_id ? `Oferta #${it.oferta_pasantia_id}` : `Invitación #${it?.id}`);

            const fecha =
              it?.fecha_estado ??
              it?.fecha_creacion ??
              it?.fecha ??
              null;

            return {
              ...it,
              estado_raw: (it?.estado_raw ?? it?.estado ?? '').toString(),
              estado_det: it?.estado_det ?? (it?.estado ? { code: it.estado } : undefined),
              estado_nombre: (it?.estado_det?.nombre ?? '').toString().trim() || undefined,
              estado: (it?.estado_det?.nombre ?? it?.estado ?? '').toString().trim() || undefined,
              oferta: (ofertaTitulo ?? '').toString().trim() || undefined,
              fecha: fecha ?? undefined,
            } as InvitacionEstudianteItem;
          });

          const total = Number(data.total ?? (Array.isArray(items) ? items.length : 0));

          return { items, total, page, size };
        }),
      );
  }

  aceptar(invId: number, terceroId: number): Observable<unknown> {
    return this.requestManager.castorMidPut(`invitaciones/${invId}/aceptar`, { tercero_id: terceroId });
  }

  rechazar(invId: number, terceroId: number): Observable<unknown> {
    return this.requestManager.castorMidPut(`invitaciones/${invId}/rechazar`, { tercero_id: terceroId });
  }
}
