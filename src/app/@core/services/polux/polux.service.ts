import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { TokenService } from '../auth/token.service';

@Injectable({ providedIn: 'root' })
export class PoluxService {
  private readonly baseUrl = environment.POLUX_SERVICE;

  constructor(private http: HttpClient, private tokenService: TokenService) {}

  get<T>(resource: string, params?: string | Record<string, string | number>): Observable<T> {
    const url = this.composeUrl(resource);
    return this.http.get<T>(url, {
      headers: this.tokenService.buildAuthHeaders(),
      params: this.toHttpParams(params),
    });
  }

  post<T>(resource: string, body: unknown): Observable<T> {
    const url = this.composeUrl(resource);
    return this.http.post<T>(url, body, {
      headers: this.tokenService.buildAuthHeaders(),
    });
  }

  put<T>(resource: string, id: string | number, body: unknown): Observable<T> {
    const url = ${this.composeUrl(resource)}/;
    return this.http.put<T>(url, body, {
      headers: this.tokenService.buildAuthHeaders(),
    });
  }

  delete<T>(resource: string, id: string | number): Observable<T> {
    const url = ${this.composeUrl(resource)}/;
    return this.http.delete<T>(url, {
      headers: this.tokenService.buildAuthHeaders(),
    });
  }

  private composeUrl(resource: string): string {
    const sanitizedResource = resource.startsWith('/') ? resource.substring(1) : resource;
    return ${this.baseUrl};
  }

  private toHttpParams(params?: string | Record<string, string | number>): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    if (typeof params === 'string') {
      return new HttpParams({ fromString: params });
    }

    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }
}