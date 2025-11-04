import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, filter, startWith, switchMap, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ColumnDef, TableFilters } from './column.model';
import { DataTableCellTemplateDirective } from './cell-template.directive';

export type TableAction<T = any> = {
  type: 'view' | 'edit' | 'delete' | 'custom';
  row: T;
  key?: string;
};

export type ServerQuery = {
  pageIndex: number;
  pageSize: number;
  sort?: { active: string; direction: 'asc' | 'desc' | '' };
  filter?: TableFilters | string | null;
};

export type ServerResponse<T = any> = { data: T[]; total: number };

type BuiltInActions = {
  view?: boolean;
  edit?: boolean;
  delete?: boolean;
};

type ExtraAction<T> = {
  icon: string;
  type: string;
  tooltip?: string;
  color?: 'primary' | 'accent' | 'warn' | '';
  predicate?: (row: T) => boolean;
};

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    ReactiveFormsModule,
    DataTableCellTemplateDirective,
  ],
  template: `
    <div class="app-data-table">
      <header class="toolbar" *ngIf="enableFilter">
        <mat-form-field appearance="outline">
          <mat-label>{{ filterPlaceholder }}</mat-label>
          <input matInput [formControl]="filterCtrl" />
        </mat-form-field>
      </header>

      <section class="table-wrapper" *ngIf="!serverMode; else serverTable">
        <table mat-table [dataSource]="dataSource" matSort class="mat-elevation-z0">
          <ng-container *ngFor="let c of columns" [matColumnDef]="columnKey(c)">
            <th
              mat-header-cell
              *matHeaderCellDef
              [mat-sort-header]="c.sortable ? columnKey(c) : null"
              [style.width]="c.width || null"
            >
              {{ c.header }}
            </th>
            <td mat-cell *matCellDef="let row" [ngClass]="classFor(c, row)">
              <ng-container *ngIf="!c.cellTplName; else customCell">
                {{ resolveValue(row, c.key) }}
              </ng-container>
              <ng-template #customCell>
                <ng-container
                  *ngTemplateOutlet="templateFor(c.cellTplName); context: { $implicit: row, col: c }"
                ></ng-container>
              </ng-template>
            </td>
          </ng-container>

          <ng-container matColumnDef="__actions" *ngIf="showActions()">
            <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
            <td mat-cell *matCellDef="let row" class="text-right action-cell">
              <button
                *ngIf="actions.view"
                mat-icon-button
                aria-label="Ver"
                (click)="emit('view', row)"
              >
                <mat-icon>visibility</mat-icon>
              </button>
              <button
                *ngIf="actions.edit"
                mat-icon-button
                aria-label="Editar"
                color="primary"
                (click)="emit('edit', row)"
              >
                <mat-icon>edit</mat-icon>
              </button>
              <button
                *ngIf="actions.delete"
                mat-icon-button
                aria-label="Eliminar"
                color="warn"
                (click)="emit('delete', row)"
              >
                <mat-icon>delete</mat-icon>
              </button>
              <ng-container *ngFor="let extra of extraActions">
                <button
                  *ngIf="shouldRenderExtra(extra, row)"
                  mat-icon-button
                  [attr.aria-label]="extra.type"
                  [color]="extra.color || undefined"
                  (click)="emit('custom', row, extra.type)"
                  [matTooltip]="extra.tooltip"
                >
                  <mat-icon>{{ extra.icon }}</mat-icon>
                </button>
              </ng-container>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </section>

      <ng-template #serverTable>
        <table mat-table [dataSource]="serverData()" matSort (matSortChange)="onSort($event)">
          <ng-container *ngFor="let c of columns" [matColumnDef]="columnKey(c)">
            <th
              mat-header-cell
              *matHeaderCellDef
              [mat-sort-header]="c.sortable ? columnKey(c) : null"
              [style.width]="c.width || null"
            >
              {{ c.header }}
            </th>
            <td mat-cell *matCellDef="let row" [ngClass]="classFor(c, row)">
              <ng-container *ngIf="!c.cellTplName; else customCellSrv">
                {{ resolveValue(row, c.key) }}
              </ng-container>
              <ng-template #customCellSrv>
                <ng-container
                  *ngTemplateOutlet="templateFor(c.cellTplName); context: { $implicit: row, col: c }"
                ></ng-container>
              </ng-template>
            </td>
          </ng-container>

          <ng-container matColumnDef="__actions" *ngIf="showActions()">
            <th mat-header-cell *matHeaderCellDef class="text-right">Acciones</th>
            <td mat-cell *matCellDef="let row" class="text-right action-cell">
              <button
                *ngIf="actions.view"
                mat-icon-button
                aria-label="Ver"
                (click)="emit('view', row)"
              >
                <mat-icon>visibility</mat-icon>
              </button>
              <button
                *ngIf="actions.edit"
                mat-icon-button
                aria-label="Editar"
                color="primary"
                (click)="emit('edit', row)"
              >
                <mat-icon>edit</mat-icon>
              </button>
              <button
                *ngIf="actions.delete"
                mat-icon-button
                aria-label="Eliminar"
                color="warn"
                (click)="emit('delete', row)"
              >
                <mat-icon>delete</mat-icon>
              </button>
              <ng-container *ngFor="let extra of extraActions">
                <button
                  *ngIf="shouldRenderExtra(extra, row)"
                  mat-icon-button
                  [attr.aria-label]="extra.type"
                  [color]="extra.color || undefined"
                  (click)="emit('custom', row, extra.type)"
                  [matTooltip]="extra.tooltip"
                >
                  <mat-icon>{{ extra.icon }}</mat-icon>
                </button>
              </ng-container>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </ng-template>

      <mat-paginator
        [length]="total()"
        [pageIndex]="pageIndex()"
        [pageSize]="pageSize()"
        [pageSizeOptions]="pageSizeOptions"
        (page)="onPage($event)"
      ></mat-paginator>
    </div>
  `,
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T = any>
  implements OnChanges, AfterViewInit, AfterContentInit
{
  private readonly destroyRef = inject(DestroyRef);

  @Input() columns: ColumnDef<T>[] = [];
  @Input() rows: T[] = [];
  @Input() serverMode = false;
  @Input() fetchFn?: (q: ServerQuery) => Observable<ServerResponse<T>>;
  @Input() enableFilter = true;
  @Input() filterPlaceholder = 'Buscar...';
  @Input() filters: TableFilters | string | null = null;
  @Input() actions: BuiltInActions = { view: true, edit: true, delete: true };
  @Input() extraActions: ExtraAction<T>[] = [];
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50];

  @Output() action = new EventEmitter<TableAction<T>>();
  @Output() filterChange = new EventEmitter<TableFilters | string | null>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) private matSort!: MatSort;
  @ContentChildren(DataTableCellTemplateDirective)
  templates?: QueryList<DataTableCellTemplateDirective>;

  readonly dataSource = new MatTableDataSource<T>([]);
  readonly filterCtrl = new FormControl<string>('');

  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly sortState = signal<{ active: string; direction: 'asc' | 'desc' | '' }>({
    active: '',
    direction: '',
  });
  readonly serverData = signal<T[]>([]);

  readonly displayedColumns = computed(() => {
    const cols = this.columns.map((c) => this.columnKey(c));
    return this.showActions() ? [...cols, '__actions'] : cols;
  });

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  constructor() {
    this.filterCtrl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(250),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => {
        this.applyFilter(value ?? '');
      });

    effect(
      () => {
        if (!this.serverMode) {
          this.dataSource.data = [...this.rows];
          this.total.set(this.rows.length);
        }
      },
      { allowSignalWrites: true },
    );

    this.refresh$
      .pipe(
        filter(() => this.serverMode && !!this.fetchFn),
        switchMap(() => this.fetchServerData()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        this.total.set(response.total);
        this.serverData.set(response.data);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] && !this.serverMode) {
      this.dataSource.data = [...(this.rows ?? [])];
      this.total.set(this.rows.length);
    }

    if (changes['filters'] && this.serverMode) {
      this.refresh$.next();
    }
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.matSort && !this.serverMode) {
      this.dataSource.sort = this.matSort;
      this.dataSource.sortingDataAccessor = (data, sortHeaderId) =>
        this.resolveValue(data, sortHeaderId);
    }

    if (this.serverMode) {
      this.refresh$.next();
    }
  }

  ngAfterContentInit(): void {
    this.templates?.changes.pipe(startWith(this.templates)).subscribe(() => {
      this.templateMap.clear();
      this.templates?.forEach((tpl) => {
        if (tpl.name) {
          this.templateMap.set(tpl.name, tpl.template);
        }
      });
    });
  }

  emit(type: TableAction['type'], row: T, key?: string) {
    this.action.emit({ type, row, key });
  }

  onPage(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    if (this.serverMode) {
      this.refresh$.next();
    } else if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
  }

  onSort(sort: Sort) {
    this.sortState.set({ active: sort.active, direction: (sort.direction || '') as any });
    if (this.serverMode) {
      this.refresh$.next();
    }
  }

  applyFilter(value: string) {
    const filterValue = value.trim().toLowerCase();
    if (!this.serverMode) {
      this.dataSource.filter = filterValue;
    } else {
      const nextFilter = filterValue || this.filters;
      this.filterChange.emit(nextFilter);
      this.refresh$.next();
    }
  }

  classFor(column: ColumnDef<T>, row: T): string {
    if (!column.cellClass) {
      return '';
    }
    if (typeof column.cellClass === 'function') {
      const value = column.cellClass(row);
      return Array.isArray(value) ? value.join(' ') : value;
    }
    return column.cellClass;
  }

  templateFor(name?: string) {
    if (!name) {
      return null;
    }
    return this.templateMap.get(name) ?? null;
  }

  showActions() {
    return this.actions.view || this.actions.edit || this.actions.delete || this.extraActions.length > 0;
  }

  columnKey(column: ColumnDef<T>): string {
    return typeof column.key === 'string' ? column.key : String(column.key);
  }

  resolveValue(row: T, key: keyof T | string) {
    if (!row || key === undefined || key === null) {
      return '';
    }
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((acc: any, part) => (acc ? acc[part] : ''), row as any);
    }
    return (row as any)?.[key as string];
  }

  shouldRenderExtra(extra: ExtraAction<T>, row: T) {
    return extra.predicate ? extra.predicate(row) : true;
  }

  private fetchServerData(): Observable<ServerResponse<T> | null> {
    if (!this.fetchFn) {
      return of(null);
    }
    const query: ServerQuery = {
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      sort: this.sortState(),
      filter: this.filters ?? this.filterCtrl.value ?? null,
    };
    return this.fetchFn(query).pipe(tap(() => this.syncPaginator()));
  }

  private syncPaginator() {
    if (this.paginator) {
      this.paginator.pageIndex = this.pageIndex();
      this.paginator.pageSize = this.pageSize();
      this.paginator.length = this.total();
    }
  }

  private readonly templateMap = new Map<string, TemplateRef<unknown>>();
}
