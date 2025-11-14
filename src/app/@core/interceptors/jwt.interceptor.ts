import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from '../services/auth/token.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private tokenService: TokenService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let accessToken = this.tokenService.accessToken;
    if (!accessToken) {
      accessToken = localStorage.getItem('access_token');
    }
    console.log('[JWT] token?', !!accessToken);
    if (!accessToken) {
      return next.handle(req);
    }

    const headers = req.headers
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Accept', req.headers.get('Accept') ?? 'application/json');

    return next.handle(req.clone({ headers }));
  }
}
