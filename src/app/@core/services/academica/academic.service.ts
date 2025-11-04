import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { TokenService } from '../auth/token.service';

@Injectable({ providedIn: 'root' })
export class AcademicService {
  private readonly baseUrl = environment.ACADEMICA_SERVICE;

  constructor(private http: HttpClient, private tokenService: TokenService) {}

  get<T>(service: string, pathParams: Array<string | number> = []): Observable<T> {
    const url = this.composeUrl(service, pathParams);
    return this.http.get<T>(url, {
      headers: this.tokenService.buildAuthHeaders(),
    });
  }

  getStudentData<T>(studentCode: string): Observable<T> {
    return this.get<T>('datos_estudiante', [studentCode]);
  }

  getAcademicPeriod<T>(type: string): Observable<T> {
    return this.get<T>('periodo_academico', [type]);
  }

  private composeUrl(service: string, pathParams: Array<string | number> = []): string {
    const segments = [service, ...pathParams.map((param) => encodeURIComponent(String(param)))];
    return ${this.baseUrl.replace(/\/$/, '')}/;
  }
}