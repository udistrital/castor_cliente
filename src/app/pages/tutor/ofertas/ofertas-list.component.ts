import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { TutorContextService } from 'src/app/@core/services/tutor/tutor-context.service';
import { TutorOfertasService } from 'src/app/@core/services/tutor/tutor-ofertas.service';

@Component({
  selector: 'app-ofertas-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatChipsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './ofertas-list.component.html',
  styleUrls: ['./ofertas-list.component.scss'],
})
export class OfertasListComponent implements OnInit {
  readonly dataSource = new MatTableDataSource<any>([]);
  readonly displayedColumns = ['titulo', 'estado', 'fecha', 'acciones'];

  loading = false;
  total = 0;
  pageIndex = 0;
  pageSize = 10;

  ofertasAbiertas: any[] = [];
  ofertasEnCurso: any[] = [];
  ofertasPausadas: any[] = [];
  ofertasFinalizadas: any[] = [];
  ofertasCanceladas: any[] = [];

  private tutorId: number | null = null;
  actionLoadingId: number | null = null;

  constructor(
    private tutorContext: TutorContextService,
    private tutorOfertas: TutorOfertasService,
    private router: Router,
    private route: ActivatedRoute,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.tutorContext.ensureLoaded().subscribe((ctx) => {
      this.tutorId = ctx?.tutor_id ?? null;
      if (!this.tutorId) {
        this.alert.error('Error', 'No pudimos identificar tu perfil de tutor.');
        return;
      }
      this.loadOfertas();
    });
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadOfertas();
  }

  nuevaOferta(): void {
    this.router.navigate(['/pages/tutor/ofertas/nueva']);
  }

  volver(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('from');
    const fromState = (history.state as any)?.from;
    if (fromQuery === 'dashboard' || fromState === 'dashboard') {
      this.router.navigateByUrl('/pages/tutor/home');
      return;
    }
    this.router.navigateByUrl('/pages/tutor/home');
  }

  verDetalle(row: any): void {
    const id = row?.id ?? row?.oferta_id ?? row?.ofertaId;
    if (!id) {
      return;
    }
    this.router.navigate(['/pages/tutor/ofertas', id]);
  }

  getTitulo(row: any): string {
    return row?.titulo ?? row?.Titulo ?? `Oferta #${row?.id ?? ''}`;
  }

  getEstadoNombre(row: any): string {
    return row?.estado_det?.nombre ?? row?.Estado?.nombre ?? row?.estado ?? '-';
  }

  getEstadoCodigo(row: any): string {
    return String(
      row?.estado_det?.code ||
      row?.estado_det?.Codigo ||
      row?.Estado?.code ||
      row?.Estado?.Codigo ||
      row?.estado ||
      row?.Estado ||
      ''
    );
  }

  getFecha(row: any): string {
    return row?.fecha_publicacion ?? row?.created_at ?? row?.fecha ?? '';
  }

  displayFecha(raw: any): string {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return String(raw);
      return d.toLocaleString();
    } catch {
      return String(raw);
    }
  }

  isAbierta(row: any): boolean {
    return this.getEstadoCodigo(row).toUpperCase() === 'OPC_CTR';
  }

  isPausada(row: any): boolean {
    return this.getEstadoCodigo(row).toUpperCase() === 'OPPAU_CTR';
  }

  isFinalizada(row: any): boolean {
    return this.getEstadoCodigo(row).toUpperCase() === 'OPFIN_CTR';
  }

  isCancelada(row: any): boolean {
    return this.getEstadoCodigo(row).toUpperCase() === 'OPCAN_CTR';
  }

  canFinalizar(row: any): boolean {
    const code = this.getEstadoCodigo(row).toUpperCase();
    return code === 'OPC_CTR' || code === 'OPPAU_CTR' || code === 'OPCUR_CTR';
  }

  canMostrarAcciones(row: any): boolean {
    return !(this.isFinalizada(row) || this.isCancelada(row));
  }

  async pausar(row: any): Promise<void> {
    if (!this.tutorId) {
      return;
    }
    const ok = await this.alert.confirm('¿Pausar la oferta?');
    if (!ok) {
      return;
    }
    const ofertaId = row?.id ?? row?.oferta_id ?? row?.ofertaId;
    if (!ofertaId) {
      return;
    }
    this.actionLoadingId = Number(ofertaId);
    this.tutorOfertas.pausarOferta(this.tutorId, Number(ofertaId)).subscribe({
      next: () => {
        this.alert.success('Listo', 'Oferta pausada.');
        this.loadOfertas();
      },
      error: (err) => {
        console.warn('[TUTOR] Error pausando oferta', err);
        this.alert.error('Error', 'No pudimos pausar la oferta.');
      },
      complete: () => {
        this.actionLoadingId = null;
      },
    });
  }

  async reactivar(row: any): Promise<void> {
    if (!this.tutorId) {
      return;
    }
    const ok = await this.alert.confirm('¿Reactivar la oferta?');
    if (!ok) {
      return;
    }
    const ofertaId = row?.id ?? row?.oferta_id ?? row?.ofertaId;
    if (!ofertaId) {
      return;
    }
    this.actionLoadingId = Number(ofertaId);
    this.tutorOfertas.reactivarOferta(this.tutorId, Number(ofertaId)).subscribe({
      next: () => {
        this.alert.success('Listo', 'Oferta reactivada.');
        this.loadOfertas();
      },
      error: (err) => {
        console.warn('[TUTOR] Error reactivando oferta', err);
        this.alert.error('Error', 'No pudimos reactivar la oferta.');
      },
      complete: () => {
        this.actionLoadingId = null;
      },
    });
  }

  async finalizar(row: any): Promise<void> {
    if (!this.tutorId) {
      return;
    }
    const ok = await this.alert.confirm('¿Finalizar la oferta?');
    if (!ok) {
      return;
    }
    const ofertaId = row?.id ?? row?.oferta_id ?? row?.ofertaId;
    if (!ofertaId) {
      return;
    }
    this.actionLoadingId = Number(ofertaId);
    this.tutorOfertas.finalizarOferta(this.tutorId, Number(ofertaId)).subscribe({
      next: () => {
        this.alert.success('Listo', 'Oferta finalizada.');
        this.loadOfertas();
      },
      error: (err) => {
        console.warn('[TUTOR] Error finalizando oferta', err);
        this.alert.error('Error', 'No pudimos finalizar la oferta.');
      },
      complete: () => {
        this.actionLoadingId = null;
      },
    });
  }

  async cancelar(row: any): Promise<void> {
    if (!this.tutorId) {
      return;
    }
    const ok = await this.alert.confirm('¿Cancelar la oferta?');
    if (!ok) {
      return;
    }
    const ofertaId = row?.id ?? row?.oferta_id ?? row?.ofertaId;
    if (!ofertaId) {
      return;
    }
    this.actionLoadingId = Number(ofertaId);
    this.tutorOfertas.cancelarOferta(this.tutorId, Number(ofertaId)).subscribe({
      next: () => {
        this.alert.success('Listo', 'Oferta cancelada.');
        this.loadOfertas();
      },
      error: (err) => {
        console.warn('[TUTOR] Error cancelando oferta', err);
        this.alert.error('Error', 'No pudimos cancelar la oferta.');
      },
      complete: () => {
        this.actionLoadingId = null;
      },
    });
  }

  private loadOfertas(): void {
    if (!this.tutorId) {
      return;
    }
    this.loading = true;
    const page = this.pageIndex + 1;
    const size = this.pageSize;
    this.tutorOfertas.listarMisOfertas(this.tutorId, null, page, size)
      .subscribe({
        next: (resp) => {
          this.total = resp.total ?? 0;
          const items = Array.isArray(resp.items) ? resp.items : [];
          this.dataSource.data = items;
          this.segmentarOfertas(items);
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          console.warn('[TUTOR] Error cargando ofertas', err);
          this.alert.error('Error', 'No pudimos cargar tus ofertas.');
        },
      });
  }

  private segmentarOfertas(items: any[]): void {
    this.ofertasAbiertas = items.filter((it) => this.getEstadoCodigo(it).toUpperCase() === 'OPC_CTR');
    this.ofertasEnCurso = items.filter((it) => this.getEstadoCodigo(it).toUpperCase() === 'OPCUR_CTR');
    this.ofertasPausadas = items.filter((it) => this.getEstadoCodigo(it).toUpperCase() === 'OPPAU_CTR');
    this.ofertasFinalizadas = items.filter((it) => this.getEstadoCodigo(it).toUpperCase() === 'OPFIN_CTR');
    this.ofertasCanceladas = items.filter((it) => this.getEstadoCodigo(it).toUpperCase() === 'OPCAN_CTR');
  }
}
