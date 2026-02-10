import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenService } from '../../services/auth/token.service';

interface ProyectoCurricularResp {
  Success: boolean;
  Status: number;
  Message: string;
  Data: Record<string, any> | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private base = (environment.CASTOR_MID_SERVICE || '').replace(/\/+$/, '');
  private dependenciasBase = (environment.API_BASES?.dependencias_api || '').replace(/\/+$/, '');
  private oikosBase = (environment.API_BASES?.oikos || '').replace(/\/+$/, '');

  constructor(private http: HttpClient, private token: TokenService) {}

  /**
   * Devuelve el nombre del PC o null si 404.
   * Siempre resuelve (nunca lanza), para UI simple.
   */
  getNombreProyectoCurricular(pcId: string | number) {
    const codigo = Number(pcId);
    if (!Number.isFinite(codigo) || codigo <= 0) {
      return of(null);
    }

    if (!this.dependenciasBase) {
      return this.fetchNombreProyectoCurricularDesdeCatalogos(codigo);
    }

    const url = `${this.dependenciasBase}/proyecto_curricular_cod_proyecto/${codigo}`;
    return this.http.get(url, {
      headers: this.token.buildAuthHeaders(),
      responseType: 'text',
    }).pipe(
      switchMap((xml) => {
        const { idOikos, nombre } = this.parseHomologacionXml(xml);
        if (nombre) {
          return of(nombre);
        }
        if (!idOikos || !this.oikosBase) {
          return this.fetchNombreProyectoCurricularDesdeCatalogos(codigo);
        }
        const oikosUrl = `${this.oikosBase}/dependencia/${idOikos}`;
        return this.http.get<any>(oikosUrl, {
          headers: this.token.buildAuthHeaders(),
        }).pipe(
          map((res) => {
            const nombreOikos =
              res?.Data?.Nombre ??
              res?.Data?.nombre ??
              res?.Nombre ??
              res?.nombre ??
              res?.data?.Nombre ??
              res?.data?.nombre ??
              null;
            return nombreOikos ? String(nombreOikos).trim() : null;
          }),
          catchError((err: HttpErrorResponse) => {
            if (err.status !== 404) {
              console.warn('[CATALOGOS] No se pudo resolver PC en Oikos', err);
            }
            return this.fetchNombreProyectoCurricularDesdeCatalogos(codigo);
          })
        );
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 404) {
          console.warn('[CATALOGOS] No se pudo homologar PC', err);
        }
        return this.fetchNombreProyectoCurricularDesdeCatalogos(codigo);
      })
    );
  }

  getProyectoCurricularPorCodigoProyecto(pcId: string | number) {
    const codigo = Number(pcId);
    if (!Number.isFinite(codigo) || codigo <= 0) {
      return of(null);
    }

    const url = `${this.dependenciasBase}/proyecto_curricular_cod_proyecto/${codigo}`;
    return this.http.get(url, {
      headers: this.token.buildAuthHeaders(),
      responseType: 'text',
    }).pipe(
      tap(() => console.log('[CATALOGOS] homologando PC por codigo', codigo, 'url=', url)),
      map((xml) => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(xml, 'application/xml');
          const nombre = doc.querySelector('proyecto_snies')?.textContent?.trim() || '';
          const idRaw = doc.querySelector('id_oikos')?.textContent?.trim() || '';
          const idOikos = Number(idRaw);
          if (!nombre || !Number.isFinite(idOikos) || idOikos <= 0) {
            return null;
          }
          return { nombre: String(nombre).trim(), idOikos };
        } catch {
          return null;
        }
      }),
      catchError(() => of(null)),
    );
  }

  getProyectoCurricularDesdeMidPorCodigo(codigo: string | number) {
    const codigoNum = Number(codigo);
    if (!Number.isFinite(codigoNum) || codigoNum <= 0) {
      return of(null);
    }
    const url = `${this.base}/catalogos/proyecto-curricular?codigo=${codigoNum}`;
    return this.http.get<ProyectoCurricularResp>(url, {
      headers: this.token.buildAuthHeaders(),
    }).pipe(
      map((res) => {
        if (!res?.Success || !res?.Data) return null;
        const data = res.Data as any;
        const nombre = data?.nombre ?? data?.Nombre ?? null;
        const idOikos = Number(data?.id_oikos ?? data?.IdOikos ?? data?.idOikos ?? NaN);
        if (!nombre || !Number.isFinite(idOikos) || idOikos <= 0) {
          return null;
        }
        return { nombre: String(nombre).trim(), idOikos };
      }),
      catchError(() => of(null)),
    );
  }

  private fetchNombreProyectoCurricularDesdeCatalogos(pcId: number) {
    const url = `${this.base}/catalogos/proyectos-curriculares/${pcId}`;
    return this.http.get<ProyectoCurricularResp>(url, {
      headers: this.token.buildAuthHeaders(),
    }).pipe(
      map((res) => {
        if (!res?.Success || !res?.Data) return null;
        const data = res.Data as any;
        const nombre =
          data?.nombre ??
          data?.Nombre ??
          data?.proyecto_curricular?.nombre ??
          data?.proyecto_curricular?.Nombre ??
          data?.dependencia?.Nombre ??
          data?.dependencia?.nombre ??
          null;
        return nombre ? String(nombre).trim() : null;
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status !== 404) {
          console.warn('[CATALOGOS] No se pudo resolver PC en catálogo', err);
        }
        return of(null);
      })
    );
  }

  private parseHomologacionXml(xml: string): { idOikos: number | null; nombre: string | null } {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const idRaw = doc.querySelector('id_oikos')?.textContent?.trim() || '';
      const nombre =
        doc.querySelector('proyecto_snies')?.textContent?.trim() ||
        doc.querySelector('nombre')?.textContent?.trim() ||
        null;
      const id = Number(idRaw);
      return {
        idOikos: Number.isFinite(id) && id > 0 ? id : null,
        nombre: nombre && String(nombre).trim() ? String(nombre).trim() : null,
      };
    } catch {
      return { idOikos: null, nombre: null };
    }
  }
}
