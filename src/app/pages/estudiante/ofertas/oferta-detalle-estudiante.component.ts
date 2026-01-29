import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-oferta-detalle-estudiante',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './oferta-detalle-estudiante.component.html',
  styleUrls: ['./oferta-detalle-estudiante.component.scss'],
})
export class OfertaDetalleEstudianteComponent {
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
    this.router.navigate(['/pages/estudiante/ofertas']);
  }
}
