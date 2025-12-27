import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TutorOfertasService {
  private readonly basePath = '/v1/ofertas';

  constructor(private http: HttpClient) {}

  crearOferta<T = any>(payload: unknown): Observable<T> {
    return this.http.post<T>(this.basePath, payload).pipe(
      catchError(this.handleError)
    );
  }

  obtenerOfertas<T = any>(params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(this.basePath, { params: this.buildParams(params) }).pipe(
      catchError(this.handleError)
    );
  }

  obtenerOfertasAbiertas<T = any>(): Observable<T> {
    return this.http.get<T>(`${this.basePath}/abiertas`).pipe(
      catchError(this.handleError)
    );
  }

  obtenerOfertasEnCurso<T = any>(): Observable<T> {
    return this.http.get<T>(`${this.basePath}/en-curso`).pipe(
      catchError(this.handleError)
    );
  }

  cancelarOferta<T = any>(id: string | number, payload: unknown = {}): Observable<T> {
    const ofertaId = encodeURIComponent(String(id));
    return this.http.put<T>(`${this.basePath}/${ofertaId}/cancelar`, payload).pipe(
      catchError(this.handleError)
    );
  }

  finalizarOferta<T = any>(id: string | number, payload: unknown = {}): Observable<T> {
    const ofertaId = encodeURIComponent(String(id));
    return this.http.put<T>(`${this.basePath}/${ofertaId}/finalizar`, payload).pipe(
      catchError(this.handleError)
    );
  }

  agregarProyectosCurriculares<T = any>(id: string | number, payload: unknown): Observable<T> {
    const ofertaId = encodeURIComponent(String(id));
    return this.http.post<T>(`${this.basePath}/${ofertaId}/proyectos_curriculares`, payload).pipe(
      catchError(this.handleError)
    );
  }

  private buildParams(params?: Record<string, string | number | boolean>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  private handleError = (error: any): Observable<never> => throwError(() => error);
}
