import { Injectable } from '@angular/core';

export interface EstudianteContext {
  nombre: string;
  codigo: string;
  proyecto_curricular_id?: number;
  tercero_id?: number;
  carrera?: string;
  documento?: string;
}

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private estudianteContext: EstudianteContext | null = null;

  setEstudianteContext(data: EstudianteContext): void {
    this.estudianteContext = { ...this.estudianteContext, ...data };
  }

  getEstudianteContext(): EstudianteContext | null {
    return this.estudianteContext;
  }

  clearEstudianteContext(): void {
    this.estudianteContext = null;
  }
}
