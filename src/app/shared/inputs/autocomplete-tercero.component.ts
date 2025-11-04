import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';

export type AutocompleteTerceroOption = {
  NIT: string;
  NombreCompleto: string;
  Label: string;
};

@Component({
  selector: 'app-autocomplete-tercero',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <mat-form-field class="w-full" appearance="outline">
      <mat-label>{{ placeholder }}</mat-label>
      <input
        type="text"
        matInput
        [formControl]="ctrl"
        [matAutocomplete]="auto"
        [placeholder]="placeholder"
      />
      <mat-autocomplete
        autoActiveFirstOption
        #auto="matAutocomplete"
        [displayWith]="displayOption"
        (optionSelected)="onSelect($event.option.value)"
      >
        <mat-option *ngFor="let option of options$ | async" [value]="option">
          {{ option.Label }}
        </mat-option>
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class AutocompleteTerceroComponent {
  private readonly http = inject(HttpClient);

  @Output() readonly selected = new EventEmitter<AutocompleteTerceroOption>();
  @Input() placeholder = 'Empresa / NIT';
  @Input() minLength = 2;
  @Input() searchFn?: (term: string) => Observable<AutocompleteTerceroOption[]>;

  ctrl = new FormControl<string | AutocompleteTerceroOption>('', { nonNullable: false });

  readonly options$: Observable<AutocompleteTerceroOption[]> = this.ctrl.valueChanges.pipe(
    startWith(''),
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((value) => this.search(value)),
  );

  displayOption = (option: AutocompleteTerceroOption | string | null): string => {
    if (!option) {
      return '';
    }
    return typeof option === 'string' ? option : option.Label;
  };

  onSelect(option: AutocompleteTerceroOption) {
    this.selected.emit(option);
  }

  private search(term: string | AutocompleteTerceroOption | null): Observable<AutocompleteTerceroOption[]> {
    const query = typeof term === 'string' ? term.trim() : term?.Label ?? '';
    if (!query || query.length < this.minLength) {
      return of([]);
    }
    if (this.searchFn) {
      return this.searchFn(query);
    }
    const params: Record<string, string> = {
      limit: '10',
      offset: '0',
      query: `NombreCompleto__icontains:${query}`,
      fields: 'Id,NombreCompleto,NumeroIdentificacion',
    };
    return this.http
      .get<{ Data?: any[] }>(`${environment.TERCEROS_SERVICE}tercero`, {
        params,
      })
      .pipe(
        map((res) =>
          (res?.Data ?? []).map((item) => ({
            NIT: item.NumeroIdentificacion ?? '',
            NombreCompleto: item.NombreCompleto ?? '',
            Label: `${item.NumeroIdentificacion ?? ''} - ${item.NombreCompleto ?? ''}`,
          })),
        ),
      );
  }
}
