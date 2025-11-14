import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private fireSafe(options: any) {
    try {
      if (Swal && typeof (Swal as any).fire === 'function') {
        return (Swal as any).fire(options);
      }
    } catch {
      // ignore
    }

    const title = options?.title || options?.text || 'Mensaje';
    const text = options?.text || '';
    window.alert(`${title}\n${text}`);
    return Promise.resolve();
  }

  success(title: string, text?: string) {
    return this.fireSafe({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Aceptar',
    });
  }

  error(title: string, text?: string) {
    return this.fireSafe({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Cerrar',
    });
  }

  info(title: string, text?: string) {
    return this.fireSafe({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'Entendido',
    });
  }

  confirm(text: string): Promise<boolean> {
    return this.fireSafe({
      icon: 'question',
      title: 'Confirmación',
      text,
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
    }).then((result: any) => Boolean(result?.isConfirmed));
  }
}
