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
    this.counter++;
    this.messageSubject.next(message);
    this.isActiveSubject.next(true);
  }

  hide(): void {
    if (this.counter > 0) {
      this.counter--;
    }
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
