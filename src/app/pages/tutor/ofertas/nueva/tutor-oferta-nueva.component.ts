import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { TutorDashboardService } from 'src/app/@core/services/tutor/tutor-dashboard.service';
import { RequestManager } from 'src/app/pages/services/requestManager';

@Component({
  selector: 'app-tutor-oferta-nueva',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './tutor-oferta-nueva.component.html',
  styleUrls: ['./tutor-oferta-nueva.component.scss'],
})
export class TutorOfertaNuevaComponent implements OnInit {
  tutorId: number | null = null;
  empresaId: number | null = null;
  needsEmpresa = false;

  form = this.fb.group({
    titulo: ['', [Validators.required]],
    descripcion: [''],
    empresa_tercero_id: [{ value: null, disabled: true }, [Validators.required]],
    modalidad: [''],
    estado: [''],
    tutor_externo_id: [{ value: null, disabled: true }, [Validators.required]],
    proyectos_curriculares: [''],
  });

  constructor(
    private fb: FormBuilder,
    private token: TokenService,
    private tutorDashboard: TutorDashboardService,
    private rm: RequestManager,
    private loading: LoadingService,
    private alert: AlertService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const documento = this.token.documento || this.token.currentUser?.document || '';
    if (!documento) {
      this.alert.error('Error', 'No fue posible identificar tu documento.');
      this.router.navigateByUrl('/pages/home');
      return;
    }

    try {
      this.loading.show('Cargando…');
      const estado = await firstValueFrom(
        this.tutorDashboard.getEstado({ numero_documento: documento })
      );
      this.loading.hide();

      const data = (estado as any)?.Data ?? {};
      this.tutorId = Number(data.tutor_id || 0) || null;
      this.empresaId = data.empresa_id ?? null;
      this.needsEmpresa = Boolean(data.needs_empresa);

      if (this.needsEmpresa) {
        await this.alert.info('Registro requerido', 'Debes asociar una empresa antes de crear ofertas.');
        this.router.navigateByUrl('/pages/tutor/registro');
        return;
      }

      if (!this.tutorId || !this.empresaId) {
        this.alert.error('Error', 'No se pudo identificar tutor o empresa.');
        this.router.navigateByUrl('/pages/tutor/dashboard');
        return;
      }

      this.form.patchValue({
        tutor_externo_id: this.tutorId,
        empresa_tercero_id: this.empresaId,
      });
    } catch (error) {
      this.loading.hide();
      console.error('[TutorOfertaNueva] init error', error);
      this.alert.error('Error', 'No se pudo cargar tu estado como tutor.');
      this.router.navigateByUrl('/pages/home');
    }
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.alert.info('Formulario incompleto', 'Completa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();
    const proyectos = this.parseProyectos(raw.proyectos_curriculares || '');
    if (proyectos === null) {
      this.alert.error('Error', 'Proyectos curriculares inválidos.');
      return;
    }

    const payload = {
      oferta: {
        titulo: (raw.titulo || '').trim(),
        descripcion: (raw.descripcion || '').trim(),
        empresa_tercero_id: Number(raw.empresa_tercero_id),
        modalidad: (raw.modalidad || '').trim(),
        estado: (raw.estado || '').trim(),
        tutor_externo_id: Number(raw.tutor_externo_id),
      },
      proyectos_curriculares: proyectos,
    };
    console.log('[TutorOfertaNueva] submit payload=', payload);

    try {
      this.loading.show('Creando oferta…');
      await firstValueFrom(this.rm.post('castor_mid', 'ofertas', payload));
      this.loading.hide();
      await this.alert.success('Listo', 'Oferta creada correctamente.');
      this.router.navigateByUrl('/pages/tutor/dashboard');
    } catch (error) {
      this.loading.hide();
      console.error('[TutorOfertaNueva] submit error', error);
      this.alert.error('Error', 'No fue posible crear la oferta.');
    }
  }

  onCancel(): void {
    this.router.navigateByUrl('/pages/tutor/dashboard');
  }

  private parseProyectos(value: string): number[] | null {
    const raw = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (raw.length === 0) {
      return [];
    }
    const ids: number[] = [];
    for (const item of raw) {
      const parsed = Number(item);
      if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
        return null;
      }
      ids.push(parsed);
    }
    return ids;
  }
}
