import { Component, input } from '@angular/core';
import { LOGO_MARK, LOGO_TEXT, LOGO_VIEWBOX } from './logo-paths';

/**
 * Logo vetorial (símbolo "AD" + "EMIRO" em contorno, sem depender de fonte).
 * Cores vêm de --ad-logo-mark / --ad-logo-text (mudam com o tema) ou do `color` do pai em `mono`.
 */
@Component({
  selector: 'app-logo',
  template: `
    <svg [attr.viewBox]="viewBox" [attr.height]="height()" role="img" aria-label="Ademiro" class="d-block">
      <path [attr.d]="mark" fill-rule="evenodd" [attr.fill]="mono() ? 'currentColor' : 'var(--ad-logo-mark)'"></path>
      <path [attr.d]="text" [attr.fill]="mono() ? 'currentColor' : 'var(--ad-logo-text)'"></path>
    </svg>
  `,
  host: { class: 'd-inline-block' },
})
export class Logo {
  readonly height = input(32);
  /** Uma cor só (a do texto ao redor), ex.: sobre o painel azul do login. */
  readonly mono = input(false);

  protected readonly viewBox = LOGO_VIEWBOX;
  protected readonly mark = LOGO_MARK;
  protected readonly text = LOGO_TEXT;
}
