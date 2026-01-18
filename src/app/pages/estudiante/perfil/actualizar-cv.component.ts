import { CommonModule, Location } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError, finalize, take } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';


import { DocumentosService } from 'src/app/@core/services/documentos.service';
import { EstudiantesService } from 'src/app/@core/services/estudiantes.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';

@Component({
  standalone: true,
  selector: 'app-actualizar-cv',
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './actualizar-cv.component.html',
  styleUrls: ['./actualizar-cv.component.scss'],
})
export class ActualizarCvComponent implements OnInit {
  terceroId: number | null = null;

  cvActualId: string | null = null;
  archivo: File | null = null;
  subiendo = false;

  // ✅ Ruta real que tú indicaste
  private readonly HOME_URL = '/pages/home';

  constructor(
    private router: Router,
    private location: Location,
    private zone: NgZone,
    private docs: DocumentosService,
    private estudiantes: EstudiantesService,
    private token: TokenService,
    private userContext: UserContextService,
    private loading: LoadingService,
    private snack: MatSnackBar,
  ) {}

  async ngOnInit(): Promise<void> {
    this.terceroId = this.resolveTerceroId();

    if (!this.terceroId) {
      await Swal.fire('Información incompleta', 'No pudimos identificar tu tercero_id.', 'warning');
      this.safeGoHome();
      return;
    }

    // traer cv_documento_id actual
    try {
      const perfil = await firstValueFrom(this.estudiantes.getMiPerfil(this.terceroId));
      const cv = (perfil as any)?.cv_documento_id;
      this.cvActualId = cv ? String(cv) : null;
    } catch {
      this.cvActualId = null;
    }
  }

  cancelar(): void {
  this.router.navigateByUrl('/pages/home');
}


  onFileSelected(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;

    if (!file) {
      this.archivo = null;
      return;
    }

    const isPdf =
      file.type === 'application/pdf' ||
      (file.name || '').toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      this.archivo = null;
      Swal.fire('Archivo inválido', 'Por favor selecciona un archivo PDF.', 'warning');
      return;
    }

    this.archivo = file;
  }

  // ✅ recuperamos la versión que funcionaba: base64->blob->open
  async verCvActual(): Promise<void> {
    try {
      if (!this.cvActualId) return;

      this.loading.show('Abriendo PDF…');

      await firstValueFrom(
        this.docs.openPdfByDocumentoId(this.cvActualId).pipe(
          catchError((e) => {
            console.error('[CV] Error abriendo CV actual', e);
            return of(void 0);
          }),
          finalize(() => this.loading.hide()),
        ),
      );
    } catch (e) {
      this.loading.hide();
      Swal.fire('Error', 'No fue posible abrir el PDF.', 'error');
    }
  }

//   async actualizar(): Promise<void> {
//   if (this.subiendo || !this.archivo) return;

//   this.subiendo = true;

//   try {
//     this.loading.show('Actualizando hoja de vida…');

//     // 1) Subir PDF al gestor documental => retorna docId
//     const docId = await firstValueFrom(
//       this.docs.uploadCvPdf(this.archivo, {
//         nombreArchivo: this.archivo.name || 'hoja_de_vida.pdf',
//         observaciones: 'Hoja de vida estudiante Castor',
//       }).pipe(take(1)),
//     );

//     // 2) Persistir docId en estudiante_perfil (vía tu endpoint actual)
//     await firstValueFrom(
//       this.estudiantes.updateCvDocumentoId(this.terceroId, String(docId)).pipe(take(1)),
//     );

//     this.loading.hide();
//     this.subiendo = false;

//     // 3) Confirmación + navegar (Swal no puede romper esto)
//     await this.safeSwal({
//       icon: 'success',
//       title: 'Hoja de vida actualizada',
//       text: 'Tu hoja de vida fue actualizada correctamente.',
//       confirmButtonText: 'Aceptar',
//     });

//     this.router.navigateByUrl('/pages/home');
//   } catch (err: any) {
//     console.error('[ACTUALIZAR CV] error', err);

//     this.loading.hide();
//     this.subiendo = false;

//     const msg =
//       err?.error?.Message ||
//       err?.error?.message ||
//       err?.message ||
//       'No fue posible actualizar la hoja de vida. Intenta más tarde.';

//     await this.safeSwal({
//       icon: 'error',
//       title: 'No se pudo actualizar',
//       text: msg,
//       confirmButtonText: 'Aceptar',
//     });

//     // ✅ pase lo que pase, volvemos al home
//     this.router.navigateByUrl('/pages/home');
//   }
// }
async actualizar(): Promise<void> {
  if (this.subiendo || !this.archivo) return;

  this.subiendo = true;

  try {
    this.loading.show('Actualizando hoja de vida…');

    // 1) Subir PDF al gestor documental => retorna docId
    const docId = await firstValueFrom(
      this.docs
        .uploadCvPdf(this.archivo, {
          nombreArchivo: this.archivo.name || 'hoja_de_vida.pdf',
          observaciones: 'Hoja de vida estudiante Castor',
        })
        .pipe(take(1)),
    );

    // 2) Persistir docId en estudiante_perfil
    await firstValueFrom(
      this.estudiantes
        .updateCvDocumentoId(this.terceroId, String(docId))
        .pipe(take(1)),
    );

    this.loading.hide();
    this.subiendo = false;

    // 3) Snack bonito + navegación a home
    const ref = this.snack.open(
      '✅ Hoja de vida actualizada correctamente',
      'Ir al inicio',
      {
        duration: 2200,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      },
    );

    // Si el usuario hace click, navega
    ref.onAction().pipe(take(1)).subscribe(() => {
      this.router.navigateByUrl('/pages/home');
    });

    // Si no hace click, al cerrarse igual navega
    ref.afterDismissed().pipe(take(1)).subscribe(() => {
      this.router.navigateByUrl('/pages/home');
    });

  } catch (err: any) {
    console.error('[ACTUALIZAR CV] error', err);

    this.loading.hide();
    this.subiendo = false;

    const msg =
      err?.error?.Message ||
      err?.error?.message ||
      err?.message ||
      'No fue posible actualizar la hoja de vida. Intenta más tarde.';

    const ref = this.snack.open(`❌ ${msg}`, 'Ir al inicio', {
      duration: 3500,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });

    ref.onAction().pipe(take(1)).subscribe(() => {
      this.router.navigateByUrl('/pages/home');
    });

    ref.afterDismissed().pipe(take(1)).subscribe(() => {
      this.router.navigateByUrl('/pages/home');
    });
  }
}


/**
 * Swal seguro: si sweetalert2 falla (ct is not a function),
 * hacemos fallback a alert() y NO rompemos el flujo.
 */
private async safeSwal(options: any): Promise<void> {
  try {
    await Swal.fire(options);
  } catch (e) {
    // fallback ultra seguro
    const title = options?.title ? String(options.title) : 'Mensaje';
    const text = options?.text ? String(options.text) : '';
    alert(text ? `${title}\n\n${text}` : title);
  }
}


  private safeGoHome(): void {
    this.zone.run(() => {
      this.router.navigateByUrl(this.HOME_URL, { replaceUrl: true });
    });
  }

  private resolveTerceroId(): number | null {
    const stored = this.safeJson('castor_estudiante_ctx');
    const ctx = this.userContext.getEstudianteContext();
    const currentUser = this.token.currentUser as any;

    const terceroId =
      ctx?.tercero_id ??
      stored?.tercero_id ??
      currentUser?.rawTokenPayload?.tercero_id ??
      currentUser?.tercero_id ??
      null;

    const n = Number(terceroId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private safeJson(key: string): any {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private notifySuccessAndGoHome(): void {
  const ref = this.snack.open('✅ Hoja de vida actualizada correctamente', 'Ir al inicio', {
    duration: 2500,
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
  });

  // Si el usuario hace click en el action
  ref.onAction().subscribe(() => {
    this.router.navigateByUrl('/pages/home');
  });

  // Si no hace click, al cerrar igual navega
  ref.afterDismissed().subscribe(() => {
    this.router.navigateByUrl('/pages/home');
  });
}

private notifyErrorAndStay(message?: string): void {
  this.snack.open(message || '❌ No fue posible actualizar la hoja de vida', 'Cerrar', {
    duration: 3500,
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
  });
}

}
