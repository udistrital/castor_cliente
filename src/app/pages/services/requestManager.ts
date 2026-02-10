import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpBackend } from '@angular/common/http';
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
  private rawHttp: HttpClient;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private errManager: HttpErrorManager,
    private httpBackend: HttpBackend,
  ) {
    // Raw HttpClient bypasses interceptors for specific safe calls.
    this.rawHttp = new HttpClient(this.httpBackend);
  }

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

  castorMidPutRaw<T>(path: string, body: unknown, params?: Record<string, unknown>): Observable<T> {
    const url = this.composeUrl('castor_mid', path);
    // Raw client bypasses interceptors; no custom headers to avoid CORS preflight.
    const headers = this.composeHeaders('castor_mid');
    const httpParams = this.composeParams(params);
    console.log('[RM][PUT][RAW] api=%s url=%s', 'castor_mid', url);

    return this.rawHttp.put<T>(url, body, { headers, params: httpParams }).pipe(
      map((res: unknown) => this.unwrapBody(res)),
      catchError(this.errManager.handleError.bind(this.errManager))
    );
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
  get<T>(baseUrl: string, endpoint: string, options?: { params?: Record<string, unknown>; headers?: HttpHeaders }): Observable<T>;
  get<T>(first: ApiKey | string, second: string, third?: Record<string, unknown> | { params?: Record<string, unknown>; headers?: HttpHeaders }): Observable<T> {
    if (this.isApiKey(first)) {
      return this.requestApi<T>('GET', first, second, { params: third });
    }
    const options = this.normalizeLegacyOptions(third);
    return this.requestLegacy<T>('GET', `${first}${second}`, undefined, options);
  }

  post<T>(api: ApiKey, path: string, body: unknown): Observable<T>;
  post<T>(baseUrl: string, endpoint: string, element: unknown): Observable<T>;
  post<T>(baseUrl: string, endpoint: string, element: unknown, options?: { params?: Record<string, unknown>; headers?: HttpHeaders }): Observable<T>;
  post<T>(first: ApiKey | string, second: string, third?: unknown, fourth?: { params?: Record<string, unknown>; headers?: HttpHeaders }): Observable<T> {
    if (this.isApiKey(first)) {
      return this.requestApi<T>('POST', first, second, { body: third });
    }
    const options = this.normalizeLegacyOptions(fourth);
    return this.requestLegacy<T>('POST', `${first}${second}`, third, options);
  }

  put<T>(api: ApiKey, path: string, body: unknown): Observable<T>;
  put<T>(baseUrl: string, endpoint: string, element: unknown, id?: string | number): Observable<T>;
  put<T>(baseUrl: string, endpoint: string, element: unknown, idOrOptions?: string | number | { params?: Record<string, unknown>; headers?: HttpHeaders }): Observable<T>;
  put<T>(baseUrl: string, endpoint: string, element: unknown, id: string | number, options?: { params?: Record<string, unknown>; headers?: HttpHeaders }): Observable<T>;
  put<T>(
    first: ApiKey | string,
    second: string,
    third?: unknown,
    fourth?: string | number | { params?: Record<string, unknown>; headers?: HttpHeaders },
    fifth?: { params?: Record<string, unknown>; headers?: HttpHeaders },
  ): Observable<T> {
    if (this.isApiKey(first)) {
      return this.requestApi<T>('PUT', first, second, { body: third });
    }
    const { id, options } = this.normalizeLegacyIdAndOptions(fourth, fifth);
    const url = id !== undefined ? `${first}${second}/${id}` : `${first}${second}`;
    return this.requestLegacy<T>('PUT', url, third, options);
  }

  delete<T>(api: ApiKey, path: string): Observable<T>;
  delete<T>(baseUrl: string, endpoint: string, id?: string | number): Observable<T>;
  delete<T>(baseUrl: string, endpoint: string, idOrOptions?: string | number | { params?: Record<string, unknown>; headers?: HttpHeaders }): Observable<T>;
  delete<T>(baseUrl: string, endpoint: string, id: string | number, options?: { params?: Record<string, unknown>; headers?: HttpHeaders }): Observable<T>;
  delete<T>(
    first: ApiKey | string,
    second: string,
    third?: string | number | { params?: Record<string, unknown>; headers?: HttpHeaders },
    fourth?: { params?: Record<string, unknown>; headers?: HttpHeaders },
  ): Observable<T> {
    if (this.isApiKey(first)) {
      return this.requestApi<T>('DELETE', first, second);
    }
    const { id, options } = this.normalizeLegacyIdAndOptions(third, fourth);
    const url = id !== undefined ? `${first}${second}/${id}` : `${first}${second}`;
    return this.requestLegacy<T>('DELETE', url, undefined, options);
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

  private requestLegacy<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    body?: unknown,
    options?: { params?: Record<string, unknown>; headers?: HttpHeaders },
  ): Observable<T> {
    const headers = this.mergeHeaders(this.tokenService.buildAuthHeaders(), options?.headers);
    const params = this.composeParams(options?.params);
    this.log(method, 'legacy', url, body);

    const request$ = (() => {
      switch (method) {
        case 'GET':
          return this.http.get<T>(url, { headers, params });
        case 'POST':
          return this.http.post<T>(url, body, { headers, params });
        case 'PUT':
          return this.http.put<T>(url, body, { headers, params });
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
    let headers = this.mergeHeaders(this.tokenService.buildAuthHeaders(), extra);
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
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item === undefined || item === null) {
            return;
          }
          httpParams = httpParams.append(key, String(item));
        });
        return;
      }
      httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  private mergeHeaders(base: HttpHeaders, extra?: HttpHeaders): HttpHeaders {
    let headers = base;
    if (!extra) {
      return headers;
    }
    extra.keys().forEach((key) => {
      const value = extra.getAll(key);
      if (value) {
        headers = headers.set(key, value);
      }
    });
    return headers;
  }

  private normalizeLegacyOptions(
    input?: Record<string, unknown> | { params?: Record<string, unknown>; headers?: HttpHeaders },
  ): { params?: Record<string, unknown>; headers?: HttpHeaders } | undefined {
    if (!input) {
      return undefined;
    }
    if (this.isLegacyOptions(input)) {
      return input;
    }
    return { params: input as Record<string, unknown> };
  }

  private normalizeLegacyIdAndOptions(
    input?: string | number | { params?: Record<string, unknown>; headers?: HttpHeaders },
    options?: { params?: Record<string, unknown>; headers?: HttpHeaders },
  ): { id?: string | number; options?: { params?: Record<string, unknown>; headers?: HttpHeaders } } {
    if (input === undefined || input === null) {
      return options ? { options } : {};
    }
    if (typeof input === 'string' || typeof input === 'number') {
      return { id: input, options };
    }
    return { options: input };
  }

  private isLegacyOptions(
    value: Record<string, unknown> | { params?: Record<string, unknown>; headers?: HttpHeaders },
  ): value is { params?: Record<string, unknown>; headers?: HttpHeaders } {
    return Object.prototype.hasOwnProperty.call(value, 'params')
      || Object.prototype.hasOwnProperty.call(value, 'headers');
  }

  private isApiKey(value: ApiKey | string): value is ApiKey {
    return Object.prototype.hasOwnProperty.call(environment.API_BASES, value);
  }

  private log(method: string, api: ApiKey | 'legacy', url: string, body?: unknown): void {
    if (method === 'GET') {
      console.log('[RM][GET] api=%s url=%s', api, url);
      return;
    }
    if (method === 'POST') {
      console.log('[RM][POST] api=%s url=%s body=', api, url, body);
      return;
    }
    console.log('[RM][%s] api=%s url=%s', method, api, url);
  }

  private unwrapBody<T>(res: unknown): T {
    if (res && typeof res === 'object' && Object.prototype.hasOwnProperty.call(res, 'Body')) {
      const value = (res as { Body?: T }).Body;
      return (value as T) ?? (res as T);
    }
    if (res && typeof res === 'object' && Object.prototype.hasOwnProperty.call(res, 'body')) {
      const value = (res as { body?: T }).body;
      return (value as T) ?? (res as T);
    }
    return res as T;
  }
}
