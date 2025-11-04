import { Injectable } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';

import { AcademicService } from '../academica/academic.service';
import { PoluxMidService } from '../polux/polux-mid.service';
import { PoluxService } from '../polux/polux.service';
import {
  StudentQuantityValidationPayload,
  StudentRequirementPayload,
  StudentRequirementResponse,
} from '../../models/student.models';

interface PoluxQueryResponse<T = unknown> {
  Data?: T;
  Success?: boolean;
  [key: string]: unknown;
}

@Injectable({ providedIn: 'root' })
export class RequirementsService {
  constructor(
    private readonly academicService: AcademicService,
    private readonly poluxMidService: PoluxMidService,
    private readonly poluxService: PoluxService
  ) {}

  validateEligibility(
    studentCode: string,
    modalidad: string | number,
    tipoCarrera: string,
    estudianteCarrera?: string | number
  ): Observable<boolean> {
    return this.buildRequirementPayload(studentCode, modalidad, tipoCarrera, estudianteCarrera).pipe(
      switchMap((payload) => this.checkGeneralRequirements(payload))
    );
  }

  checkGeneralRequirements(payload: StudentRequirementPayload): Observable<boolean> {
    return this.poluxMidService
      .post<StudentRequirementResponse>('verificarRequisitos/Registrar', payload)
      .pipe(map((response) => Boolean(response?.Data && (response.Data as { RequisitosModalidades?: boolean }).RequisitosModalidades)));
  }

  checkStudentQuantity(modalidad: string, cantidad: number): Observable<boolean> {
    const payload: StudentQuantityValidationPayload = {
      Modalidad: modalidad,
      Cantidad: String(cantidad),
    };
    return this.poluxMidService
      .post<StudentRequirementResponse>('verificarRequisitos/CantidadModalidades', payload)
      .pipe(map((response) => Boolean(response?.Data && (response.Data as { RequisitosModalidades?: boolean }).RequisitosModalidades)));
  }

  hasActiveThesis(studentCode: string): Observable<boolean> {
    const params = {
      query: Estudiante:,EstadoEstudianteTrabajoGrado:1,
      limit: 1,
    };
    return this.poluxService
      .get<PoluxQueryResponse<unknown[]>>('estudiante_trabajo_grado', params)
      .pipe(map((response) => Array.isArray(response?.Data) && response.Data.length > 0));
  }

  hasPendingRequest(studentCode: string, tipoSolicitudId: number): Observable<boolean> {
    const params = {
      query: SolicitudTrabajoGrado.ModalidadTipoSolicitud.TipoSolicitud.Id:,Usuario:,
      sortby: 'SolicitudTrabajoGrado',
      order: 'desc',
      limit: 1,
    };

    return this.poluxService
      .get<PoluxQueryResponse<unknown[]>>('usuario_solicitud', params)
      .pipe(map((response) => Array.isArray(response?.Data) && response.Data.length > 0));
  }

  private buildRequirementPayload(
    studentCode: string,
    modalidad: string | number,
    tipoCarrera: string,
    carrera?: string | number
  ): Observable<StudentRequirementPayload> {
    return this.academicService.getStudentData<any>(studentCode).pipe(
      map((response) => this.mapAcademicResponse(studentCode, modalidad, tipoCarrera, carrera, response))
    );
  }

  private mapAcademicResponse(
    studentCode: string,
    modalidad: string | number,
    tipoCarrera: string,
    carrera: string | number | undefined,
    response: any
  ): StudentRequirementPayload {
    const dataRoot = response?.data ?? response;
    const collection =
      dataRoot?.estudianteCollection?.datosEstudiante ??
      dataRoot?.estudianteCollection?.datos_estudiante ??
      dataRoot?.datosEstudianteCollection?.datosEstudiante ??
      [];
    const student = Array.isArray(collection) && collection.length > 0 ? collection[0] : undefined;

    const porcentaje = Number(
      student?.porcentaje_cursado ??
        student?.creditosCollection?.datosCreditos?.[0]?.porcentaje?.porcentaje_cursado?.[0]?.porcentaje_cursado ??
        0
    );

    const payload: StudentRequirementPayload = {
      Codigo: String(studentCode),
      Nombre: student?.nombre ?? '',
      Modalidad: modalidad,
      Tipo: tipoCarrera,
      PorcentajeCursado: Number.isFinite(porcentaje) ? porcentaje : undefined,
      Promedio: this.toNumber(student?.promedio),
      Rendimiento: student?.rendimiento ?? student?.reg_rendimiento_ac ?? student?.REG_RENDIMIENTO_AC,
      Estado: student?.estado ?? student?.EST_ESTADO_EST,
      Nivel: student?.nivel ?? student?.TRA_NIVEL,
      TipoCarrera: student?.nombre_tipo_carrera ?? student?.tipo_carrera ?? tipoCarrera,
      Carrera: student?.carrera ?? carrera,
    };

    return payload;
  }

  private toNumber(value: unknown): number | undefined {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
}