import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';
import {
  PostulacionesEstudianteService,
  PostulacionListItem,
} from 'src/app/@core/services/postulaciones-estudiante.service';
import { OfertasEstudianteService } from 'src/app/@core/services/ofertas-estudiante.service';
import { TercerosService } from 'src/app/@core/services/terceros.service';

@Component({
  selector: 'app-mis-postulaciones',
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
  ],
  templateUrl: './mis-postulaciones.component.html',
  styleUrls: ['./mis-postulaciones.component.scss'],
})
export class MisPostulacionesComponent implements OnInit {
  readonly dataSource = new MatTableDataSource<PostulacionListItem>([]);
  readonly displayedColumns = ['oferta', 'empresa', 'estado', 'fecha', 'acciones'];

  loading = false;
  total = 0;
  pageIndex = 0;
  pageSize = 10;

  estados: Array<{ label: string; value: string | null }> = [{ label: 'Todas', value: null }];
  estadoSeleccionado: string | null = null;

  private estudianteId: number | null = null;
  private ofertaMap = new Map<number, any>();
  private empresaMap = new Map<number, any>();

  @ViewChild(MatPaginator) paginator?: MatPaginator;

  constructor(
    private postulacionesService: PostulacionesEstudianteService,
    private ofertasService: OfertasEstudianteService,
    private tercerosService: TercerosService,
    private token: TokenService,
    private userContext: UserContextService,
    private router: Router,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.estudianteId = this.resolveEstudianteId();
    if (!this.estudianteId) {
      this.alert.error('Error', 'No pudimos identificar tu usuario.');
      this.router.navigate(['/pages/check']);
      return;
    }
    this.loadPostulaciones();
  }

  volver(): void {
    this.router.navigateByUrl('/pages/estudiante/home');
  }

  onEstadoChange(value: string | null): void {
    this.estadoSeleccionado = value;
    this.pageIndex = 0;
    this.loadPostulaciones();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPostulaciones();
  }

  verDetalle(row: PostulacionListItem): void {
    if (!row?.id) {
      return;
    }
    this.router.navigate(['/pages/estudiante/postulaciones', row.id]);
  }

  formatFecha(value?: string): string {
    if (!value) {
      return '';
    }
    return value;
  }

  formatDateHuman(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) {
        return String(value);
      }
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(value);
    }
  }

  private loadPostulaciones(): void {
    if (!this.estudianteId) {
      return;
    }
    this.loading = true;

    const page = this.pageIndex + 1;
    const size = this.pageSize;

    this.postulacionesService.getMisPostulaciones(this.estudianteId, page, size, this.estadoSeleccionado)
      .subscribe({
        next: (resp) => {
          this.total = resp.total ?? 0;
          const items: PostulacionListItem[] = (resp?.items ?? []) as PostulacionListItem[];
          this.dataSource.data = Array.isArray(items) ? items : [];
          this.loading = false;
          this.syncEstados(items);
          this.enrichOfertas(items);
        },
        error: (err) => {
          this.loading = false;
          console.warn('[POSTULACIONES] Error cargando lista', err);
          this.alert.error('Error', 'No pudimos cargar tus postulaciones.');
        },
      });
  }

  private resolveEstudianteId(): number | null {
    const stored = this.readJson('castor_estudiante_ctx');
    const ctx = this.userContext.getEstudianteContext();
    const currentUser = this.token.currentUser as any;

    const terceroId =
      ctx?.tercero_id ??
      stored?.tercero_id ??
      currentUser?.rawTokenPayload?.tercero_id ??
      currentUser?.tercero_id ??
      null;

    const parsed = Number(terceroId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private readJson(key: string): any {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private syncEstados(items: PostulacionListItem[]): void {
    const map = new Map<string, string>();
    items.forEach((it) => {
      const det = (it as any)?.estado_det ?? it?.Estado;
      const code = (det?.code ?? it?.estado ?? '').toString().trim();
      const name = (det?.nombre ?? it?.estado ?? '').toString().trim();
      if (code) {
        map.set(code, name || code);
      }
    });
    const dynamic = Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    this.estados = [{ label: 'Todas', value: null }, ...dynamic];
  }

  private enrichOfertas(items: PostulacionListItem[]): void {
    const ofertaIds = Array.from(new Set(items.map((it) => it?.oferta_id).filter((id) => Number(id) > 0))) as number[];
    if (!ofertaIds.length) {
      return;
    }

    const ofertaCalls = ofertaIds.map((id) =>
      this.ofertasService.getDetalle(id).pipe(
        map((detalle) => ({ id, detalle })),
        catchError(() => of({ id, detalle: null })),
      )
    );

    forkJoin(ofertaCalls).subscribe((results) => {
      results.forEach(({ id, detalle }) => {
        if (detalle) {
          this.ofertaMap.set(id, detalle);
        }
      });
      this.enrichEmpresas();
    });
  }

  private enrichEmpresas(): void {
    const empresaIds = Array.from(
      new Set(
        Array.from(this.ofertaMap.values())
          .map((oferta: any) => oferta?.empresa_id)
          .filter((id: any) => Number(id) > 0),
      ),
    ) as number[];

    if (!empresaIds.length) {
      return;
    }

    const empresaCalls = empresaIds.map((id) =>
      this.tercerosService.getEmpresaById(id).pipe(
        map((empresa) => ({ id, empresa })),
        catchError(() => of({ id, empresa: null })),
      )
    );

    forkJoin(empresaCalls).subscribe((results) => {
      results.forEach(({ id, empresa }) => {
        if (empresa) {
          this.empresaMap.set(id, empresa);
        }
      });
    });
  }

  getOfertaTitulo(item: PostulacionListItem): string {
    const oferta = item?.oferta_id ? this.ofertaMap.get(item.oferta_id) : null;
    const titulo =
      oferta?.titulo ??
      oferta?.Titulo ??
      oferta?.oferta_titulo ??
      this.resolveOfertaTitulo(item) ??
      undefined;
    return titulo ? String(titulo) : `Oferta #${item?.oferta_id ?? item?.id ?? ''}`;
  }

  getEmpresaNombre(item: PostulacionListItem): string {
    const oferta = item?.oferta_id ? this.ofertaMap.get(item.oferta_id) : null;
    const empresaId = oferta?.empresa_id ?? oferta?.empresaId;
    const empresa = empresaId ? this.empresaMap.get(Number(empresaId)) : null;
    return (
      empresa?.NombreCompleto ||
      empresa?.RazonSocial ||
      empresa?.razon_social ||
      empresa?.nombre ||
      '-'
    );
  }

  getEstadoNombre(item: PostulacionListItem): string {
    return item?.Estado?.nombre ?? item?.estado ?? '-';
  }

  private resolveOfertaTitulo(item: PostulacionListItem): string | undefined {
    const resumen = (item as any)?.oferta_resumen as { titulo?: string } | undefined;
    return resumen?.titulo
      ?? (item as any)?.ofertaTitulo
      ?? (item as any)?.titulo
      ?? `Oferta #${item?.oferta_id ?? ''}`;
  }
}
