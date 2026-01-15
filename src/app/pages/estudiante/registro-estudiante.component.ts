import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core'; // 👈 quitamos "signal"
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
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
import { UserContextService } from 'src/app/@core/services/user-context.service';

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
    private userContext: UserContextService,
    private estudiantes: EstudiantesService,
    private documentos: DocumentosService,
    private router: Router,
  ) {}

  async ngOnInit() {
    this.loading.hide();
    const ctx = this.readJson('castor_estudiante_ctx');

    this.nombre = ctx?.nombre || this.token.currentUser?.email || '';
    this.codigo = ctx?.codigo || this.token.codigo || '';
    this.documento = ctx?.documento || this.token.documento || '';
    this.pcId = String(ctx?.carrera || '');
    this.userContext.setEstudianteContext({
      nombre: this.nombre,
      codigo: this.codigo,
      documento: this.documento || undefined,
      carrera: ctx?.carrera,
      tercero_id: ctx?.tercero_id,
    });

    if (this.pcId) {
      this.loading.show('Resolviendo proyecto curricular…');
      this.catalogos
        .getNombreProyectoCurricular(this.pcId)
        .pipe(finalize(() => this.loading.hide()))
        .subscribe({
          next: (nombre) => {
            this.pcNombre = nombre;
          },
          error: () => {
            this.pcNombre = null;
          },
        });
    }

    if (!this.getTerceroIdFromContext()) {
      await this.resolveTerceroIdFromDocumento(false);
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

    try {
      let terceroId = this.getTerceroIdFromContext();
      if (!terceroId) {
        terceroId = await this.resolveTerceroIdFromDocumento(false);
      }
      if (!terceroId) {
        this.alert.info(
          'Información incompleta',
          'No pudimos identificar tu tercero_id. Actualiza la página e intenta nuevamente.',
        );
        return;
      }
      const payload: {
        tercero_id: number;
        proyecto_curricular_id: number;
        resumen: string | undefined;
        habilidades: string | undefined;
        cv_documento_id: string;
        visible: boolean;
        tratamiento_datos_aceptado: boolean;
      } = {
        tercero_id: terceroId,
        proyecto_curricular_id: Number(this.pcId || 0),
        resumen: this.form.value.resumen?.trim(),
        habilidades: this.form.value.habilidades?.trim(),
        cv_documento_id: '',
        visible: true,
        tratamiento_datos_aceptado: this.form.value.tratamientoDatosAceptado === true,
      };

      this.loading.show('Subiendo hoja de vida…');
      const nombreArchivo = `CV_${this.codigo || this.documento || 'estudiante'}.pdf`;
      const enlace = await firstValueFrom(
        this.documentos.uploadCvPdf(this.cvFile!, { nombreArchivo }),
      );
      payload.cv_documento_id = enlace;

      this.loading.show('Registrando perfil…');
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

  private getTerceroIdFromContext(): number | null {
    const storedCtx = this.readJson('castor_estudiante_ctx');
    const serviceCtx = this.userContext.getEstudianteContext();
    const terceroId = serviceCtx?.tercero_id ?? storedCtx?.tercero_id ?? null;
    if (typeof terceroId !== 'number' || !Number.isFinite(terceroId) || terceroId <= 0) {
      return null;
    }
    return terceroId;
  }

  private persistTerceroId(terceroId: number): void {
    const currentCtx = this.readJson('castor_estudiante_ctx') || {};
    localStorage.setItem(
      'castor_estudiante_ctx',
      JSON.stringify({ ...currentCtx, tercero_id: terceroId }),
    );
    this.userContext.setEstudianteContext({ tercero_id: terceroId, nombre: this.nombre, codigo: this.codigo });
  }

  private async resolveTerceroIdFromDocumento(showErrors: boolean): Promise<number | null> {
    const documento = this.documento || this.token.documento || '';
    if (!documento) {
      if (showErrors) {
        this.alert.error(
          'Validación incompleta',
          'No pudimos identificar tu número de documento. Inicia sesión nuevamente.',
        );
      }
      return null;
    }

    try {
      const resp = await firstValueFrom(this.estudiantes.consultarPorDocumento(String(documento)));
      const terceroId = typeof resp?.tercero_id === 'number' ? resp.tercero_id : null;
      if (terceroId && terceroId > 0) {
        this.persistTerceroId(terceroId);
        return terceroId;
      }
      if (showErrors) {
        const mensajeRaw =
          resp?.relacionado === false
            ? resp?.mensaje || ''
            : '';
        const mensajeLower = mensajeRaw.toLowerCase();
        const esErrorTerceros =
          mensajeLower.includes('terceros') ||
          mensajeLower.includes('no se encuentra registrado en terceros');
        const mensaje = esErrorTerceros
          ? (mensajeRaw || 'No se pudo identificar el tercero asociado a tu documento.')
          : 'No se pudo identificar el tercero asociado a tu documento.';
        this.alert.error('Validación de tercero', mensaje);
      }
      return null;
    } catch (error) {
      if (showErrors) {
        this.alert.error('Error', 'No fue posible validar tu información en terceros.');
      }
      return null;
    }
  }
}
