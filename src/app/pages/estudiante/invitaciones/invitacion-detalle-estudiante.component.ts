import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-invitacion-detalle-estudiante',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './invitacion-detalle-estudiante.component.html',
  styleUrls: ['./invitacion-detalle-estudiante.component.scss'],
})
export class InvitacionDetalleEstudianteComponent {
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
    this.router.navigate(['/pages/estudiante/invitaciones']);
  }
}
