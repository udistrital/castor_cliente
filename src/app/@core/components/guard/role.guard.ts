import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class RoleGuard {
  constructor(
    private router: Router,
    private request: RequestManager,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    const targetUrl = state.url;

    // ✅ No bloquees el onboarding del tutor por menú
    if (targetUrl.startsWith('/pages/tutor/registro')) return of(true);

    const userRaw = localStorage.getItem('user');
    if (!userRaw) return of(this.router.createUrlTree(['/pages/dashboard']));

    let roles = '';
    try {
      const user = JSON.parse(atob(userRaw));
      roles = Array(user?.user?.role).join(',').replace('Internal/everyone,', '');
    } catch {
      return of(this.router.createUrlTree(['/pages/dashboard']));
    }

    if (!environment.CONF_MENU_SERVICE) return of(true);

    return this.request.get(
      environment.CONF_MENU_SERVICE,
      `${roles}/${environment.appname}`
    ).pipe(
      map((response: any[]) => {
        // Validación simple: si el menú trae algo que coincida con /tutor, permitir
        const ok = (response || []).some(op => String(op?.Url || '').includes('tutor'));
        return ok ? true : this.router.createUrlTree(['/pages/dashboard']);
      }),
      // Dev: si falla menú, permitir (o cambia a dashboard si quieres bloquear)
      catchError((err) => {
        console.error('[RoleGuard] error', err);
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
// export class RoleGuard {
//   constructor(
//     private router: Router,
//     private request: RequestManager,
//     private popUp: UtilService,
//   ) {}

//   canActivate(
//     route: ActivatedRouteSnapshot,
//     state: RouterStateSnapshot
//   ): Observable<boolean | UrlTree> {

//     const targetUrl = state.url; // ej: /pages/tutor/registro

//     // ✅ Onboarding tutor: no depende de menú (evita bloqueos y loops)
//     if (targetUrl.startsWith('/pages/tutor/registro')) {
//       return of(true);
//     }

//     const userRaw = localStorage.getItem('user');
//     if (!userRaw) {
//       return of(this.router.createUrlTree(['/pages/dashboard']));
//     }

//     let roles = '';
//     try {
//       const user = JSON.parse(atob(userRaw));
//       roles = Array(user?.user?.role).join(',').replace('Internal/everyone,', '');
//     } catch {
//       return of(this.router.createUrlTree(['/pages/dashboard']));
//     }

//     return this.request.get(
//       environment.CONF_MENU_SERVICE,
//       `${roles}/${environment.appname}`
//     ).pipe(
//       map((response: any[]) => {
//         let autorizado = false;
//         (response || []).forEach(opcion => {
//           autorizado ||= String(opcion?.Url || '').indexOf(targetUrl.replace('/pages/', '')) !== -1
//             || targetUrl.indexOf(String(opcion?.Url || '')) !== -1;
//         });

//         if (!autorizado) {
//           // ⚠️ NO navegar aquí: solo devolver UrlTree
//           this.popUp.warning('No tiene acceso al módulo solicitado.');
//           return this.router.createUrlTree(['/pages/dashboard']);
//         }

//         return true;
//       }),
//       // En dev: si falla menú, no rompas el flujo
//       catchError((err) => {
//         console.error('[RoleGuard] menu error', err);
//         return of(true);
//       })
//     );
//   }
// }
