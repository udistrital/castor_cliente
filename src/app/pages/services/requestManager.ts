import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenService } from '../../@core/services/auth/token.service';
import { HttpErrorManager } from './errorManager';

type ApiKey = keyof typeof environment.API_BASES;

const APIS_WITH_X_API = new Set<ApiKey>(['castor_mid', 'polux_mid', 'gestor_doc_mid']);
const APIS_WITHOUT_X_API = new Set<ApiKey>(['autenticacion_mid', 'academica', 'oikos']);

@Injectable({
  providedIn: 'root',
})
export class RequestManager {
  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private errManager: HttpErrorManager,
  ) { }

  /** -------------------- Helpers específicos -------------------- */
  academicaGet<T>(path: string, params?: Record<string, unknown>): Observable<T> {
    return this.get<T>('academica', path, params);
  }

  poluxMidPost<T>(path: string, body: unknown): Observable<T> {
    return this.post<T>('polux_mid', path, body);
  }

  castorMidPost<T>(path: string, body: unknown): Observable<T> {
    return this.post<T>('castor_mid', path, body);
  }

  castorMidPut<T>(path: string, body: unknown): Observable<T> {
    return this.put<T>('castor_mid', path, body);
  }

  gdMidPost<T>(path: string, body: unknown): Observable<T> {
    return this.post<T>('gestor_doc_mid', path, body);
  }

  oikosGet<T>(path: string, params?: Record<string, unknown>): Observable<T> {
    return this.get<T>('oikos', path, params);
  }

  /** -------------------- Métodos genéricos basados en API -------------------- */
  get<T>(api: ApiKey, path: string, params?: Record<string, unknown>): Observable<T>;
  get<T>(baseUrl: string, endpoint: string): Observable<T>;
  get<T>(first: ApiKey | string, second: string, third?: Record<string, unknown>): Observable<T> {
    if (this.isApiKey(first)) {
      return this.requestApi<T>('GET', first, second, { params: third });
    }
    return this.requestLegacy<T>('GET', `${first}${second}`);
  }

  post<T>(api: ApiKey, path: string, body: unknown): Observable<T>;
  post<T>(baseUrl: string, endpoint: string, element: unknown): Observable<T>;
  post<T>(first: ApiKey | string, second: string, third?: unknown): Observable<T> {
    if (this.isApiKey(first)) {
      return this.requestApi<T>('POST', first, second, { body: third });
    }
    return this.requestLegacy<T>('POST', `${first}${second}`, third);
  }

  put<T>(api: ApiKey, path: string, body: unknown): Observable<T>;
  put<T>(baseUrl: string, endpoint: string, element: unknown, id?: string | number): Observable<T>;
  put<T>(first: ApiKey | string, second: string, third?: unknown, fourth?: string | number): Observable<T> {
    if (this.isApiKey(first)) {
      return this.requestApi<T>('PUT', first, second, { body: third });
    }
    const url = fourth !== undefined ? `${first}${second}/${fourth}` : `${first}${second}`;
    return this.requestLegacy<T>('PUT', url, third);
  }

  delete<T>(api: ApiKey, path: string): Observable<T>;
  delete<T>(baseUrl: string, endpoint: string, id?: string | number): Observable<T>;
  delete<T>(first: ApiKey | string, second: string, third?: string | number): Observable<T> {
    if (this.isApiKey(first)) {
      return this.requestApi<T>('DELETE', first, second);
    }
    const url = third !== undefined ? `${first}${second}/${third}` : `${first}${second}`;
    return this.requestLegacy<T>('DELETE', url);
  }

  /** -------------------- Internals -------------------- */
  private requestApi<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    api: ApiKey,
    path: string,
    options?: { body?: unknown; params?: Record<string, unknown> },
  ): Observable<T> {
    const url = this.composeUrl(api, path);
    this.log(method, api, url, options?.body);

    const headers = this.composeHeaders(api);
    const params = this.composeParams(options?.params);

    const request$ = (() => {
      switch (method) {
        case 'GET':
          return this.http.get<T>(url, { headers, params });
        case 'POST':
          return this.http.post<T>(url, options?.body, { headers, params });
        case 'PUT':
          return this.http.put<T>(url, options?.body, { headers, params });
        case 'DELETE':
        default:
          return this.http.delete<T>(url, { headers, params });
      }
    })();

    return request$.pipe(
      map((res: unknown) => this.unwrapBody(res)),
      catchError(this.errManager.handleError.bind(this.errManager))
    );
  }

  private requestLegacy<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, body?: unknown): Observable<T> {
    const headers = this.tokenService.buildAuthHeaders();
    this.log(method, 'legacy', url, body);

    const request$ = (() => {
      switch (method) {
        case 'GET':
          return this.http.get<T>(url, { headers });
        case 'POST':
          return this.http.post<T>(url, body, { headers });
        case 'PUT':
          return this.http.put<T>(url, body, { headers });
        case 'DELETE':
        default:
          return this.http.delete<T>(url, { headers });
      }
    })();

    return request$.pipe(
      map((res: unknown) => this.unwrapBody(res)),
      catchError(this.errManager.handleError.bind(this.errManager))
    );
  }

  private composeUrl(api: ApiKey, path: string): string {
    const base = environment.API_BASES?.[api];
    if (!base) {
      throw new Error(`Base URL no definida para api=${api}`);
    }
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return `${normalizedBase}${normalizedPath}`;
  }

  private composeHeaders(api: ApiKey, extra?: HttpHeaders): HttpHeaders {
    let headers = this.tokenService.buildAuthHeaders();
    if (extra) {
      extra.keys().forEach((key) => {
        const value = extra.getAll(key);
        if (value) {
          headers = headers.set(key, value);
        }
      });
    }
    if (APIS_WITH_X_API.has(api) && !APIS_WITHOUT_X_API.has(api)) {
      headers = headers.set('x-api', api);
    }
    return headers;
  }

  private composeParams(params?: Record<string, unknown>): HttpParams | undefined {
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

  private isApiKey(value: ApiKey | string): value is ApiKey {
    return Object.prototype.hasOwnProperty.call(environment.API_BASES, value);
  }

  private log(method: string, api: ApiKey | 'legacy', url: string, body?: unknown): void {
    if (method === 'GET') {
      console.log('[RM][GET] api=%s path=%s', api, url);
      return;
    }
    if (method === 'POST') {
      console.log('[RM][POST] api=%s path=%s body=', api, url, body);
      return;
    }
    console.log('[RM][%s] api=%s path=%s', method, api, url);
  }

  private unwrapBody<T>(res: unknown): T {
    if (res && typeof res === 'object' && Object.prototype.hasOwnProperty.call(res, 'Body')) {
      const value = (res as { Body?: T }).Body;
      return (value as T) ?? (res as T);
    }
    return res as T;
  }
}
