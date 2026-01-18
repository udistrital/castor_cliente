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

interface GestorDocResponse {
  // Basado en el ejemplo de Polux: response.data.file
  file?: string;
  data?: { file?: string };
  Data?: { file?: string };
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
        return this.http.post<GestorRespuesta>(url, body, {
          headers: this.tokenService.buildAuthHeaders(),
        });
      }),
      map((resp) => {
        const data = resp?.data ?? resp?.Data ?? resp;
        const enlace =
          data?.res?.Enlace ??
          data?.res?.Id ??
          data?.Enlace ??
          data?.Id ??
          data?.id;

        if (!enlace) {
          throw new Error('Respuesta del Gestor Documental sin identificador de documento');
        }
        return String(enlace);
      }),
    );
  }

  /**
   * Obtiene el documento en base64 desde el Gestor.
   * Ruta esperada (como en Polux): GET /document/{id}
   */
  getDocumentoBase64(documentoId: string | number): Observable<string> {
    if (!this.baseUrl) {
      return throwError(() => new Error('GESTOR_DOCUMENTAL_SERVICE no está configurado.'));
    }
    if (!documentoId) {
      return throwError(() => new Error('documentoId inválido.'));
    }

    const url = `${this.baseUrl}/document/${documentoId}`;
    return this.http.get<GestorDocResponse>(url, {
      headers: this.tokenService.buildAuthHeaders(),
    }).pipe(
      map((resp) => {
        const file =
          resp?.file ??
          resp?.data?.file ??
          (resp as any)?.Data?.file ??
          (resp as any)?.data?.file;

        if (!file) {
          throw new Error('Respuesta del Gestor sin campo file (base64).');
        }
        return String(file);
      }),
    );
  }

  /**
   * Convierte base64 a Blob PDF.
   */
  getDocumentoPdfBlob(documentoId: string | number): Observable<Blob> {
    return this.getDocumentoBase64(documentoId).pipe(
      map((base64) => this.base64ToBlob(base64, 'application/pdf')),
    );
  }

  /**
   * Abre el PDF en una nueva pestaña.
   * Reutilizable para estudiante/tutor/explorar.
   */
    /** Descarga y abre PDF por id/uid del gestor documental (base64 -> Blob -> window.open) */
  openPdfByDocumentoId(documentoId: string | number): Observable<void> {
    const id = String(documentoId ?? '').trim();
    if (!id) {
      return throwError(() => new Error('documentoId inválido'));
    }
    if (!this.baseUrl) {
      return throwError(() => new Error('GESTOR_DOCUMENTAL_SERVICE no está configurado.'));
    }

    // En Polux: GET /document/:uid
    const url = `${this.baseUrl}/document/${encodeURIComponent(id)}`;

    return this.http.get<any>(url, {
      headers: this.tokenService.buildAuthHeaders(),
    }).pipe(
      map((resp) => {
        // soporta varias envolturas
        const data = resp?.data ?? resp?.Data ?? resp;
        const fileBase64 =
          data?.file ??
          data?.File ??
          data?.data?.file ??
          data?.data?.File ??
          null;

        if (!fileBase64 || typeof fileBase64 !== 'string') {
          throw new Error('Respuesta del gestor sin campo file (base64)');
        }

        const bytes = this.base64ToUint8Array(fileBase64);
        // ✅ Fuerza a que el backing buffer sea ArrayBuffer (evita SharedArrayBuffer / ArrayBufferLike)
        const safeBytes = new Uint8Array(bytes);
        const blob = new Blob([safeBytes], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(blob);

        window.open(
          fileURL,
          '_blank',
          'resizable=yes,status=no,location=no,toolbar=no,menubar=no,fullscreen=yes,scrollbars=yes,dependent=no,width=900,height=900'
        );

        // (opcional) liberar URL luego de un tiempo
        setTimeout(() => URL.revokeObjectURL(fileURL), 60_000);

        return void 0;
      })
    );
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    // limpia prefijos tipo "data:application/pdf;base64,"
    const cleaned = base64.includes(',')
      ? base64.split(',').pop() as string
      : base64;

    const binary = atob(cleaned);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }


  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * IMPORTANT: esta implementación evita el error TS2322.
   * Usamos Uint8Array "normal" y lo pasamos como BlobPart válido.
   */
  private base64ToBlob(base64: string, mime: string): Blob {
    // Algunas APIs devuelven "data:application/pdf;base64,...."
    const clean = base64.includes(',') ? base64.split(',').pop() ?? base64 : base64;

    const binary = atob(clean);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }
}
