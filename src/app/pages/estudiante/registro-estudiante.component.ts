import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core'; // 👈 quitamos "signal"
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CatalogosService } from 'src/app/@core/services/catalogos/catalogos.service';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { EstudiantesService } from 'src/app/@core/services/estudiantes.service';
import { GlobalLoadingOverlayComponent } from 'src/app/@shared/components/global-loading-overlay.component';
import { DocumentosService } from 'src/app/@core/services/documentos.service';

@Component({
  selector: 'app-registro-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    GlobalLoadingOverlayComponent,
  ],
  templateUrl: './registro-estudiante.component.html',
  styleUrls: ['./registro-estudiante.component.scss'],
})
export class RegistroEstudianteComponent implements OnInit {
  nombre = '';
  codigo = '';
  documento = '';
  pcId = '';
  pcNombre: string | null = null;

  // 👇 ahora son propiedades normales, nada de signals
  cvFile: File | null = null;
  cvNombre = '';
  cvError = '';

  form = this.fb.group({
    resumen: ['', [Validators.required, Validators.minLength(20)]],
    habilidades: ['', [Validators.required]],
    tratamientoDatosAceptado: [false, [Validators.requiredTrue]],
  });

  get valid(): boolean {
    return this.form.valid && !!this.cvFile && this.form.value.tratamientoDatosAceptado === true;
  }

  constructor(
    private fb: FormBuilder,
    private catalogos: CatalogosService,
    private alert: AlertService,
    private loading: LoadingService,
    private token: TokenService,
    private estudiantes: EstudiantesService,
    private documentos: DocumentosService,
    private router: Router,
  ) {}

  async ngOnInit() {
    const ctx = this.readJson('castor_estudiante_ctx');

    this.nombre = ctx?.nombre || this.token.currentUser?.email || '';
    this.codigo = ctx?.codigo || this.token.codigo || '';
    this.documento = ctx?.documento || this.token.documento || '';
    this.pcId = String(ctx?.carrera || '');

    if (this.pcId) {
      this.loading.show('Resolviendo proyecto curricular…');
      this.catalogos.getNombreProyectoCurricular(this.pcId).subscribe({
        next: (nombre) => {
          this.pcNombre = nombre;
          this.loading.hide();
        },
        error: () => {
          this.pcNombre = null;
          this.loading.hide();
        },
      });
    }
  }

  onPickCv(ev: Event): void {
    this.cvError = '';
    const input = ev.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      this.cvError = 'El archivo debe ser PDF.';
      this.cvFile = null;
      this.cvNombre = '';
      input.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      this.cvError = 'El PDF supera 8 MB.';
      this.cvFile = null;
      this.cvNombre = '';
      input.value = '';
      return;
    }

    this.cvFile = file;
    this.cvNombre = file.name;
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (!this.valid || !this.cvFile) {
      this.alert.info(
        'Formulario incompleto',
        'Completa los campos y adjunta tu PDF.',
      );
      return;
    }

    const payload: {
      tercero_id?: number;
      proyecto_curricular_id: number;
      resumen: string | undefined;
      habilidades: string | undefined;
      cv_documento_id: string;
      visible: boolean;
      tratamiento_datos_aceptado?: boolean;
    } = {
      proyecto_curricular_id: Number(this.pcId || 0),
      resumen: this.form.value.resumen?.trim(),
      habilidades: this.form.value.habilidades?.trim(),
      cv_documento_id: '',
      visible: true,
    };

    try {
      this.loading.show('Subiendo hoja de vida…');
      const nombreArchivo = `CV_${this.codigo || this.documento || 'estudiante'}.pdf`;
      const enlace = await firstValueFrom(
        this.documentos.uploadCvPdf(this.cvFile!, { nombreArchivo }),
      );
      payload.cv_documento_id = enlace;

      const ultimoRaw = localStorage.getItem('castor_ultimo_check');
      const ultimo = ultimoRaw ? JSON.parse(ultimoRaw) : null;
      const terceroId =
        typeof ultimo?.tercero_id === 'number' ? ultimo.tercero_id : null;

      if (terceroId !== null) {
        payload.tercero_id = terceroId;
      }

      this.loading.show('Registrando perfil…');
      if (this.form.value.tratamientoDatosAceptado === true) {
        payload.tratamiento_datos_aceptado = true;
      }
      await firstValueFrom(this.estudiantes.crearPerfil(payload));
      this.loading.hide();

      await this.alert.success(
        '¡Listo!',
        'Tu perfil y hoja de vida se registraron correctamente.',
      );
      this.router.navigateByUrl('/pages/home');
    } catch (e) {
      this.loading.hide();
      console.error('[REGISTRO] error', e);
      this.alert.error(
        'Error',
        'No fue posible subir tu hoja de vida o registrar el perfil. Intenta nuevamente más tarde.',
      );
    }
  }

  onCancel(): void {
    this.router.navigateByUrl('/pages/home');
  }

  private readJson(key: string): any {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
