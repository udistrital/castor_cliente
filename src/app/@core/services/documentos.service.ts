import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { TokenService } from './auth/token.service';

interface GestorRespuesta {
  data?: any;
  Data?: any;
  res?: { Enlace?: string; Id?: string | number };
  Enlace?: string;
  Id?: string | number;
  id?: string | number;
}

@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly baseUrl = (environment.GESTOR_DOCUMENTAL_SERVICE ?? '').replace(/\/+$/, '');

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
  ) {}

  uploadCvPdf(
    file: File,
    opts: { nombreArchivo: string; observaciones?: string },
  ): Observable<string> {
    if (!file) {
      return throwError(() => new Error('Archivo de hoja de vida inválido.'));
    }

    const nombreArchivo = opts?.nombreArchivo || file.name || 'hoja_de_vida.pdf';
    const observaciones = opts?.observaciones ?? 'Hoja de vida estudiante Castor';

    console.log('[DOCS] uploadCvPdf INICIO', file.name, opts);

    return from(file.arrayBuffer()).pipe(
      map((buffer) => this.arrayBufferToBase64(buffer)),
      switchMap((base64) => {
        if (!this.baseUrl) {
          throw new Error('GESTOR_DOCUMENTAL_SERVICE no está configurado.');
        }

        const body = [
          {
            IdTipoDocumento: 68,
            nombre: nombreArchivo,
            metadatos: {
              NombreArchivo: nombreArchivo,
              Tipo: 'Archivo',
              Observaciones: observaciones,
            },
            descripcion: 'Hoja de vida estudiante Castor',
            file: base64,
          },
        ];

        const url = `${this.baseUrl}/document/uploadAnyFormat`;
        console.log('[DOCS] POST', url, { nombre: body[0].nombre, size: file.size });

        return this.http.post<GestorRespuesta>(url, body, {
          headers: this.tokenService.buildAuthHeaders(),
        });
      }),
      map((resp) => {
        console.log('[DOCS] respuesta Gestor', resp);
        const data = resp?.data ?? resp?.Data ?? resp;
        const enlace =
          data?.res?.Enlace ??
          data?.Enlace ??
          data?.Id ??
          data?.id;

        if (!enlace) {
          throw new Error('Respuesta del Gestor Documental sin identificador de documento');
        }
        return String(enlace);
      })
    );
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
