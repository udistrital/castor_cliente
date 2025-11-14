import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { TokenService } from '../auth/token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const accessToken = tokenService.accessToken;

  if (!accessToken) {
    return next(req);
  }

  const headers = req.headers
    .set('Authorization', `Bearer ${accessToken}`)
    .set('Accept', req.headers.get('Accept') ?? 'application/json');

  const authRequest = req.clone({ headers });
  return next(authRequest);
};
