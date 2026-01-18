import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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

  private resolveEstudianteId(): number | null {
    const ctx = this.userContext.getEstudianteContext();
    const currentUser = this.token.currentUser as any;
    const estudianteIdRaw =
      currentUser?.rawTokenPayload?.Codigo ??
      currentUser?.Codigo ??
      ctx?.codigo ??
      null;
    const estudianteId = Number(estudianteIdRaw);
    if (!Number.isFinite(estudianteId) || estudianteId <= 0) {
      return null;
    }
    return estudianteId;
  }
}
