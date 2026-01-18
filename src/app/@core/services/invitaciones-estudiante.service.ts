import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../models/comunes.model';

export interface InvitacionEstudianteItem {
  id: number;
  estado?: string;
  mensaje?: string;
  oferta?: string;
  fecha?: string;
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
    const params: Record<string, unknown> = {
      estudiante_id: estudianteId,
      page,
      size,
    };
    if (estado) params.estado = estado;

    return this.requestManager
      .get<ApiEnvelope<any>>('castor_mid', 'estudiantes/invitaciones', params)
      .pipe(
        map((res) => {
          const data = res?.Data ?? {};

          // Soporta ambos formatos: {items,total,...} o {invitaciones:[...]}
          const items: InvitacionEstudianteItem[] =
            data.items ?? data.invitaciones ?? [];

          const total = Number(
            data.total ?? (Array.isArray(items) ? items.length : 0),
          );

          return {
            items,
            total,
            page,
            size,
          } as InvitacionEstudianteBandeja;
        }),
      );
  }

  aceptar(invId: number, terceroId: number): Observable<unknown> {
    return this.requestManager.castorMidPut(`invitaciones/${invId}/aceptar`, {
      tercero_id: terceroId,
    });
  }

  rechazar(invId: number, terceroId: number): Observable<unknown> {
    return this.requestManager.castorMidPut(`invitaciones/${invId}/rechazar`, {
      tercero_id: terceroId,
    });
  }
}
