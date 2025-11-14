import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { RequestManager } from '../../pages/services/requestManager';

@Injectable({ providedIn: 'root' })
export class OikosService {
  constructor(private rm: RequestManager) {}

  getProyectoCurricularNombreById(id: number): Observable<any> {
    const path = `dependencia/${id}`;
    return this.rm
      .oikosGet<any>(path)
      .pipe(tap((resp) => console.log('[OIKOS] dependencia(%s) →', id, resp)));
  }

  getProyectosCurricularesLista(): Observable<any> {
    const query = 'dependencia?query=tipo_dependencia_id:<ID_PC>,activo:true&limit=0';
    return this.rm
      .oikosGet<any>(query)
      .pipe(tap((resp) => console.log('[OIKOS] lista PCs →', resp)));
  }
}
