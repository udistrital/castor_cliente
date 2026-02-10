import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../models/comunes.model';

export type EstadoDet = { code: string; nombre: string };

export type PostulacionListItem = {
  id: number;
  oferta_id: number;
  estudiante_id: number;
  estado: string;
  Estado?: EstadoDet; // viene en list (ojo: mayúscula)
  fecha_postulacion?: string;
  [key: string]: unknown;
};

export type PostulacionDetalle = {
  id: number;
  oferta_id: number;
  estudiante_id: number;
  estado: string;
  estado_det?: EstadoDet;
  fecha_postulacion?: string;
  oferta_resumen?: { id: number; titulo?: string; empresa?: string; descripcion?: string };
  [key: string]: unknown;
};

export type Paged<T> = { items: T[]; page: number; size: number; total: number };

@Injectable({ providedIn: 'root' })
export class PostulacionesEstudianteService {
  constructor(private rm: RequestManager) {}

  getMisPostulaciones(
    estudianteId: number,
    page = 1,
    size = 10,
    estado?: string | null,
  ): Observable<Paged<PostulacionListItem>> {
    const params: Record<string, unknown> = { estudiante_id: estudianteId, page, size };
    if (estado) {
      params.estado = estado;
    }

    return this.rm
      .get<ApiEnvelope<any>>('castor_mid', 'estudiantes/postulaciones', params)
      .pipe(map((res) => this.normalizePaged<PostulacionListItem>(res)));
  }

  getDetalle(estudianteId: number, postulacionId: number): Observable<PostulacionDetalle> {
    const params: Record<string, unknown> = { estudiante_id: estudianteId };
    return this.rm
      .get<ApiEnvelope<any>>('castor_mid', `estudiantes/postulaciones/${postulacionId}`, params)
      .pipe(map((res) => (res?.Data ?? res) as PostulacionDetalle));
  }

  aceptarSeleccion(estudianteId: number, postulacionId: number): Observable<ApiEnvelope<any>> {
    // Si el backend usa params, mantenemos querystring para no tocar RequestManager.
    const path = `postulaciones/${postulacionId}/aceptar-seleccion?estudiante_id=${encodeURIComponent(estudianteId)}`;
    return this.rm.castorMidPut<ApiEnvelope<any>>(path, {});
  }

  cancelar(estudianteId: number, postulacionId: number): Observable<ApiEnvelope<any>> {
    const path = `postulaciones/${postulacionId}/cancelar?estudiante_id=${encodeURIComponent(estudianteId)}`;
    return this.rm.castorMidPut<ApiEnvelope<any>>(path, {});
  }

  findByOfertaId(estudianteId: number, ofertaId: number): Observable<PostulacionListItem | null> {
    const size = 200;
    const maxPages = 10;
    return new Observable<PostulacionListItem | null>((observer) => {
      let page = 1;
      const nextPage = () => {
        this.getMisPostulaciones(estudianteId, page, size).subscribe({
          next: (resp) => {
            const items = resp?.items ?? [];
            const found = items.find((it) => Number(it?.oferta_id) === Number(ofertaId)) ?? null;
            if (found) {
              observer.next(found);
              observer.complete();
              return;
            }
            const total = Number(resp?.total ?? 0);
            const totalPages = Math.ceil(total / size);
            if (page >= totalPages || page >= maxPages) {
              observer.next(null);
              observer.complete();
              return;
            }
            page += 1;
            nextPage();
          },
          error: (err) => observer.error(err),
        });
      };
      nextPage();
    });
  }

  private normalizePaged<T>(res: any): Paged<T> {
    const data = res?.Data ?? res?.data ?? res ?? {};
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      items: items as T[],
      total: Number(data?.total ?? items.length ?? 0),
      page: Number(data?.page ?? 1),
      size: Number(data?.size ?? items.length ?? 0),
    };
  }
}
