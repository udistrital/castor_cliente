import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from 'src/app/@core/services/ui/loading.service';

@Component({
  selector: 'app-global-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="overlay" *ngIf="loading.isActive$ | async">
    <div class="box">
      <img class="logo" src="assets/icons/icon-144x144.png" alt="UD">
      <div>
        <div class="title">Procesando…</div>
        <div class="msg">{{ (loading.message$ | async) || 'Cargando' }}</div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .overlay { position: fixed; inset:0; display:flex; align-items:center; justify-content:center;
      background: rgba(0,0,0,.55); backdrop-filter: blur(2px); z-index: 99999; }
    .box { display:flex; gap:16px; align-items:center; background:#fff; padding:20px 24px;
      border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,.35); }
    .logo { width:48px; height:48px; object-fit:contain; }
    .title { font-weight:700; font-size:16px; margin-bottom:2px; }
    .msg { opacity:.85; }
  `]
})
export class GlobalLoadingOverlayComponent {
  constructor(public loading: LoadingService) {}
}
