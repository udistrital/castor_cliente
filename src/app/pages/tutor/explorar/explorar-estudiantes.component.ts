import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { AlertService } from 'src/app/@core/services/ui/alert.service';
import { TutorContextService } from 'src/app/@core/services/tutor/tutor-context.service';
import { TutorExplorarService } from 'src/app/@core/services/tutor/tutor-explorar.service';

type PcOption = { id: number; nombre: string };

@Component({
  selector: 'app-explorar-estudiantes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,

    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './explorar-estudiantes.component.html',
  styleUrls: ['./explorar-estudiantes.component.scss'],
})
export class ExplorarEstudiantesComponent implements OnInit {
  readonly dataSource = new MatTableDataSource<any>([]);
  // ✅ Quitamos visible y bookmark por ahora
  readonly displayedColumns = ['nombre', 'carrera', 'habilidades', 'acciones'];

  loading = false;
  total = 0;
  pageIndex = 0;
  pageSize = 10;

  // ✅ Filtros: PC (autocomplete) + habilidades
  pcCtrl = new FormControl<string | PcOption>('');
  filtroPcId: number | null = null;

  filtroHabilidades = '';

  // catálogo PC
  pcOptions: PcOption[] = [];
  pcFiltered$: Observable<PcOption[]> = of([]);

  // estado UI (para “no traer nada al entrar”)
  hasSearched = false;

  private tutorId: number | null = null;

  constructor(
    private tutorContext: TutorContextService,
    private explorarService: TutorExplorarService,
    private router: Router,
    private alert: AlertService,
  ) {}

  ngOnInit(): void {
    this.tutorContext.ensureLoaded().subscribe((ctx) => {
      this.tutorId = ctx?.tutor_id ?? null;
      if (!this.tutorId) {
        this.alert.error('Error', 'No pudimos identificar tu perfil de tutor.');
        return;
      }

      // ✅ Solo cargamos catálogo PC. NO cargamos estudiantes al entrar.
      this.loadCatalogoPc();
    });
  }

  // ------------------------
  // Autocomplete helpers
  // ------------------------
  displayPc(opt: PcOption | string | null): string {
    if (!opt) return '';
    return typeof opt === 'string' ? opt : (opt.nombre ?? '');
  }

  onPcSelected(opt: PcOption): void {
    this.filtroPcId = opt?.id ?? null;
  }

  onPcInputChanged(): void {
    const v = this.pcCtrl.value;

    // si el usuario escribe texto manual (no selecciona opción), anulamos id
    if (typeof v === 'string') {
      this.filtroPcId = null;
    }
  }

  private filterPc(value: string | PcOption | null): PcOption[] {
    const text = (typeof value === 'string' ? value : value?.nombre || '').toLowerCase().trim();
    if (!text) return this.pcOptions.slice(0, 50); // limita visualmente
    return this.pcOptions
      .filter((x) => (x.nombre || '').toLowerCase().includes(text))
      .slice(0, 50);
  }

  private loadCatalogoPc(): void {
    // 🔁 Ajusta el método del servicio según tu implementación real:
    this.explorarService.listarProyectosCurriculares().pipe(
      catchError((e) => {
        console.warn('[ExplorarEstudiantes] error cargando catálogo PC', e);
        this.alert.error('Error', 'No pudimos cargar el catálogo de proyectos curriculares.');
        return of([]);
      }),
    ).subscribe((items: any[]) => {
      this.pcOptions = (Array.isArray(items) ? items : []).map((it: any) => ({
        id: Number(it?.id ?? it?.Id ?? it?.dependencia_id ?? 0),
        nombre: String(it?.nombre ?? it?.Nombre ?? it?.nombre_dependencia ?? it?.NombreDependencia ?? '').trim(),
      })).filter((x) => Number.isFinite(x.id) && x.id > 0 && x.nombre);

      this.pcFiltered$ = this.pcCtrl.valueChanges.pipe(
        startWith(this.pcCtrl.value ?? ''),
        map((value) => this.filterPc(value)),
      );
    });
  }

  // ------------------------
  // Acciones
  // ------------------------
  buscar(): void {
    this.pageIndex = 0;
    this.hasSearched = true;

    // ✅ Validación: al menos 1 criterio (pc o habilidades)
    const skills = (this.filtroHabilidades || '').trim();
    const hasPc = Number.isFinite(Number(this.filtroPcId)) && Number(this.filtroPcId) > 0;
    const hasSkills = skills.length > 0;

    if (!hasPc && !hasSkills) {
      this.total = 0;
      this.dataSource.data = [];
      this.alert.info('Falta un criterio', 'Selecciona un proyecto curricular o escribe al menos una habilidad.');
      return;
    }

    this.loadEstudiantes();
  }

  limpiar(): void {
    this.pcCtrl.setValue('');
    this.filtroPcId = null;
    this.filtroHabilidades = '';

    this.pageIndex = 0;
    this.total = 0;
    this.dataSource.data = [];
    this.hasSearched = false; // vuelve al estado inicial
  }

  onPage(event: PageEvent): void {
    if (!this.hasSearched) return; // si no ha buscado, no paginar
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEstudiantes();
  }

  verDetalle(row: any): void {
    const perfilId = row?.perfil_id ?? row?.id ?? row?.perfilId;
    if (!perfilId) return;

    this.router.navigate(['/pages/tutor/explorar-estudiantes', perfilId], {
      queryParams: { from: 'explorar', tercero_id: row?.tercero_id ?? row?.terceroId ?? row?.TerceroId },
    });
  }

  // ------------------------
  // Render helpers
  // ------------------------
  getNombre(row: any): string {
    return String(row?.NombreCompleto ?? row?.nombre ?? row?.nombre_completo ?? 'Estudiante').trim();
  }

  getCarrera(row: any): string {
    // preferimos nombre resuelto si viene del MID
    const pcAny: any = row?.proyecto_curricular ?? row?.proyectoCurricular;

    const nombre =
      row?.proyecto_curricular_nombre ||
      pcAny?.nombre ||
      pcAny?.Nombre ||
      row?.carrera ||
      row?.programa ||
      '';

    if (String(nombre).trim()) return String(nombre).trim();

    const pcId = Number(row?.proyecto_curricular_id ?? pcAny?.id ?? 0);
    return Number.isFinite(pcId) && pcId > 0 ? `Proyecto curricular #${pcId}` : '-';
  }

  getHabilidades(row: any): string {
    const hab = row?.habilidades ?? row?.skills ?? [];
    return Array.isArray(hab) ? hab.join(', ') : String(hab || '-');
  }

  private loadEstudiantes(): void {
    if (!this.tutorId) return;

    const page = this.pageIndex + 1;
    const limit = this.pageSize;

    const skills = (this.filtroHabilidades || '').trim();

    this.loading = true;

    this.explorarService.listarEstudiantes(this.tutorId, {
      // ✅ ya no mandamos texto
      proyecto_curricular_id: this.filtroPcId ?? undefined,
      habilidades: skills || undefined,
      page,
      limit,
    }).subscribe({
      next: (resp) => {
        this.total = resp.total ?? 0;
        this.dataSource.data = Array.isArray(resp.items) ? resp.items : [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.warn('[TUTOR] Error cargar estudiantes', err);
        this.alert.error('Error', 'No pudimos cargar estudiantes.');
      },
    });
  }
}
