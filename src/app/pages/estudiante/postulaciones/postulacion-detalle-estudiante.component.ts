import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-postulacion-detalle-estudiante',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './postulacion-detalle-estudiante.component.html',
  styleUrls: ['./postulacion-detalle-estudiante.component.scss'],
})
export class PostulacionDetalleEstudianteComponent {
  id: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    const raw = this.route.snapshot.paramMap.get('id');
    const parsed = raw ? Number(raw) : null;
    this.id = Number.isFinite(parsed as number) ? (parsed as number) : null;
  }

  volver(): void {
    this.router.navigate(['/pages/estudiante/postulaciones']);
  }
}
