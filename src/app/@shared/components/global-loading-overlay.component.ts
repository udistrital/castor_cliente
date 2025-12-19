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
      background: #0f2145e6; backdrop-filter: blur(4px); z-index: 99999; }
    .box { display:flex; gap:16px; align-items:center; background:#fff; padding:22px 26px;
      border-radius:18px; box-shadow:0 24px 70px rgba(0,0,0,.45); max-width: 90vw; }
    .logo { width:56px; height:56px; object-fit:contain; }
    .title { font-weight:700; font-size:16px; margin-bottom:4px; color:#0f2145; }
    .msg { opacity:.9; color:#1f2d42; }
  `]
})
export class GlobalLoadingOverlayComponent {
  constructor(public loading: LoadingService) {}
}
