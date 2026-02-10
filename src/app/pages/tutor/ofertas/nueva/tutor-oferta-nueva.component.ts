import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { TutorDashboardService } from 'src/app/@core/services/tutor/tutor-dashboard.service';
import { TutorExplorarService } from 'src/app/@core/services/tutor/tutor-explorar.service';
import { RequestManager } from 'src/app/pages/services/requestManager';

@Component({
  selector: 'app-tutor-oferta-nueva',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './tutor-oferta-nueva.component.html',
  styleUrls: ['./tutor-oferta-nueva.component.scss'],
})
export class TutorOfertaNuevaComponent implements OnInit {
  tutorId: number | null = null;
  needsEmpresa = false;

  form = this.fb.group({
    titulo: ['', [Validators.required]],
    descripcion: ['', [Validators.maxLength(1200)]],
    proyectos_curriculares_ids: this.fb.nonNullable.control<number[]>([]),
  });

  proyectosCurriculares: Array<{ id: number; nombre: string }> = [];
  pcSearch = '';
  loadingPC = false;

  constructor(
    private fb: FormBuilder,
    private token: TokenService,
    private tutorDashboard: TutorDashboardService,
    private explorarService: TutorExplorarService,
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
      this.needsEmpresa = Boolean(data.needs_empresa);
      this.tutorId = Number(data.tutor_id || 0) || null;

      if (this.needsEmpresa) {
        await this.alert.info('Registro requerido', 'Debes asociar una empresa antes de crear ofertas.');
        this.router.navigateByUrl('/pages/tutor/registro');
        return;
      }

      if (!this.tutorId) {
        this.alert.error('Error', 'No se pudo identificar tu tutor.');
        this.router.navigateByUrl('/pages/tutor/dashboard');
        return;
      }
    } catch (error) {
      this.loading.hide();
      console.error('[TutorOfertaNueva] init error', error);
      this.alert.error('Error', 'No se pudo cargar tu estado como tutor.');
      this.router.navigateByUrl('/pages/home');
      return;
    }

    this.loadingPC = true;
    try {
      this.proyectosCurriculares = await firstValueFrom(
        this.explorarService.listarProyectosCurriculares()
      );
    } catch (error) {
      console.error('[TutorOfertaNueva] proyectos curriculares error', error);
      this.alert.error('Error', 'No fue posible cargar los proyectos curriculares.');
      this.proyectosCurriculares = [];
    } finally {
      this.loadingPC = false;
    }
  }

  get pcsSeleccionados(): number[] {
    return (this.form.value.proyectos_curriculares_ids ?? []) as number[];
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.alert.info('Formulario incompleto', 'Completa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      oferta: {
        titulo: (raw.titulo || '').trim(),
        descripcion: (raw.descripcion || '').trim(),
      },
      proyectos_curriculares: this.form.value.proyectos_curriculares_ids ?? [],
    };
    console.log('[TutorOfertaNueva] submit payload=', payload);

    try {
      this.loading.show('Creando oferta…');
      await firstValueFrom(this.rm.post('castor_mid', `ofertas?tutor_id=${this.tutorId}`, payload));
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

  filteredPCs(): Array<{ id: number; nombre: string }> {
    const term = this.pcSearch.trim().toLowerCase();
    if (!term) {
      return this.proyectosCurriculares;
    }
    return this.proyectosCurriculares.filter((pc) => pc.nombre.toLowerCase().includes(term));
  }

  removePc(id: number): void {
    const updated = this.pcsSeleccionados.filter((item) => item !== id);
    this.form.patchValue({ proyectos_curriculares_ids: updated });
  }

  displayPcName(id: number): string {
    return this.proyectosCurriculares.find((pc) => pc.id === id)?.nombre || `ID ${id}`;
  }
}
