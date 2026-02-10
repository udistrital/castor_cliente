import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../../models/comunes.model';

@Injectable({ providedIn: 'root' })
export class TutorExplorarService {
  constructor(private rm: RequestManager) {}

  /**
   * Catálogo paginado (solo visibles en MID):
   * GET /v1/explorar/estudiantes?tutor_id&pc_id&skills&q&page&size
   */
  listarEstudiantes(
    tutorId: number,
    filtros: {
      texto?: string; // => (no se usa)
      proyecto_curricular_id?: number; // => pc_id
      habilidades?: string; // => skills
      page?: number;
      limit?: number; // => size
    } = {},
  ): Observable<{ items: any[]; total: number; page: number; limit: number }> {
    const params: Record<string, unknown> = {
      tutor_id: tutorId,
      pc_id: filtros.proyecto_curricular_id ?? undefined,
      skills: filtros.habilidades?.trim() || undefined,
      page: filtros.page ?? 1,
      size: filtros.limit ?? 10,
    };

    return this.rm
      .get<ApiEnvelope<any>>('castor_mid', 'explorar/estudiantes', params)
      .pipe(map((res) => this.normalizeList(res?.Data ?? res, params.page as number, params.size as number)));
  }

  /**
   * Catálogo de proyectos curriculares (Oikos/MID):
   * GET /v1/catalogos/proyectos-curriculares
   */
  listarProyectosCurriculares(): Observable<Array<{ id: number; nombre: string }>> {
    return this.rm
      .get<ApiEnvelope<any>>('castor_mid', 'catalogos/proyectos-curriculares', { page: 1, size: 200 })
      .pipe(
        map((res) => {
          const data = (res as any)?.Data ?? res ?? [];
          const items = Array.isArray(data) ? data : (data?.items ?? []);
          return (items as any[]).map((it) => ({
            id: Number(it?.id ?? it?.Id ?? it?.dependencia_id ?? it?.DependenciaId ?? 0),
            nombre: String(
              it?.nombre ??
              it?.Nombre ??
              it?.nombre_dependencia ??
              it?.NombreDependencia ??
              it?.NombreCompleto ??
              ''
            ).trim(),
          })).filter((x) => Number.isFinite(x.id) && x.id > 0 && x.nombre);
        })
      );
  }

  /**
   * Detalle para tutor (incluye "guardado" y normalmente pc en objeto):
   * GET /v1/explorar/estudiantes/{perfil_id}?tutor_id=...
   */
  detallePerfil(perfilId: number, tutorId: number): Observable<any> {
    const path = `explorar/estudiantes/${encodeURIComponent(perfilId)}`;
    const params: Record<string, unknown> = { tutor_id: tutorId };
    return this.rm.get<ApiEnvelope<any>>('castor_mid', path, params).pipe(map((res) => res?.Data ?? res));
  }

  /**
   * Perfil completo (CV, resumen, visible, proyecto_curricular_nombre, etc.)
   * GET /v1/estudiantes/perfil?tutor_id=...&tercero_id=...
   * (Este endpoint NO es de explorar; es el perfil del estudiante)
   */
  detalleEstudiante(terceroId: number, tutorId: number): Observable<any> {
    const params: Record<string, unknown> = { tutor_id: tutorId, tercero_id: terceroId };
    return this.rm.get<ApiEnvelope<any>>('castor_mid', 'estudiantes/perfil', params).pipe(map((res) => res?.Data ?? res));
  }

  /**
   * Perfil público (sin tutor_id)
   * GET /v1/estudiantes/perfil?tercero_id=...
   */
  detalleEstudiantePublico(terceroId: number): Observable<any> {
    const params: Record<string, unknown> = { tercero_id: terceroId };
    return this.rm.get<ApiEnvelope<any>>('castor_mid', 'estudiantes/perfil', params).pipe(map((res) => res?.Data ?? res));
  }

  /**
   * Bookmark:
   * POST /v1/explorar/estudiantes/{perfil_id}/guardar?tutor_id=...
   */
  addBookmark(perfilId: number, tutorId: number): Observable<any> {
    const path =
      `explorar/estudiantes/${encodeURIComponent(perfilId)}/guardar` +
      `?tutor_id=${encodeURIComponent(tutorId)}`;
    return this.rm.castorMidPost(path, {});
  }

  /**
   * Bookmark:
   * DELETE /v1/explorar/estudiantes/{perfil_id}/guardar?tutor_id=...
   */
  removeBookmark(perfilId: number, tutorId: number): Observable<any> {
    const path =
      `explorar/estudiantes/${encodeURIComponent(perfilId)}/guardar` +
      `?tutor_id=${encodeURIComponent(tutorId)}`;
    return this.rm.delete('castor_mid', path);
  }

  /**
   * Visita:
   * POST /v1/explorar/estudiantes/{perfil_id}/visita?tutor_id=...
   * (Body no se usa en MID, lo mandamos vacío)
   */
  registrarVisita(perfilId: number, tutorId: number): Observable<any> {
    const path =
      `explorar/estudiantes/${encodeURIComponent(perfilId)}/visita` +
      `?tutor_id=${encodeURIComponent(tutorId)}`;
    return this.rm.castorMidPost(path, {});
  }

  private normalizeList(raw: any, page: number, limit: number) {
    const data = raw ?? {};
    const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      items,
      total: Number(data?.total ?? items.length),
      page: Number(data?.page ?? page),
      limit: Number(data?.size ?? data?.limit ?? limit),
    };
  }
}
