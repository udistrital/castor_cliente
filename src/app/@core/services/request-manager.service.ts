import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

type RequestOptions = {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  withCredentials?: boolean;
  responseType?: 'json';
  body?: unknown;
};

@Injectable({ providedIn: 'root' })
export class RequestManager {
  constructor(private http: HttpClient) {}

  midGet<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(endpoint, this.buildOptions('castor_mid', options));
  }

  midPost<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(endpoint, body, this.buildOptions('castor_mid', options));
  }

  midPut<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.put<T>(endpoint, body, this.buildOptions('castor_mid', options));
  }

  midDelete<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(endpoint, this.buildOptions('castor_mid', options));
  }

  crudGet<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(endpoint, this.buildOptions('castor_crud', options));
  }

  crudPost<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(endpoint, body, this.buildOptions('castor_crud', options));
  }

  crudPut<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.put<T>(endpoint, body, this.buildOptions('castor_crud', options));
  }

  crudDelete<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.delete<T>(endpoint, this.buildOptions('castor_crud', options));
  }

  docCrudPost<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(endpoint, body, this.buildOptions('documento_crud', options));
  }

  gdMidPost<T>(endpoint: string, body: unknown, options?: RequestOptions): Observable<T> {
    return this.http.post<T>(endpoint, body, this.buildOptions('gestor_documental_mid', options));
  }

  oikosGet<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(endpoint, this.buildOptions('oikos', options));
  }

  configuracionGet<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(endpoint, this.buildOptions('configuracion', options));
  }

  parametrosGet<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.http.get<T>(endpoint, this.buildOptions('parametros', options));
  }

  private buildOptions(apiKey: string, options?: RequestOptions) {
    const headers = this.ensureHeadersWithApi(apiKey, options?.headers);
    const { headers: _ignored, ...rest } = options ?? {};
    return { ...rest, headers };
  }

  private ensureHeadersWithApi(apiKey: string, headers?: RequestOptions['headers']): HttpHeaders {
    let nextHeaders: HttpHeaders;
    if (headers instanceof HttpHeaders) {
      nextHeaders = headers;
    } else if (headers) {
      nextHeaders = new HttpHeaders(headers);
    } else {
      nextHeaders = new HttpHeaders();
    }
    return nextHeaders.set('x-api', apiKey);
  }
}
