import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  input,
  model,
} from '@angular/core';
import { Crepe } from '@milkdown/crepe';

/** Editor WYSIWYG que lê e grava Markdown. O valor inicial é lido uma única vez, na criação. */
@Component({
  selector: 'app-markdown-editor',
  template: '',
  host: {
    class: 'd-block border rounded',
    '(keydown)': 'touched = true',
    '(pointerdown)': 'touched = true',
    '(paste)': 'touched = true',
    '(drop)': 'touched = true',
  },
})
export class MarkdownEditor implements OnDestroy {
  protected touched = false;
  readonly value = model('');
  readonly readonly = input(false);

  private readonly host = inject(ElementRef<HTMLElement>);
  private crepe?: Crepe;

  constructor() {
    afterNextRender(async () => {
      const crepe = new Crepe({
        root: this.host.nativeElement,
        defaultValue: this.value(),
        featureConfigs: {
          [Crepe.Feature.Placeholder]: { text: 'Escreva o conteúdo… digite / para inserir blocos' },
          [Crepe.Feature.ImageBlock]: {
            // Sem Storage no plano grátis: só URL externa https.
            onUpload: async () => {
              alert('Upload de imagem não disponível. Cole a URL https:// da imagem.');
              throw new Error('upload desativado');
            },
            proxyDomURL: (url) => (url.startsWith('https://') ? url : ''),
          },
        },
      });
      // Só propaga depois que o usuário interagiu: o Milkdown também altera o doc sozinho
      // (ex.: image-block grava a proporção quando a imagem carrega), e isso não é edição.
      crepe.on((listener) =>
        listener.markdownUpdated((_, markdown) => this.touched && this.value.set(markdown)),
      );
      await crepe.create();
      crepe.setReadonly(this.readonly());
      this.crepe = crepe;
    });

    effect(() => {
      const readonly = this.readonly();
      this.crepe?.setReadonly(readonly);
    });
  }

  ngOnDestroy() {
    this.crepe?.destroy();
  }
}
