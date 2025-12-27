import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class NavGuard {
  constructor(
    private router: Router,
    private request: RequestManager,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    // Dev: si no hay config, no bloquea
    if (!environment.CONFIGURACION_SERVICE) return of(true);

    return this.request.get(
      environment.CONFIGURACION_SERVICE,
      `parametro?query=Aplicacion.Nombre:${environment.appname}`
    ).pipe(
      map((response: any[]) => {
        const granted = response?.[0]?.Valor === 'true';
        return granted ? true : this.router.createUrlTree(['/pages/check']);
      }),
      // Dev: si falla configuración, deja pasar para no romper login
      catchError((err) => {
        console.error('[NavGuard] error', err);
        return of(true);
      })
    );
  }
}





// import { Injectable } from '@angular/core';
// import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
// import { Observable, of } from 'rxjs';
// import { catchError, map } from 'rxjs/operators';
// import { RequestManager } from 'src/app/pages/services/requestManager';
// import { UtilService } from 'src/app/pages/services/utilService';
// import { environment } from 'src/environments/environment';

// @Injectable({ providedIn: 'root' })
// export class NavGuard {

//   constructor(
//     private router: Router,
//     private request: RequestManager,
//     private popUp: UtilService,
//   ) {}

//   canActivate(
//     route: ActivatedRouteSnapshot,
//     state: RouterStateSnapshot
//   ): Observable<boolean | UrlTree> {

//     this.popUp.loading();

//     return this.request.get(
//       environment.CONFIGURACION_SERVICE,
//       `parametro?query=Aplicacion.Nombre:${environment.appname}`
//     ).pipe(
//       map((response: any[]) => {
//         const granted = response?.[0]?.Valor === 'true';
//         this.popUp.close();

//         if (!granted) {
//           this.popUp.warning('El sistema se encuentra cerrado temporalmente.');
//           // ⚠️ NO navegar aquí: solo devolver UrlTree
//           return this.router.createUrlTree(['/pages/dashboard']);
//         }
//         return true;
//       }),
//       // En dev: si Configuración cae, deja pasar
//       catchError((err) => {
//         console.error('[NavGuard] configuracion error', err);
//         this.popUp.close();
//         return of(true);
//       })
//     );
//   }
// }
