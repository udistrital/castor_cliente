import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { CommonModule, HashLocationStrategy, LocationStrategy } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AppComponent } from './app.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LoaderInterceptor } from './@core/services/http/loader.interceptor';
import { TokenService } from './@core/services/auth/token.service';
import { GlobalLoadingOverlayComponent } from './@shared/components/global-loading-overlay.component';



@NgModule({ declarations: [
        AppComponent,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    bootstrap: [AppComponent], imports: [CommonModule,
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatSnackBarModule,
        GlobalLoadingOverlayComponent,
        ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })], providers: [
        { provide: LocationStrategy, useClass: HashLocationStrategy },
        // Provide HttpClient only once to avoid interceptor recursion from feature modules.
        provideHttpClient(withInterceptorsFromDi()),
        { provide: APP_INITIALIZER, useFactory: (token: TokenService) => () => token.init(), deps: [TokenService], multi: true },
        // Register loader interceptor once to avoid duplicate loading toggles.
        { provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true }
    ] })
export class AppModule { }
