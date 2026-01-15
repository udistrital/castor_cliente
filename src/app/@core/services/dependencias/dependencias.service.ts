import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenService } from 'src/app/@core/services/auth/token.service';

interface ProyectoCurricularResponse {
  codigo_proyecto: number;
  proyecto_snies: string;
}

@Injectable({ providedIn: 'root' })
export class DependenciasService {
  private readonly cache = new Map<number, string>();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
  ) {}

  getProyectoCurricularPorCodigo(codigo: number): Observable<ProyectoCurricularResponse> {
    const url = `${environment.API_BASES.dependencias_api}proyecto_curricular_cod_proyecto/${codigo}`;
    const headers = this.tokenService.buildAuthHeaders();

    return this.http.get(url, { headers, responseType: 'text' }).pipe(
      map((xml) => this.parseProyectoCurricular(xml))
    );
  }

  getProyectoNombrePorCodigo(codigo: number): Observable<string> {
    const cached = this.cache.get(codigo);
    if (cached) {
      return of(cached);
    }

    return this.getProyectoCurricularPorCodigo(codigo).pipe(
      map((data) => {
        this.cache.set(codigo, data.proyecto_snies);
        return data.proyecto_snies;
      })
    );
  }

  private parseProyectoCurricular(xml: string): ProyectoCurricularResponse {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const snies = doc.querySelector('proyecto_snies')?.textContent?.trim() || '';
    const codigoRaw = doc.querySelector('codigo_proyecto')?.textContent?.trim() || '';

    if (!snies) {
      throw new Error('proyecto_snies no encontrado');
    }

    const codigo = Number(codigoRaw);
    if (!Number.isFinite(codigo)) {
      throw new Error('codigo_proyecto invalido');
    }

    return { codigo_proyecto: codigo, proyecto_snies: snies };
  }
}
