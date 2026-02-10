import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class RoleGuard {
  constructor(
    private router: Router,
    private request: RequestManager,
    private token: TokenService,
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    const targetUrl = state.url;

    // ✅ No bloquees el onboarding del tutor por menú
    if (targetUrl.startsWith('/pages/tutor/registro')) return of(true);

    const roleList = this.getRoles();
    const roles = roleList.join(',').replace('Internal/everyone,', '');

    if (targetUrl.startsWith('/pages/tutor')) {
      console.log('[RoleGuard] tutor url=', targetUrl, 'roles=', roles);
      if (roles.includes('DIRECTOR_EXTERNO') || roles.includes('TUTOR_EXTERNO') ||
          roles.includes('DOCENTE')) {
        return of(true);
      }
      if (!roles) {
        return of(true);
      }
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

  private getRoles(): string[] {
    const r1 = (this.token as any)?.currentUser?.role;
    const r2 = (this.token as any)?.roles;
    const r3 = (this.token as any)?.currentUser?.user?.role;
    const r = r1 ?? r2 ?? r3 ?? [];
    if (Array.isArray(r)) {
      return r.map(String);
    }
    if (typeof r === 'string') {
      return r.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
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
