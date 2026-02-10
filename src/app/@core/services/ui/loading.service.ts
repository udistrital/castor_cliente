import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private counter = 0;
  private readonly isActiveSubject = new BehaviorSubject<boolean>(false);
  private readonly messageSubject = new BehaviorSubject<string>('Cargando…');

  readonly isActive$ = this.isActiveSubject.asObservable();
  readonly message$ = this.messageSubject.asObservable();

  show(message = 'Cargando…'): void {
    const before = this.counter;
    this.counter++;
    if (typeof message === 'string' && message.trim().length > 0) {
      this.messageSubject.next(message);
    }
    console.debug(
      `[LOADING] show: before=${before} after=${this.counter} msg="${this.messageSubject.value}"`,
    );
    this.isActiveSubject.next(true);
  }

  hide(): void {
    const before = this.counter;
    if (this.counter > 0) {
      this.counter--;
    }
    this.counter = Math.max(0, this.counter);
    console.debug(`[LOADING] hide: before=${before} after=${this.counter}`);
    if (this.counter === 0) {
      this.isActiveSubject.next(false);
      this.messageSubject.next('Cargando…');
    }
  }

  inc(message?: string): void {
    this.show(message);
  }

  dec(): void {
    this.hide();
  }

  reset(): void {
    this.counter = 0;
    this.isActiveSubject.next(false);
    this.messageSubject.next('Cargando…');
  }
}
