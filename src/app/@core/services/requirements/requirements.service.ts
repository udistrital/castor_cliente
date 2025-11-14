import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PoluxMidService } from '../polux/polux-mid.service';
import { TokenService } from '../auth/token.service';

export interface RequisitosResponse {
  RequisitosModalidades?: boolean;
  Data?: { RequisitosModalidades?: boolean };
  [k: string]: any;
}

@Injectable({ providedIn: 'root' })
export class RequirementsService {
  constructor(
    private http: HttpClient,
    private poluxMid: PoluxMidService,
    private token: TokenService
  ) {}

  verificarRequisitosRegistrar(payload: any): Observable<boolean> {
    const url = this.poluxMid.compose('verificarRequisitos/Registrar');
    return this.http.post<any>(url, payload, { headers: this.token.buildAuthHeaders() }).pipe(
      map(res => {
        // adapta al contrato real del MID
        // ej: { Success:true, Data:{ RequisitosModalidades:true } }
        const v = res?.Data?.RequisitosModalidades;
        return v === true;
      })
    );
  }
}
