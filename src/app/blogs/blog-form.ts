import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BlogsService } from '../core/blogs.service';
import { slugify } from '../core/slug';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

@Component({
  selector: 'app-blog-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './blog-form.html',
})
export class BlogForm implements OnInit {
  private readonly blogsService = inject(BlogsService);
  private readonly router = inject(Router);

  /** Ausente = criação. */
  readonly blogId = input<string>();

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100), Validators.pattern(SLUG)],
    }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    publicUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300), Validators.pattern(/^(https:\/\/.+)?$/)],
    }),
    deployUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300), Validators.pattern(/^(https:\/\/.+)?$/)],
    }),
    demo: new FormControl(false, { nonNullable: true }),
  });
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  async ngOnInit() {
    const id = this.blogId();
    if (!id) return;
    const blog = await this.blogsService.get(id);
    if (!blog) {
      this.error.set('Blog não encontrado.');
      return;
    }
    const { name, slug, description, publicUrl, deployUrl, demo } = blog;
    this.form.setValue({ name, slug, description, publicUrl, deployUrl, demo });
  }

  protected nameChanged() {
    const slug = this.form.controls.slug;
    if (!this.blogId() && !slug.dirty) slug.setValue(slugify(this.form.controls.name.value));
  }

  protected async save() {
    const input = this.form.getRawValue();
    const id = this.blogId();
    await this.run(async () => {
      if (await this.blogsService.slugTaken(input.slug, id)) {
        throw new Error('Já existe um blog com esse slug.');
      }
      const savedId = id ?? (await this.blogsService.create(input));
      if (id) await this.blogsService.update(id, input);
      await this.router.navigate(['/blogs', savedId]);
    });
  }

  protected async remove() {
    const id = this.blogId();
    if (!id || !confirm(`Excluir o blog "${this.form.controls.name.value}" com todos os posts e membros? Não dá para desfazer.`)) return;
    await this.run(async () => {
      await this.blogsService.remove(id);
      await this.router.navigateByUrl('/');
    });
  }

  private async run(action: () => Promise<void>) {
    this.loading.set(true);
    this.error.set('');
    try {
      await action();
    } catch (e) {
      this.error.set(e instanceof Error && !('code' in e) ? e.message : 'Não foi possível salvar.');
    } finally {
      this.loading.set(false);
    }
  }
}
