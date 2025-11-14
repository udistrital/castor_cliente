import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../ui/loading.service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  constructor(private loader: LoadingService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const skip = req.url.includes('/assets/') || req.headers.get('X-Loader-Skip') === '1';
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
