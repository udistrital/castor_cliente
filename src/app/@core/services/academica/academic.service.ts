import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

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
  private readonly baseUrl = (environment.API_BASES?.academica || '').replace(/\/?$/, '/');

  constructor(private http: HttpClient) {}

  getDatosEstudiantePorCodigo(codigo: string): Observable<EstudianteAcademica | null> {
    const url = `${this.baseUrl}datos_estudiante/${encodeURIComponent(codigo)}`;
    console.log('URL ACADEMICA', url);
    return this.http.get<any>(url).pipe(
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
