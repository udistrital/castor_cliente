import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { TutorPostulacionesService } from 'src/app/@core/services/tutor/tutor-postulaciones.service';

type EstadoPostulacion =
  | 'PSPO_CTR'
  | 'PSRV_CTR'
  | 'PSPR_CTR'
  | 'PSSE_CTR'
  | 'PSAC_CTR'
  | 'PSRJ_CTR'
  | 'PSRT_CTR'
  | 'PSRE_CTR'
  | 'PSCD_CTR'
  | string;

interface DialogData {
  postulacionId: number;
  estadoActual: EstadoPostulacion;
  tutorId: number;
}

type AccionPayload = { accion: string; tutor_id?: number; comentario?: string | null };

@Component({
  selector: 'app-postulacion-accion-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Acción sobre postulación</h2>
    <mat-dialog-content class="dialog-content">
      <mat-form-field appearance="fill" class="w-full">
        <mat-label>Acción</mat-label>
        <mat-select
          [(value)]="accionSeleccionada"
          [disabled]="accionesDisponibles.length === 0 || loading"
        >
          <mat-option *ngFor="let accion of accionesDisponibles" [value]="accion">
            {{ accion }}
          </mat-option>
        </mat-select>
        <mat-hint *ngIf="accionesDisponibles.length === 0">No hay acciones disponibles</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="fill" class="w-full">
        <mat-label>Comentario</mat-label>
        <textarea
          matInput
          rows="3"
          [(ngModel)]="comentario"
          [disabled]="loading"
          placeholder="Opcional"
        ></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="loading">Cancelar</button>
      <button
        mat-flat-button
        color="primary"
        (click)="confirmar()"
        [disabled]="isConfirmDisabled"
      >
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 320px;
    }
    .w-full {
      width: 100%;
    }
  `],
})
export class PostulacionAccionDialogComponent {
  accionesDisponibles: Array<'VISTO' | 'PRESELECCIONAR' | 'SELECCIONAR' | 'DESCARTAR'> = [];
  accionSeleccionada?: string;
  comentario = '';
  loading = false;

  private readonly accionesPermitidas: Record<string, Array<'VISTO' | 'PRESELECCIONAR' | 'SELECCIONAR' | 'DESCARTAR'>> = {
    PSPO_CTR: ['VISTO', 'PRESELECCIONAR', 'SELECCIONAR', 'DESCARTAR'],
    PSRV_CTR: ['PRESELECCIONAR', 'SELECCIONAR', 'DESCARTAR'],
    PSPR_CTR: ['SELECCIONAR', 'DESCARTAR'],
  };

  constructor(
    private dialogRef: MatDialogRef<PostulacionAccionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private postulacionesService: TutorPostulacionesService
  ) {
    this.accionesDisponibles = this.accionesPermitidas[data.estadoActual] || [];
    this.accionSeleccionada = this.accionesDisponibles[0];
  }

  get isConfirmDisabled(): boolean {
    return this.loading || !this.accionSeleccionada || this.accionesDisponibles.length === 0;
  }

  confirmar(): void {
    if (this.isConfirmDisabled || this.data.postulacionId == null) {
      return;
    }
    this.loading = true;
    const payload: AccionPayload = {
      accion: this.accionSeleccionada,
      tutor_id: this.data.tutorId,
      comentario: this.comentario || null,
    };
    this.postulacionesService.accion(this.data.postulacionId, payload).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        // keep dialog open for retry
      }
    });
  }
}
