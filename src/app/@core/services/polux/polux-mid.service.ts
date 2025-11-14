import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PoluxMidService {
  private readonly baseUrl = (environment.API_BASES?.polux_mid || '').replace(/\/?$/, '/');

  constructor(private http: HttpClient) {}

  compose(resource: string): string {
    return `${this.baseUrl}${resource.replace(/^\/+/, '')}`;
  }

  post<T>(resource: string, body: unknown): Observable<T> {
    const url = this.compose(resource);
    console.log('[POLUX MID][POST]', url, body);
    return this.http.post<any>(url, body).pipe(
      map((resp) => (resp?.Data ?? resp) as T),
      tap(() => console.log('[POLUX MID] OK'))
    );
  }
}
