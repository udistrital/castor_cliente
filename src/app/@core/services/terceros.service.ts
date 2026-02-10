import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { RequestManager } from 'src/app/pages/services/requestManager';
import { ApiEnvelope } from '../models/comunes.model';

@Injectable({ providedIn: 'root' })
export class TercerosService {
  constructor(private requestManager: RequestManager) {}

  getEmpresaById(id: number): Observable<any> {
    return this.requestManager
      .get<ApiEnvelope<any>>('castor_mid', `terceros/empresa/${id}`)
      .pipe(map((res) => res?.Data ?? res));
  }
}
