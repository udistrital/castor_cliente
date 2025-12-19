import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { EstudiantesService } from 'src/app/@core/services/estudiantes.service';
import { AcademicService } from 'src/app/@core/services/academica/academic.service';
import { RequirementsService } from 'src/app/@core/services/requirements/requirements.service';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { AppUser } from 'src/app/@core/models/auth.models';

@Component({
  selector: 'app-check',
  standalone: true,
  template: `
    <div class="p-6 text-center text-sm opacity-80">
      Verificando información del estudiante...
    </div>
  `,
})
export class CheckComponent implements OnInit {
  private started = false;

  constructor(
    private token: TokenService,
    private estudiantes: EstudiantesService,
    private academica: AcademicService,
    private requisitos: RequirementsService,
    private loading: LoadingService,
    private alert: AlertService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('[CHECK] init');
    this.token.user$.pipe(
      filter((user): user is AppUser => Boolean(user)),
      take(1),
    ).subscribe(() => {
      if (this.started) {
        return;
      }
      this.started = true;
      this.runCheckFlow().catch(err => {
        console.error('[CHECK] runCheckFlow error', err);
        this.loading.hide();
        sessionStorage.removeItem('castor_check_running');
        this.alert.error('Error', 'No se pudo verificar tu información. Intenta más tarde.');
        this.router.navigateByUrl('/pages/home');
      });
    });
  }

  private async runCheckFlow(): Promise<void> {
    const runningKey = 'castor_check_running';
    if (sessionStorage.getItem(runningKey) === '1') {
      return;
    }
    sessionStorage.setItem(runningKey, '1');

    const u = this.token.currentUser!;
    const documento = this.token.documento || '';
    const codigo = this.token.codigo || '';
    const roles = (u.roles || []).map(r => r.toUpperCase());
    console.log('[CHECK] ids →', { documento, codigo, roles });

    const baseCtx = { documento, codigo, nombre: '', carrera: '' };
    localStorage.setItem('castor_estudiante_ctx', JSON.stringify(baseCtx));

    if (roles.includes('TUTOR') || roles.includes('TUTOR_EXTERNO')) {
      this.router.navigateByUrl('/pages/dashboard/tutor');
      sessionStorage.removeItem(runningKey);
      return;
    }

    // 1) consulta_documento
    this.loading.show('Verificando registro en Castor…');
    const castor = await this.estudiantes.consultarPorDocumento(documento).toPromise();
    this.loading.hide();

    const relacionado = !!castor?.relacionado;
    const terceroId = Number(castor?.tercero_id || 0);
    console.log('[CHECK] consulta_documento →', { relacionado, terceroId });

    if (relacionado) {
      localStorage.setItem('castor_ultimo_check', JSON.stringify({ relacionado:true, tercero_id:terceroId }));
      if (codigo) {
        this.loading.show('Preparando tu panel…');
        try {
          const aca = await this.academica.getDatosEstudiantePorCodigo(codigo).toPromise();
          const nombre = (aca as any)?.Nombre || '';
          const carrera = (aca as any)?.Carrera || '';
          localStorage.setItem(
            'castor_estudiante_ctx',
            JSON.stringify({ documento, codigo, nombre: nombre || '', carrera: carrera || '' })
          );
        } catch {
          localStorage.setItem('castor_estudiante_ctx', JSON.stringify({ documento, codigo, nombre: '', carrera: '' }));
        } finally {
          this.loading.hide();
          this.router.navigateByUrl('/pages/home');
          sessionStorage.removeItem(runningKey);
        }
      } else {
        localStorage.setItem('castor_estudiante_ctx', JSON.stringify({ documento, codigo, nombre: '', carrera: '' }));
        this.router.navigateByUrl('/pages/home');
        sessionStorage.removeItem(runningKey);
      }
      return;
    }

    // 2) Académica con Código
    if (!codigo) {
      this.alert.error('Validación incompleta', 'No recibimos tu código académico. Inicia sesión nuevamente.');
      this.router.navigateByUrl('/pages/home');
      sessionStorage.removeItem(runningKey);
      return;
    }

    this.loading.show('Consultando datos académicos…');
    const aca = await this.academica.getDatosEstudiantePorCodigo(codigo).toPromise();
    this.loading.hide();

    if (!aca || !aca.Nombre || !aca.Carrera) {
      this.alert.error('Datos incompletos', 'No se pudieron obtener tus datos académicos. Contacta la coordinación.');
      this.router.navigateByUrl('/pages/home');
      sessionStorage.removeItem(runningKey);
      return;
    }

    // 3) Requisitos Pólux (PAS_PLX)
    this.loading.show('Verificando requisitos de pasantía…');
    const payloadReq = { ...aca, Modalidad: 'PAS_PLX', areas_elegidas: [], minimoCreditos: 0 };
    const cumple = await this.requisitos.verificarRequisitosRegistrar(payloadReq).toPromise();
    this.loading.hide();

    if (!cumple) {
      await this.alert.info(
        `Hola ${aca.Nombre}`,
        'No cumples con los requisitos para aplicar a pasantía. Si tienes dudas, comunícate con la coordinación de tu proyecto curricular.'
      );
      sessionStorage.removeItem(runningKey);
      return;
    }

    // 4) Contexto y Registro
    localStorage.setItem('castor_ultimo_check', JSON.stringify({ relacionado:false, tercero_id:terceroId || null }));
    localStorage.setItem('castor_estudiante_ctx', JSON.stringify({
      nombre: aca.Nombre, codigo, carrera: aca.Carrera, documento
    }));

    this.router.navigateByUrl('/pages/registro');
    sessionStorage.removeItem(runningKey);
  }
}
