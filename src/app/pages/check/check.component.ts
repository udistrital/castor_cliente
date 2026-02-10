import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { EstudiantesService } from 'src/app/@core/services/estudiantes.service';
import { AcademicService } from 'src/app/@core/services/academica/academic.service';
import { RequirementsService } from 'src/app/@core/services/requirements/requirements.service';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { AppUser } from 'src/app/@core/models/auth.models';
import { TutorDashboardService } from 'src/app/@core/services/tutor/tutor-dashboard.service';

@Component({
  selector: 'app-check',
  standalone: true,
  template: `
    <div class="p-6 text-center text-sm opacity-80">
      Verificando información del usuario...
    </div>
  `,
})
export class CheckComponent implements OnInit {
  private started = false;
  private readonly runningKey = 'castor_check_running';

  constructor(
    private token: TokenService,
    private estudiantes: EstudiantesService,
    private academica: AcademicService,
    private requisitos: RequirementsService,
    private loading: LoadingService,
    private alert: AlertService,
    private tutorDashboard: TutorDashboardService,
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
        sessionStorage.removeItem(this.runningKey);
        this.alert.error('Error', 'No se pudo verificar tu información. Intenta más tarde.');
        this.router.navigateByUrl('/pages/home');
      });
    });
  }

  private async runCheckFlow(): Promise<void> {
    if (sessionStorage.getItem(this.runningKey) === '1') {
      return;
    }
    sessionStorage.setItem(this.runningKey, '1');

    const u = this.token.currentUser!;
    const documento = this.token.documento || '';
    const codigo = this.token.codigo || '';
    const roles = (u.roles || []).map(r => (r || '').toUpperCase());

    console.log('[CHECK] ids →', { documento, codigo, roles });

    // Contexto base (principalmente para estudiante)
    const baseCtx = { documento, codigo, nombre: '', carrera: '', tercero_id: null as number | null };
    localStorage.setItem('castor_estudiante_ctx', JSON.stringify(baseCtx));

    // Priorización de rol (evita edge-case donde un tutor también tenga ESTUDIANTE por algún motivo)
    const esTutorExterno =
      roles.includes('DIRECTOR_EXTERNO') ||
      roles.includes('TUTOR_EXTERNO') ||
      roles.includes('DOCENTE');
    const esEstudiante = roles.includes('ESTUDIANTE');

    // ====== FLUJO TUTOR EXTERNO ======
    if (esTutorExterno) {
      try {
        this.loading.show('Verificando estado de tutor…');
        const estado = await firstValueFrom(
          this.tutorDashboard.getEstado({ numero_documento: documento })
        );
        this.loading.hide();

        const needsEmpresa = Boolean((estado as any)?.Data?.needs_empresa);
        const route = needsEmpresa ? '/pages/tutor/registro' : '/pages/tutor/dashboard';
        console.log('[CHECK][TUTOR] estado=', (estado as any)?.Data, '-> route=', route);
        this.router.navigate([route]);
      } catch (err) {
        console.error('[CHECK] tutor estado error', err);
        this.loading.hide();
        this.alert.error('Error', 'No se pudo verificar tu estado como tutor. Intenta más tarde.');
        this.router.navigateByUrl('/pages/home');
      } finally {
        sessionStorage.removeItem(this.runningKey);
      }
      return;
    }

    // ====== FLUJO TUTOR (legacy) ======
    // Si en algún momento se usa un rol distinto, mantenemos compatibilidad.
    if (!esEstudiante && (roles.includes('TUTOR') || roles.includes('TUTOR_EXTERNO'))) {
      this.router.navigateByUrl('/pages/dashboard/tutor');
      sessionStorage.removeItem(this.runningKey);
      return;
    }

    // ====== FLUJO ESTUDIANTE ======
    // Si no es estudiante, por ahora lo mandamos al home (evita quedar colgado).
    if (!esEstudiante) {
      this.router.navigateByUrl('/pages/home');
      sessionStorage.removeItem(this.runningKey);
      return;
    }

    // 1) consulta_documento
    this.loading.show('Verificando registro en Castor…');
    const castor = await firstValueFrom(this.estudiantes.consultarPorDocumento(documento));
    this.loading.hide();

    const relacionado = !!(castor as any)?.relacionado;
    const terceroId = Number((castor as any)?.tercero_id || 0);
    console.log('[CHECK] consulta_documento →', { relacionado, terceroId });

    if (relacionado) {
      localStorage.setItem('castor_ultimo_check', JSON.stringify({ relacionado: true, tercero_id: terceroId }));

      if (codigo) {
        this.loading.show('Preparando tu panel…');
        try {
          const aca = await firstValueFrom(this.academica.getDatosEstudiantePorCodigo(codigo));
          const nombre = (aca as any)?.Nombre || '';
          const carrera = (aca as any)?.Carrera || '';
          localStorage.setItem(
            'castor_estudiante_ctx',
            JSON.stringify({ documento, codigo, nombre: nombre || '', carrera: carrera || '', tercero_id: terceroId || null })
          );
        } catch {
          localStorage.setItem('castor_estudiante_ctx', JSON.stringify({ documento, codigo, nombre: '', carrera: '', tercero_id: terceroId || null }));
        } finally {
          this.loading.hide();
          this.router.navigateByUrl('/pages/home');
          sessionStorage.removeItem(this.runningKey);
        }
      } else {
        localStorage.setItem('castor_estudiante_ctx', JSON.stringify({ documento, codigo, nombre: '', carrera: '', tercero_id: terceroId || null }));
        this.router.navigateByUrl('/pages/home');
        sessionStorage.removeItem(this.runningKey);
      }
      return;
    }

    // 2) Académica con Código
    if (!codigo) {
      this.alert.error('Validación incompleta', 'No recibimos tu código académico. Inicia sesión nuevamente.');
      this.router.navigateByUrl('/pages/home');
      sessionStorage.removeItem(this.runningKey);
      return;
    }

    this.loading.show('Consultando datos académicos…');
    const aca = await firstValueFrom(this.academica.getDatosEstudiantePorCodigo(codigo));
    this.loading.hide();

    if (!aca || !(aca as any).Nombre || !(aca as any).Carrera) {
      this.alert.error('Datos incompletos', 'No se pudieron obtener tus datos académicos. Contacta la coordinación.');
      this.router.navigateByUrl('/pages/home');
      sessionStorage.removeItem(this.runningKey);
      return;
    }

    // 3) Requisitos Pólux (PAS_PLX)
    this.loading.show('Verificando requisitos de pasantía…');
    const payloadReq = { ...(aca as any), Modalidad: 'PAS_PLX', areas_elegidas: [], minimoCreditos: 0 };
    const cumple = await firstValueFrom(this.requisitos.verificarRequisitosRegistrar(payloadReq));
    this.loading.hide();

    if (!cumple) {
      await this.alert.info(
        `Hola ${(aca as any).Nombre}`,
        'No cumples con los requisitos para aplicar a pasantía. Si tienes dudas, comunícate con la coordinación de tu proyecto curricular.'
      );
      sessionStorage.removeItem(this.runningKey);
      return;
    }

    // 4) Contexto y Registro
    localStorage.setItem('castor_ultimo_check', JSON.stringify({ relacionado: false, tercero_id: terceroId || null }));
    localStorage.setItem('castor_estudiante_ctx', JSON.stringify({
      nombre: (aca as any).Nombre,
      codigo,
      carrera: (aca as any).Carrera,
      documento,
      tercero_id: terceroId || null
    }));

    this.router.navigateByUrl('/pages/registro');
    sessionStorage.removeItem(this.runningKey);
  }
}
