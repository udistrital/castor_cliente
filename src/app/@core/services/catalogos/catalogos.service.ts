import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenService } from '../../services/auth/token.service';

interface ProyectoCurricularResp {
  Success: boolean;
  Status: number;
  Message: string;
  Data: { id: number; nombre: string } | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private base = (environment.CASTOR_MID_SERVICE || '').replace(/\/+$/, '');

  constructor(private http: HttpClient, private token: TokenService) {}

  /**
   * Devuelve el nombre del PC o null si 404.
   * Siempre resuelve (nunca lanza), para UI simple.
   */
  getNombreProyectoCurricular(pcId: string | number) {
    const url = `${this.base}/catalogos/proyectos-curriculares/${pcId}`;
    return this.http.get<ProyectoCurricularResp>(url, {
      headers: this.token.buildAuthHeaders(),
    }).pipe(
      map(res => (res?.Success && res?.Data?.nombre) ? res.Data.nombre : null),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        return of(null);
      })
    );
  }
}
