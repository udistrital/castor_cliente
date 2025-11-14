export interface OidcTokenPayload {
  sub: string;
  email?: string;
  documento?: string;
  role?: string | string[];
  exp?: number;
  [key: string]: unknown;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  expiresAt: number;
  state?: string;
}

export interface AppUser {
  email: string;
  document: string;
  roles: string[];
  state?: string;
  codigo?: string;
  rawTokenPayload?: OidcTokenPayload;
}
