import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { TokenService } from 'src/app/@core/services/auth/token.service';
import { UserContextService } from 'src/app/@core/services/user-context.service';
import {
  OfertasEstudianteService,
  OfertaDisponibleItem,
} from 'src/app/@core/services/ofertas-estudiante.service';

@Component({
  selector: 'app-ofertas-disponibles',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule],
  templateUrl: './ofertas-disponibles.component.html',
  styleUrls: ['./ofertas-disponibles.component.scss'],
})
export class OfertasDisponiblesComponent implements OnInit {
  ofertas: OfertaDisponibleItem[] = [];
  cargando = false;

  constructor(
    private ofertasService: OfertasEstudianteService,
    private userContext: UserContextService,
    private token: TokenService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadOfertas();
  }

  async loadOfertas(): Promise<void> {
    const estudianteId = this.resolveEstudianteId();
    if (!estudianteId) {
      this.ofertas = [];
      return;
    }
    try {
      this.cargando = true;
      const resp = await firstValueFrom(this.ofertasService.getDisponibles(estudianteId));
      this.ofertas = resp?.items ?? [];
    } finally {
      this.cargando = false;
    }
  }

  postularme(ofertaId: number): void {
    console.warn('pendiente endpoint postular', ofertaId);
  }

  goDetalle(id: number): void {
    if (!id) return;
    this.router.navigate(['/pages/estudiante/ofertas', id]);
  }

  private resolveEstudianteId(): number | null {
    const ctx = this.userContext.getEstudianteContext();
    const currentUser = this.token.currentUser as any;

    const terceroId =
      ctx?.tercero_id ??
      currentUser?.rawTokenPayload?.tercero_id ??
      currentUser?.tercero_id ??
      null;

    const id = Number(terceroId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return id;
  }
}
