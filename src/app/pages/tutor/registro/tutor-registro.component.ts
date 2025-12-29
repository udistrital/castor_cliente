import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { TutorDashboardService } from 'src/app/@core/services/tutor/tutor-dashboard.service';

@Component({
  selector: 'app-tutor-registro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './tutor-registro.component.html',
  styleUrls: ['./tutor-registro.component.scss'],
})
export class TutorRegistroComponent implements OnInit {
  tutorNombre = '';
  tutorId: number | null = null;

  form = this.fb.group({
    nit_sin_dv: ['', [Validators.required]],
    razon_social: ['', [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private token: TokenService,
    private tutorDashboard: TutorDashboardService,
    private loading: LoadingService,
    private alert: AlertService,
    private router: Router,
  ) {
    console.log('[TutorRegistroComponent] constructor');
  }

  async ngOnInit(): Promise<void> {
    console.log('[TutorRegistroComponent] LOADED');

    const documento = this.token.documento || this.token.currentUser?.document || '';
    if (!documento) {
      this.alert.error('Error', 'No fue posible identificar tu documento.');
      this.router.navigateByUrl('/pages/home');
      return;
    }

    // Traer estado (también nos da tutor_id)
    try {
      this.loading.show('Cargando…');
      const estado = await firstValueFrom(this.tutorDashboard.getEstado({ numero_documento: documento }));
      this.loading.hide();

      this.tutorId = Number(estado?.Data?.tutor_id || 0) || null;

      // Si ya NO necesita empresa, lo mandamos al dashboard
      if (estado?.Data && estado.Data.needs_empresa === false) {
        this.router.navigateByUrl('/pages/tutor/dashboard');
        return;
      }

      // Traer nombre del tutor desde terceros (opcional)
      if (this.tutorId) {
        try {
          const tercero = await firstValueFrom(this.tutorDashboard.getTutorById(this.tutorId));
          const t = (tercero as any)?.Body ?? (tercero as any)?.Data ?? tercero;
          this.tutorNombre = (t?.NombreCompleto || '').trim();
        } catch {
          this.tutorNombre = '';
        }
      }
    } catch (err) {
      this.loading.hide();
      console.error('[TutorRegistroComponent] init error', err);
      this.alert.error('Error', 'No se pudo cargar tu estado como tutor.');
      this.router.navigateByUrl('/pages/home');
    }
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.alert.info('Formulario incompleto', 'Completa NIT y razón social.');
      return;
    }

    const documento = this.token.documento || this.token.currentUser?.document || '';
    if (!documento) {
      this.alert.error('Error', 'No fue posible identificar tu documento.');
      return;
    }

    const raw = this.form.getRawValue();
    const nit = (raw.nit_sin_dv || '').trim();
    const razon = (raw.razon_social || '').trim();

    try {
      this.loading.show('Guardando empresa…');

      await firstValueFrom(
        this.tutorDashboard.upsertEmpresa({
          numero_documento: documento,
          empresa: {
            nit_sin_dv: nit,
            razon_social: razon,
            // opcional: si quieres forzarlos, pero tu MID ya intenta resolverlos si llegan en 0
            // tipo_contribuyente_id: 0,
            // tipo_documento_id: 0,
          },
        })
      );

      const estado = await firstValueFrom(this.tutorDashboard.getEstado({ numero_documento: documento }));
      this.loading.hide();
      if (estado?.Data && estado.Data.needs_empresa === false) {
        await this.alert.success('Listo', 'Empresa registrada y vinculada.');
        this.router.navigateByUrl('/pages/tutor/dashboard', { replaceUrl: true });
        return;
      }
      this.alert.error('Error', 'No fue posible confirmar el estado del tutor.');
    } catch (err) {
      this.loading.hide();
      console.error('[TutorRegistroComponent] submit error', err);
      this.alert.error('Error', 'No fue posible registrar la empresa.');
    }
  }

  onCancel(): void {
    this.router.navigateByUrl('/pages/tutor/dashboard');
  }
}
