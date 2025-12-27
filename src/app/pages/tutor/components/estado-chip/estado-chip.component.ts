import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type ChipTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-estado-chip',
  standalone: true,
  imports: [CommonModule], // ✅ habilita ngClass
  templateUrl: './estado-chip.component.html',
  styleUrls: ['./estado-chip.component.scss'],
})
export class EstadoChipComponent {
  @Input() codigo?: string;
  @Input() nombre?: string;

  private readonly codeToneMap: Record<string, ChipTone> = {
    // Oferta
    OPC_CTR: 'info',
    OPCUR_CTR: 'info',
    OPFIN_CTR: 'success',
    OPCAN_CTR: 'danger',
    OPPAU_CTR: 'warning',
    OPVEN_CTR: 'warning',
    // Postulación
    PSPO_CTR: 'info',
    PSRV_CTR: 'info',
    PSPR_CTR: 'info',
    PSSE_CTR: 'success',
    PSAC_CTR: 'success',
    PSRJ_CTR: 'danger',
    PSRT_CTR: 'danger',
    PSRE_CTR: 'danger',
    PSCD_CTR: 'warning',
    // Invitación
    INV_ENV_CTR: 'info',
    INV_ACE_CTR: 'success',
    INV_REC_CTR: 'danger',
    INV_CAN_CTR: 'danger',
    INV_EXP_CTR: 'warning',
  };

  private readonly toneClassMap: Record<ChipTone, string> = {
    success: 'bg-green-100 text-green-800',
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    neutral: 'bg-slate-100 text-slate-800',
  };

  get displayText(): string {
    return this.nombre || this.codigo || '';
  }

  get chipClass(): string {
    const tone = this.codigo ? (this.codeToneMap[this.codigo] || 'neutral') : 'neutral';
    return `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${this.toneClassMap[tone]}`;
  }
}
