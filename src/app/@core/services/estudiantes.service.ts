import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiEnvelope } from '../models/comunes.model';
import { ConsultaDocumento, PerfilEstudiante } from '../models/perfil.model';
import { RequestManager } from '../../pages/services/requestManager';

@Injectable({ providedIn: 'root' })
export class EstudiantesService {
  constructor(private requestManager: RequestManager) {}

  /**
   * Paso 3: Verificar si el estudiante ya está en Castor
   * POST /v1/estudiantes/perfil/consulta_documento
   * Body: {"numero_documento": "<doc>"}
   */
  consultarPorDocumento(numero_documento: string): Observable<ConsultaDocumento | undefined> {
    const url = 'estudiantes/perfil/consulta_documento';
    const body = { numero_documento };
    console.log('[ESTUDIANTES] midPost →', url, body);
    return this.requestManager
      .castorMidPost<ApiEnvelope<ConsultaDocumento>>(url, body)
      .pipe(map((res) => res?.Data));
  }

  obtenerPerfilPorTercero(terceroId: number): Observable<PerfilEstudiante | null> {
    return this.getMiPerfil(terceroId);
  }

  createPerfil(payload: unknown): Observable<unknown> {
    return this.requestManager
      .castorMidPost<ApiEnvelope<unknown>>('estudiantes/perfil', payload)
      .pipe(
        map((res) => res?.Data ?? res),
        tap((resp) => console.log('[ESTUDIANTES] createPerfil →', resp))
      );
  }

  crearPerfil(payload: unknown): Observable<unknown> {
    return this.createPerfil(payload);
  }

  actualizarPerfil(id: number | string, payload: unknown): Observable<unknown> {
    return this.requestManager
      .castorMidPut<ApiEnvelope<unknown>>(`estudiantes/perfil/${id}`, payload)
      .pipe(
        map((res) => res?.Data ?? res),
        tap((resp) => console.log('[ESTUDIANTES] actualizarPerfil(%s) →', id, resp))
      );
  }

  /**
   * Consulta el perfil asociado a un tercero en Castor MID.
   * GET /v1/estudiantes/perfil?tercero_id=<id>
   */
  getMiPerfil(tercero_id: number): Observable<PerfilEstudiante | null> {
    return this.requestManager
      .get<ApiEnvelope<PerfilEstudiante>>('castor_mid', 'estudiantes/perfil', { tercero_id })
      .pipe(map((res) => res?.Data ?? null));
  }

  updateCvDocumentoId(terceroId: number, cvDocumentoId: string): Observable<any> {
  // ✅ Este endpoint es el único que puede variar según cómo lo dejaste en castor_mid.
  // Si te da 404, cambia SOLO el path 'estudiantes/perfil/cv' por el endpoint real.
  return this.requestManager.castorMidPut(
    'estudiantes/perfil/cv',
    {
      tercero_id: terceroId,
      cv_documento_id: cvDocumentoId,
    },
  );
}

  putVisibilidad(terceroId: number, visible: boolean): Observable<any> {
    return this.requestManager.castorMidPut(
      'estudiantes/perfil/visibilidad',
      { tercero_id: terceroId, visible }
    );
  }

}

// Dentro de EstudiantesService (class EstudiantesService { ... })

