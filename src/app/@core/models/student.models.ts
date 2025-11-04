export interface StudentRequirementPayload {
  Codigo: string;
  Nombre: string;
  Modalidad: string | number;
  Tipo: string;
  PorcentajeCursado?: number;
  Promedio?: number;
  Rendimiento?: string | number;
  Estado?: string;
  Nivel?: string;
  TipoCarrera?: string;
  Carrera?: string | number;
}

export interface StudentRequirementResponse {
  Success: boolean;
  Data?: {
    RequisitosModalidades?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface StudentQuantityValidationPayload {
  Modalidad: string;
  Cantidad: string;
}