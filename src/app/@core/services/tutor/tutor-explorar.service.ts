import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TutorExplorarService {
  private readonly basePath = '/v1/explorar/estudiantes';

  constructor(private http: HttpClient) {}

  listarEstudiantes<T = any>(params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(this.basePath, { params: this.buildParams(params) }).pipe(
      catchError(this.handleError)
    );
  }

  obtenerDetalle<T = any>(perfilId: string | number): Observable<T> {
    const id = encodeURIComponent(String(perfilId));
    return this.http.get<T>(`${this.basePath}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  guardarPerfil<T = any>(perfilId: string | number, payload: unknown = {}): Observable<T> {
    const id = encodeURIComponent(String(perfilId));
    return this.http.post<T>(`${this.basePath}/${id}/guardar`, payload).pipe(
      catchError(this.handleError)
    );
  }

  eliminarGuardado<T = any>(perfilId: string | number): Observable<T> {
    const id = encodeURIComponent(String(perfilId));
    return this.http.delete<T>(`${this.basePath}/${id}/guardar`).pipe(
      catchError(this.handleError)
    );
  }

  registrarVisita<T = any>(perfilId: string | number, payload: unknown = {}): Observable<T> {
    const id = encodeURIComponent(String(perfilId));
    return this.http.post<T>(`${this.basePath}/${id}/visita`, payload).pipe(
      catchError(this.handleError)
    );
  }

  invitarEstudiante<T = any>(perfilId: string | number, payload: unknown): Observable<T> {
    const id = encodeURIComponent(String(perfilId));
    return this.http.post<T>(`${this.basePath}/${id}/invitar`, payload).pipe(
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
