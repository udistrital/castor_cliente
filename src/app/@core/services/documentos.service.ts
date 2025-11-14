import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenService } from './auth/token.service';

interface UploadAnyFormatResponse {
  res?: {
    Enlace?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  /**
   * URL base del MID de Gestión Documental.
   * Ej: http://localhost:8082/gestor_documental_mid/v1/
   */
  private readonly baseUrl: string;

  constructor(
    private http: HttpClient,
    private token: TokenService,
  ) {
    // ⚠️ IMPORTANTE: nada de getters recursivos ni uso de this.baseUrl adentro
    const raw = (environment as any).GESTOR_DOCUMENTAL_SERVICE
      ?? (environment as any).GESTION_DOCUMENTAL_SERVICE
      ?? '';

    // Normalizamos: sin trailing slash
    this.baseUrl = String(raw).replace(/\/+$/, '');
  }

  /**
   * Sube un único PDF de hoja de vida al MID de Gestión Documental
   * y devuelve el Enlace (string) que luego se guarda como cv_documento_id.
   */
  uploadCvPdf(
    file: File,
    opts?: { nombreArchivo?: string; observaciones?: string },
  ): Observable<string> {
    console.log('[DOCS] uploadCvPdf INICIO', file?.name, opts);

    const nombreArchivo =
      opts?.nombreArchivo || file.name || 'hoja_de_vida.pdf';

    const observaciones =
      opts?.observaciones ||
      'Hoja de vida cargada desde castor_cliente';

    return new Observable<string>((observer) => {
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const result = reader.result as string | null;
          if (!result) {
            throw new Error('No se pudo leer el archivo como base64');
          }

          // result: "data:application/pdf;base64,AAAA..."
          const base64 = result.split(',')[1] || '';

          const payload = [
            {
              IdTipoDocumento: null, // si luego tenemos el código tipo doc, se llena acá
              nombre: nombreArchivo,
              metadatos: {
                NombreArchivo: nombreArchivo,
                Tipo: 'Archivo',
                Observaciones: observaciones,
              },
              descripcion: 'Hoja de vida estudiante (Castor)',
              file: base64,
            },
          ];

          const url = `${this.baseUrl}/document/uploadAnyFormat`;
          console.log('[DOCS] POST', url, payload);

          this.http
            .post<UploadAnyFormatResponse>(url, payload, {
              headers: this.token.buildAuthHeaders(),
            })
            .pipe(
              map((resp) => {
                const enlace = resp?.res?.Enlace;
                if (!enlace || typeof enlace !== 'string') {
                  throw new Error('Respuesta del Gestor sin Enlace válido');
                }
                return enlace;
              }),
            )
            .subscribe({
              next: (enlace) => {
                console.log('[DOCS] respuesta Gestor →', enlace);
                observer.next(enlace);
                observer.complete();
              },
              error: (err) => {
                console.error('[DOCS] error HTTP Gestor', err);
                observer.error(err);
              },
            });
        } catch (e) {
          console.error('[DOCS] error al preparar payload', e);
          observer.error(e);
        }
      };

      reader.onerror = (ev) => {
        console.error('[DOCS] FileReader error', ev);
        observer.error(ev);
      };

      reader.readAsDataURL(file);
    });
  }
}
