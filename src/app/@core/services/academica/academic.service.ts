import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { RequestManager } from 'src/app/pages/services/requestManager';

export interface EstudianteAcademica {
  Codigo: string;
  Nombre: string;
  Estado: string;
  Periodo: string;
  Promedio: string;
  Rendimiento: string;
  PorcentajeCursado: string;
  Nivel: string;
  TipoCarrera: string;
  Carrera: string;
  Pensum: string;
  Modalidad: string;
}

@Injectable({ providedIn: 'root' })
export class AcademicService {
  constructor(private requestManager: RequestManager) {}

  getDatosEstudiantePorCodigo(codigo: string): Observable<EstudianteAcademica | null> {
    // Use RequestManager to include auth headers without custom headers.
    const path = `datos_estudiante/${encodeURIComponent(codigo)}`;
    console.log('URL ACADEMICA', path);
    return this.requestManager.academicaGet<any>(path).pipe(
      map((raw) => this.mapearRespuesta(raw)),
      tap((resp) => console.log('[ACADEMICA] datos_estudiante(%s) →', codigo, resp))
    );
  }

  private mapearRespuesta(raw: any): EstudianteAcademica | null {
    const arr = raw?.estudianteCollection?.datosEstudiante;
    const e = Array.isArray(arr) && arr.length ? arr[0] : null;
    if (!e) return null;

    return {
      Codigo:     String(e.codigo ?? ''),
      Nombre:     String(e.nombre ?? ''),
      Estado:     String(e.estado ?? ''),
      Periodo:    String(e.periodo ?? ''),
      Promedio:   String(e.promedio ?? ''),
      Rendimiento:String(e.rendimiento ?? ''),
      PorcentajeCursado: String(e.porcentaje_cursado ?? ''),
      Nivel:      String(e.nivel ?? ''),
      TipoCarrera:String(e.tipo_carrera ?? ''),
      Carrera:    String(e.carrera ?? ''),
      Pensum:     String(e.pensum ?? ''),
      Modalidad:  '', // se setea luego a 'PAS_PLX'
    };
  }
}
