import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class ApiBaseInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (/^https?:\/\//i.test(req.url)) {
      return next.handle(req);
    }

    const apiKey = req.headers.get('x-api') ?? 'castor_mid';
    const sanitizedHeaders = req.headers.delete('x-api');
    const base = environment.API_BASES?.[apiKey];
    const nextUrl = base ? `${base}${req.url}` : req.url;
    console.log('[BASE]', apiKey, nextUrl);

    return next.handle(req.clone({
      url: nextUrl,
      headers: sanitizedHeaders,
    }));
  }
}
