import { Component, OnInit } from '@angular/core';
//import { Router, NavigationEnd } from '@angular/router';
import { filter, shareReplay, take, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { UserService } from './pages/services/userService';
import { TokenService } from './@core/services/auth/token.service';
import { Router, NavigationStart, NavigationCancel, NavigationError, NavigationEnd } from '@angular/router';
//import { filter } from 'rxjs/operators';

declare let gtag: (config: string, code: string, path: any) => void;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  loadRouting = false;
  environment = environment;
  title = 'castor-cliente';
  private hasNavigatedToCheck = false;
  private readonly postLoginNavKey = 'castor_post_login_nav_done';
  private readonly userReady$ = this.tokenService.needUserWithRoles().pipe(
    tap((u) => console.log('[APP] user hidratado →', u)),
    shareReplay(1)
  );

  constructor(
    private router: Router,
    private userService: UserService,
    public tokenService: TokenService,
  ) {
    // this.router.events
    //   .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
    //   .subscribe((event) => {
    //     console.log('[ROUTER] NavigationEnd →', event.urlAfterRedirects ?? event.url);
    //     gtag('config', 'G-RBY2GQV40M', {
    //       page_path: event.urlAfterRedirects,
    //     });
    //   });
    this.router.events
    .pipe(filter(e =>
      e instanceof NavigationStart ||
      e instanceof NavigationEnd ||
      e instanceof NavigationCancel ||
      e instanceof NavigationError
    ))
    .subscribe(e => console.log('[ROUTER]', e));
  }

  ngOnInit(): void {
    this.userReady$.pipe(take(1)).subscribe((user) => {
      if (!user || this.hasNavigatedToCheck) {
        return;
      }
      const navDone = sessionStorage.getItem(this.postLoginNavKey) === '1';
      const currentUrl = this.router.url || '/';
      if (navDone || !this.isNeutralRoute(currentUrl)) {
        return;
      }
      this.hasNavigatedToCheck = true;
      this.loadRouting = true;
      console.log('[APP] Navi → /pages/check');
      this.router.navigateByUrl('/pages/check');
      sessionStorage.setItem(this.postLoginNavKey, '1');
    });

    const oas = document.querySelector('ng-uui-oas');
    if (!oas) {
      console.warn('[APP] No se encontró el widget OAS en el DOM.');
      return;
    }

    oas.addEventListener('user', (event: any) => {
      if (event.detail) {
        console.log('[OAS] user event recibido', event.detail);
        this.loadRouting = true;
        this.userService.updateUser(event.detail);
      }
    });

    oas.addEventListener('option', (event: any) => {
      if (event.detail) {
        setTimeout(() => this.router.navigate([event.detail.Url]), 50);
      }
    });

    oas.addEventListener('logout', (event: any) => {
      if (event.detail) {
        console.log(event.detail);
      }
    });
  }

  private isNeutralRoute(url: string): boolean {
    const normalized = url.split('?')[0].split('#')[0];
    return (
      normalized === '/' ||
      normalized === '/pages' ||
      normalized === '/pages/home' ||
      normalized === '/auth' ||
      normalized === '/pages/check'
    );
  }
}
