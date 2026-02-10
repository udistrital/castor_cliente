import { HttpContextToken } from '@angular/common/http';

// HttpContextToken stays client-side; avoids custom headers that trigger CORS preflight.
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);
