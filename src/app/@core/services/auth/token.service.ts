import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AppUser, AuthTokens, OidcTokenPayload } from '../../models/auth.models';

interface AutenticacionMidResponse {
  Codigo?: string;
  documento?: string;
  Data?: unknown;
  role: string | string[];
  role_code?: string[];
  Estado?: string;
  state?: string;
  [key: string]: unknown;
}

const TOKEN_CONFIG = environment.TOKEN;

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly storagePrefix = environment.appname ?? 'castor_cliente';
  private readonly tokenStorageKey = `${this.storagePrefix}_auth_tokens`;
  private readonly userStorageKey = `${this.storagePrefix}_auth_user`;
  private readonly stateStorageKey = `${this.storagePrefix}_auth_state`;
  private readonly nonceStorageKey = `${this.storagePrefix}_auth_nonce`;

  private currentTokens: AuthTokens | null = null;
  private userSubject = new BehaviorSubject<AppUser | null>(null);

  readonly user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    this.bootstrapFromStorage();
    this.handleImplicitCallback();
  }

  get accessToken(): string | null {
    return this.currentTokens?.accessToken ?? null;
  }

  get idToken(): string | null {
    return this.currentTokens?.idToken ?? null;
  }

  get isAuthenticated(): boolean {
    return Boolean(this.currentTokens && this.currentTokens.expiresAt > Date.now());
  }

  get currentUser(): AppUser | null {
    return this.userSubject.getValue();
  }

  ensureUser(): Observable<AppUser | null> {
    if (!this.isAuthenticated) {
      this.clearSession();
      return of(null);
    }

    if (this.currentUser) {
      return of(this.currentUser);
    }

    const payload = this.currentTokens ? this.decodeJwt(this.currentTokens.idToken) : null;
    if (!payload) {
      return of(null);
    }

    return this.requestUserProfile(payload).pipe(catchError(() => of(this.buildFallbackUser(payload))));
  }

  login(): void {
    const state = this.generateRandomToken();
    const nonce = this.generateRandomToken();

    localStorage.setItem(this.stateStorageKey, state);
    localStorage.setItem(this.nonceStorageKey, nonce);

    const url = new URL(TOKEN_CONFIG.AUTORIZATION_URL);
    url.searchParams.set('client_id', TOKEN_CONFIG.CLIENTE_ID);
    url.searchParams.set('redirect_uri', TOKEN_CONFIG.REDIRECT_URL);
    url.searchParams.set('response_type', TOKEN_CONFIG.RESPONSE_TYPE);
    url.searchParams.set('scope', TOKEN_CONFIG.SCOPE);
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);

    window.location.href = url.toString();
  }

  logout(): void {
    const idToken = this.currentTokens?.idToken;
    this.clearSession();

    if (!TOKEN_CONFIG.SIGN_OUT_URL) {
      window.location.href = TOKEN_CONFIG.SIGN_OUT_REDIRECT_URL;
      return;
    }

    const url = new URL(TOKEN_CONFIG.SIGN_OUT_URL);
    if (idToken) {
      url.searchParams.set('id_token_hint', idToken);
    }
    if (TOKEN_CONFIG.SIGN_OUT_REDIRECT_URL) {
      url.searchParams.set('post_logout_redirect_uri', TOKEN_CONFIG.SIGN_OUT_REDIRECT_URL);
    }
    window.location.href = url.toString();
  }

  buildAuthHeaders(): HttpHeaders {
    const headersConfig: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.accessToken) {
      headersConfig.Authorization = `Bearer ${this.accessToken}`;
    }

    return new HttpHeaders(headersConfig);
  }

  private bootstrapFromStorage(): void {
    const rawTokens = localStorage.getItem(this.tokenStorageKey);
    if (rawTokens) {
      try {
        const parsed = JSON.parse(rawTokens) as AuthTokens;
        if (parsed.expiresAt > Date.now()) {
          this.currentTokens = parsed;
          this.loadUserFromStorage();
        } else {
          this.clearSession();
        }
      } catch (error) {
        console.warn('Error parsing stored auth tokens', error);
        this.clearSession();
      }
    }
  }

  private handleImplicitCallback(): void {
    const hash = window.location.hash ?? '';
    if (!hash || hash.length <= 1) {
      return;
    }

    const fragment = hash.startsWith('#') ? hash.substring(1) : hash;
    const params = new URLSearchParams(fragment);

    if (!params.has('access_token') || !params.has('id_token')) {
      return;
    }

    const returnedState = params.get('state') ?? undefined;
    const expectedState = localStorage.getItem(this.stateStorageKey) ?? undefined;
    if (expectedState && returnedState !== expectedState) {
      console.warn('State verification failed during authentication callback.');
      this.clearSession();
      this.sanitizeUrl();
      return;
    }

    const accessToken = params.get('access_token') ?? '';
    const idToken = params.get('id_token') ?? '';
    const expiresIn = Number(params.get('expires_in') ?? '0');

    if (!accessToken || !idToken) {
      return;
    }

    const expiresAt = Date.now() + expiresIn * 1000;
    this.currentTokens = {
      accessToken,
      idToken,
      expiresAt,
      state: returnedState,
    };
    localStorage.setItem(this.tokenStorageKey, JSON.stringify(this.currentTokens));

    const payload = this.decodeJwt(idToken);
    if (payload) {
      this.requestUserProfile(payload)
        .pipe(catchError(() => of(this.buildFallbackUser(payload))))
        .subscribe();
    }

    this.sanitizeUrl();
  }

  private requestUserProfile(payload: OidcTokenPayload): Observable<AppUser> {
    const email = payload.email ?? payload.sub;
    if (!email) {
      const fallback = this.buildFallbackUser(payload);
      this.cacheUser(fallback);
      return of(fallback);
    }

    const body = { user: email };
    return this.http
      .post<AutenticacionMidResponse>(TOKEN_CONFIG.AUTENTICACION_MID, body, {
        headers: this.buildAuthHeaders(),
      })
      .pipe(
        map((response) => this.mapUserResponse(email, payload, response)),
        tap((user) => this.cacheUser(user))
      );
  }

  private mapUserResponse(email: string, payload: OidcTokenPayload, response: AutenticacionMidResponse): AppUser {
    const document = response.Codigo || response.documento || payload.documento || '';
    const roles = this.normalizeRoles(response.role, response.role_code);
    const state = (response.Estado ?? response.state) as string | undefined;

    return {
      email,
      document,
      roles,
      state,
      rawTokenPayload: payload,
    };
  }

  private normalizeRoles(role: string | string[] | undefined, roleCodes?: string[]): string[] {
    if (Array.isArray(role)) {
      return role.filter(Boolean);
    }
    if (role) {
      return role.split(',').map((item) => item.trim()).filter(Boolean);
    }
    if (roleCodes && roleCodes.length > 0) {
      return roleCodes.filter(Boolean);
    }
    return [];
  }

  private cacheUser(user: AppUser): void {
    localStorage.setItem(this.userStorageKey, JSON.stringify(user));
    this.userSubject.next(user);
  }

  private loadUserFromStorage(): void {
    const rawUser = localStorage.getItem(this.userStorageKey);
    if (!rawUser) {
      return;
    }

    try {
      const user = JSON.parse(rawUser) as AppUser;
      this.userSubject.next(user);
    } catch (error) {
      console.warn('Error parsing stored user information', error);
      localStorage.removeItem(this.userStorageKey);
    }
  }

  private buildFallbackUser(payload: OidcTokenPayload): AppUser {
    const email = payload.email ?? payload.sub ?? 'usuario@udistrital.edu.co';
    const roles = this.normalizeRoles(payload.role as string | string[] | undefined);
    const document = (payload as { documento?: string }).documento ?? '';

    const user: AppUser = {
      email,
      document,
      roles,
      rawTokenPayload: payload,
    };

    this.cacheUser(user);
    return user;
  }

  private decodeJwt(token: string | null): OidcTokenPayload | null {
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length < 2) {
      return null;
    }

    try {
      const payload = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const decoded = decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(decoded) as OidcTokenPayload;
    } catch (error) {
      console.warn('Unable to decode JWT payload', error);
      return null;
    }
  }

  private clearSession(): void {
    this.currentTokens = null;
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
    localStorage.removeItem(this.stateStorageKey);
    localStorage.removeItem(this.nonceStorageKey);
    this.userSubject.next(null);
  }

  private sanitizeUrl(): void {
    const newUrl = window.location.pathname + window.location.search;
    window.history.replaceState({}, document.title, newUrl);
  }

  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2) + crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
  }
}
