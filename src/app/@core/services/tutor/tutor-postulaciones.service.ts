import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TutorPostulacionesService {
  private readonly ofertasPath = '/v1/ofertas';
  private readonly postulacionesPath = '/v1/postulaciones';

  constructor(private http: HttpClient) {}

  obtenerPostulaciones<T = any>(ofertaId: string | number): Observable<T> {
    const id = encodeURIComponent(String(ofertaId));
    return this.http.get<T>(`${this.ofertasPath}/${id}/postulaciones`).pipe(
      catchError(this.handleError)
    );
  }

  accionPostulacion<T = any>(postulacionId: string | number, payload: unknown): Observable<T> {
    const id = encodeURIComponent(String(postulacionId));
    return this.http.post<T>(`${this.postulacionesPath}/${id}/accion`, payload).pipe(
      catchError(this.handleError)
    );
  }

  accion<T = any>(postulacionId: string | number, payload: unknown): Observable<T> {
    return this.accionPostulacion(postulacionId, payload);
  }

  private handleError = (error: any): Observable<never> => throwError(() => error);
}
