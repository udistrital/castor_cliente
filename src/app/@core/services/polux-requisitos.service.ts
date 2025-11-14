import { Injectable } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { RequestManager } from '../../pages/services/requestManager';

@Injectable({ providedIn: 'root' })
export class PoluxRequisitosService {
  constructor(private rm: RequestManager) {}

  verificarRequisitosRegistrar(estudiantePayload: Record<string, unknown>): Observable<boolean> {
    const payload = {
      ...estudiantePayload,
      Modalidad: 'PAS_PLX',
    };

    return this.rm
      .poluxMidPost<any>('verificarRequisitos/Registrar', payload)
      .pipe(
        map((resp) => Boolean(resp?.Data?.RequisitosModalidades === true)),
        tap((result) => console.log('[POLUX] verificarRequisitos/Registrar →', result))
      );
  }
}
