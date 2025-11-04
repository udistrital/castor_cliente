import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { TokenService } from '../auth/token.service';

@Injectable({ providedIn: 'root' })
export class PoluxMidService {
  private readonly baseUrl = environment.POLUX_MID_SERVICE;

  constructor(private http: HttpClient, private tokenService: TokenService) {}

  get<T>(endpoint: string, params?: string | Record<string, string | number>): Observable<T> {
    const url = this.composeUrl(endpoint);
    return this.http.get<T>(url, {
      headers: this.tokenService.buildAuthHeaders(),
      params: this.toHttpParams(params),
    });
  }

  post<T>(endpoint: string, body: unknown): Observable<T> {
    const url = this.composeUrl(endpoint);
    return this.http.post<T>(url, body, {
      headers: this.tokenService.buildAuthHeaders(),
    });
  }

  put<T>(endpoint: string, body: unknown): Observable<T> {
    const url = this.composeUrl(endpoint);
    return this.http.put<T>(url, body, {
      headers: this.tokenService.buildAuthHeaders(),
    });
  }

  delete<T>(endpoint: string): Observable<T> {
    const url = this.composeUrl(endpoint);
    return this.http.delete<T>(url, {
      headers: this.tokenService.buildAuthHeaders(),
    });
  }

  private composeUrl(endpoint: string): string {
    const sanitizedEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
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