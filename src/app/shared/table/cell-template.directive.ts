import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[appDataTableCell]',
  standalone: true,
})
export class DataTableCellTemplateDirective {
  @Input('appDataTableCell') name!: string;

  constructor(public readonly template: TemplateRef<unknown>) {}
}
