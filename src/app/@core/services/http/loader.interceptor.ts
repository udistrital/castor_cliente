import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../ui/loading.service';
import { SKIP_LOADER } from './http-context.tokens';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  constructor(private loader: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Use HttpContextToken to skip loader without sending custom headers (preflight-safe).
    const skip = req.url.includes('/assets/') || req.context.get(SKIP_LOADER) === true;
    if (!skip) {
      this.loader.inc();
    }
    return next.handle(req).pipe(
      finalize(() => {
        if (!skip) {
          this.loader.dec();
        }
      })
    );
  }
}
