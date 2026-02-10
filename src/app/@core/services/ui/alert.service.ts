import { Injectable, NgZone } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

type FireArgs = any[];

@Injectable({ providedIn: 'root' })
export class AlertService {
  private loadingRef: any = null;

  constructor(private snack: MatSnackBar, private zone: NgZone) {}

  // Mantener firma compatible con usos antiguos (fire variádico)
  fire(...args: FireArgs): Promise<any> {
    // Soporta fire('Title','Text','type') y fire({ ... })
    try {
      const first = args?.[0];

      // Caso objeto estilo Swal.fire({icon,title,text,...})
      if (first && typeof first === 'object') {
        const icon = first.icon ?? 'info';
        const title = String(first.title ?? '');
        const text = String(first.text ?? '');
        this.openSnack(this.format(title, text), this.toKind(icon));
        return Promise.resolve({ isConfirmed: true });

      }

      // Caso variádico: (title, text, icon)
      const title = String(args?.[0] ?? '');
      const text = String(args?.[1] ?? '');
      const icon = args?.[2] ?? 'info';
      this.openSnack(this.format(title, text), this.toKind(icon));
      return Promise.resolve({ isConfirmed: true });

      return Promise.resolve({ isConfirmed: true });
    } catch (e) {
      console.error('[ALERT] fallo al mostrar alerta:', e);
      return Promise.resolve();
    }
  }

  showLoading(message = 'Cargando...'): void {
    // Snack persistente como "loading" sin overlay complejo
    this.close();
    this.zone.run(() => {
      this.loadingRef = this.snack.open(message, undefined, { duration: 0 });
    });
  }

  close(): void {
    try {
      if (this.loadingRef) {
        this.loadingRef.dismiss();
        this.loadingRef = null;
      } else {
        this.snack.dismiss();
      }
    } catch (e) {
      console.warn('[ALERT] close fallo', e);
    }
  }

  success(title: string, text?: string): Promise<any> {
    this.openSnack(this.format(title, text), 'success');
    return Promise.resolve();
  }

  error(title: string, text?: string): Promise<any> {
    this.openSnack(this.format(title, text), 'error');
    return Promise.resolve();
  }

  info(title: string, text?: string): Promise<any> {
    this.openSnack(this.format(title, text), 'info');
    return Promise.resolve();
  }

  warning(title: string, text?: string): Promise<any> {
    this.openSnack(this.format(title, text), 'warning');
    return Promise.resolve();
  }

  confirm(text: string, title = 'Confirmación'): Promise<boolean> {
    // Confirm simple y estable (evita modal libs que disparan polyfills)
    const ok = window.confirm(`${title}\n\n${text}`);
    return Promise.resolve(ok);
  }

  private openSnack(message: string, kind: 'success' | 'error' | 'info' | 'warning') {
    // Sin panelClass para no depender de estilos; se puede agregar después.
    this.zone.run(() => {
      this.snack.open(message, 'OK', { duration: 4000 });
    });
    console.log('[ALERT]', kind, message);
  }

  private format(title: string, text?: string) {
    const t = (title ?? '').trim();
    const x = (text ?? '').trim();
    if (t && x) return `${t}: ${x}`;
    return t || x || '';
  }

    private toKind(value: any): 'success' | 'error' | 'info' | 'warning' {
    const v = String(value ?? 'info').toLowerCase().trim();
    if (v === 'success' || v === 'error' || v === 'warning' || v === 'info') return v;
    // soporta tipos comunes de Swal
    if (v === 'warn') return 'warning';
    if (v === 'question') return 'info';
    return 'info';
  }

}
