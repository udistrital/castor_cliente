import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';

export interface TutorEstadoRequest {
  numero_documento: string;
}

export interface TutorEstadoResponse {
  Success: boolean;
  Status: number;
  Message: string;
  Data: {
    tutor_id: number;
    empresa_id: number | null;
    needs_empresa: boolean;
  };
}

export interface UpsertTutorEmpresaRequest {
  numero_documento: string;
  empresa: {
    nit_sin_dv: string;
    razon_social: string;
    // opcionales (por si luego quieres forzarlos)
    tipo_contribuyente_id?: number;
    tipo_documento_id?: number;
  };
}

export interface TerceroDTO {
  Id: number;
  NombreCompleto?: string;
  PrimerNombre?: string;
  SegundoNombre?: string;
  PrimerApellido?: string;
  SegundoApellido?: string;
}

@Injectable({ providedIn: 'root' })
export class TutorDashboardService {
  constructor(private rm: RequestManager) {}

  getEstado(body: TutorEstadoRequest): Observable<TutorEstadoResponse> {
    return this.rm.post('castor_mid', 'tutores/estado', body);
  }

  upsertEmpresa(body: UpsertTutorEmpresaRequest): Observable<any> {
    return this.rm.post('castor_mid', 'tutores/empresa', body);
  }

  // Para traer nombre del tutor (desde Terceros vía MID)
  getTutorById(id: number): Observable<any> {
    return this.rm.get('castor_mid', `terceros/tutor/${id}`);
  }

  // Alias por compatibilidad si tu componente aún llama crearEmpresa()
  crearEmpresa(body: UpsertTutorEmpresaRequest): Observable<any> {
    return this.upsertEmpresa(body);
  }
}
