export interface PerfilEstudiante {
  id: number;
  tercero_id: number;
  proyecto_curricular_id: number;
  proyecto_curricular_nombre?: string;
  resumen?: string;
  habilidades?: string;
  cv_documento_id?: string | null;
  visible: boolean;
  fecha_creacion?: string;
  fecha_modificacion?: string;
}

export interface ConsultaDocumentoOK {
  relacionado: true;
  tercero_id: number;
  perfil_id: number;
  perfil: PerfilEstudiante;
}

export interface ConsultaDocumentoNO {
  relacionado: false;
  tercero_id: number;
  mensaje?: string;
}

export type ConsultaDocumento =
  | ConsultaDocumentoOK
  | ConsultaDocumentoNO;
