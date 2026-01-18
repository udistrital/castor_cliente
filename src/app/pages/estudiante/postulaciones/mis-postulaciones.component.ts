import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-mis-postulaciones',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatListModule],
  templateUrl: './mis-postulaciones.component.html',
  styleUrls: ['./mis-postulaciones.component.scss'],
})
export class MisPostulacionesComponent {}
