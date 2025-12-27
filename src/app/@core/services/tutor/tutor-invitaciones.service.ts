import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class TutorInvitacionesService {
  private readonly tutoresPath = '/v1/tutores';
  private readonly invitacionesPath = '/v1/invitaciones';

  constructor(private http: HttpClient) {}

  obtenerInvitaciones<T = any>(): Observable<T> {
    return this.http.get<T>(`${this.tutoresPath}/invitaciones`).pipe(
      catchError(this.handleError)
    );
  }

  aceptarInvitacion<T = any>(invitacionId: string | number, payload: unknown = {}): Observable<T> {
    const id = encodeURIComponent(String(invitacionId));
    return this.http.put<T>(`${this.invitacionesPath}/${id}/aceptar`, payload).pipe(
      catchError(this.handleError)
    );
  }

  rechazarInvitacion<T = any>(invitacionId: string | number, payload: unknown = {}): Observable<T> {
    const id = encodeURIComponent(String(invitacionId));
    return this.http.put<T>(`${this.invitacionesPath}/${id}/rechazar`, payload).pipe(
      catchError(this.handleError)
    );
  }

  private handleError = (error: any): Observable<never> => throwError(() => error);
}
