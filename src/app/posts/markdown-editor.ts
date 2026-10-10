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
import { $remark } from '@milkdown/kit/utils';

interface MdNode {
  type: string;
  title?: string | null;
  children?: MdNode[];
}

// ponytail: contorna bug do Milkdown 7.22.2 — `![alt](url)` sem título vira caption null e o
// image-block lança RangeError. Remover quando o Milkdown corrigir.
const imageTitleFix = $remark('imageTitleFix', () => () => (tree: MdNode) => {
  const visit = (node: MdNode) => {
    if (node.type === 'image' || node.type === 'image-block') node.title ??= '';
    node.children?.forEach(visit);
  };
  visit(tree);
});

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
      crepe.editor.use(imageTitleFix);
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
