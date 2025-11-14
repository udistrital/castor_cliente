import { Component } from '@angular/core';
import { ColumnDef } from '../../shared/table/column.model';
import { TableAction } from '../../shared/table/data-table.component';
import { AutocompleteTerceroOption } from '../../shared/inputs/autocomplete-tercero.component';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  columns: ColumnDef<Empresa>[] = [
    { key: 'Nit', header: 'NIT', sortable: true, width: '140px' },
    { key: 'NombreCompleto', header: 'Empresa', sortable: true },
    { key: 'Estado', header: 'Estado', sortable: true, width: '120px' },
  ];

  rows: Empresa[] = [
    { Nit: '900123456', NombreCompleto: 'Universidad Distrital', Estado: 'Activo' },
    { Nit: '800654321', NombreCompleto: 'Fundación Innovar', Estado: 'Inactivo' },
    { Nit: '901112223', NombreCompleto: 'Servicios Integrados SAS', Estado: 'Activo' },
  ];

  selected?: AutocompleteTerceroOption;

  onAction(event: TableAction<Empresa>) {
    // Placeholder: replace with routing or dialogs
    console.log('Acción ejecutada', event.type, event.row, event.key);
  }

  onEmpresa(option: AutocompleteTerceroOption) {
    this.selected = option;
  }
}

type Empresa = {
  Nit: string;
  NombreCompleto: string;
  Estado: string;
};
