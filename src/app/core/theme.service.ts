import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ademiro-theme';

/** Tema claro/escuro. O valor inicial já foi aplicado no <html> por public/theme-init.js. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(
    document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'dark' : 'light',
  );

  toggle() {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    document.documentElement.setAttribute('data-bs-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // navegação privada / armazenamento bloqueado: o tema vale só para esta sessão
    }
  }
}
