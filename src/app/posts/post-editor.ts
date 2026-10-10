import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Blog, BlogRole, BlogsService } from '../core/blogs.service';
import { Post, PostInput, PostStatus, PostsService } from '../core/posts.service';
import { slugify } from '../core/slug';
import { MarkdownEditor } from './markdown-editor';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HTTPS = /^(https:\/\/.+)?$/;

/** "Angular, angular , RxJS" → ['angular', 'rxjs'] */
export function parseTags(text: string): string[] {
  return [...new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

@Component({
  selector: 'app-post-editor',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, MarkdownEditor],
  templateUrl: './post-editor.html',
})
export class PostEditor implements OnInit {
  private readonly blogsService = inject(BlogsService);
  private readonly postsService = inject(PostsService);
  private readonly router = inject(Router);

  readonly blogId = input.required<string>();
  /** 'new' = criação. */
  readonly postId = input.required<string>();

  protected readonly blog = signal<Blog | null>(null);
  protected readonly post = signal<Post | null>(null);
  protected readonly role = signal<BlogRole | null>(null);
  protected readonly ready = signal(false);
  protected readonly body = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal(false);

  protected readonly isNew = computed(() => this.postId() === 'new');
  protected readonly canWrite = computed(() => this.role() === 'admin' || this.role() === 'editor');

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    subtitle: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
    slug: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150), Validators.pattern(SLUG)],
    }),
    summary: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] }),
    coverUrl: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(1000), Validators.pattern(HTTPS)],
    }),
    tags: new FormControl('', { nonNullable: true }),
    status: new FormControl<PostStatus>('draft', { nonNullable: true }),
  });

  async ngOnInit() {
    const blog = await this.blogsService.get(this.blogId());
    if (!blog) return this.error.set('Blog não encontrado.');
    this.blog.set(blog);
    this.role.set(await this.blogsService.roleIn(blog));

    if (!this.isNew()) {
      const post = await this.postsService.get(this.blogId(), this.postId());
      if (!post) return this.error.set('Post não encontrado.');
      this.post.set(post);
      const { title, subtitle, slug, summary, coverUrl, tags, status, body } = post;
      this.form.setValue({ title, subtitle, slug, summary, coverUrl, tags: tags.join(', '), status });
      this.body.set(body);
    }
    if (!this.canWrite()) this.form.disable();
    this.ready.set(true);
  }

  protected titleChanged() {
    const slug = this.form.controls.slug;
    if (this.isNew() && !slug.dirty) slug.setValue(slugify(this.form.controls.title.value).slice(0, 150));
  }

  protected async save() {
    const { tags, ...fields } = this.form.getRawValue();
    const input: PostInput = { ...fields, tags: parseTags(tags), body: this.body() };
    if (input.tags.length > 20) return this.error.set('Máximo de 20 tags.');

    await this.run(async () => {
      const blogId = this.blogId();
      const current = this.post();
      if (await this.postsService.slugTaken(blogId, input.slug, current?.id)) {
        throw new Error('Já existe um post com esse slug neste blog.');
      }
      const id = current
        ? (await this.postsService.update(blogId, current, input), current.id)
        : await this.postsService.create(blogId, input);
      this.post.set(await this.postsService.get(blogId, id));
      this.form.markAsPristine();
      this.saved.set(true);
      // Mesma rota → o router reaproveita este componente; o estado já está carregado acima.
      if (!current) await this.router.navigate(['/blogs', blogId, 'posts', id], { replaceUrl: true });
    });
  }

  protected async remove() {
    const post = this.post();
    if (!post || !confirm(`Excluir o post "${post.title}"? Não dá para desfazer.`)) return;
    await this.run(async () => {
      await this.postsService.remove(this.blogId(), post.id);
      await this.router.navigate(['/blogs', this.blogId()]);
    });
  }

  private async run(action: () => Promise<void>) {
    this.loading.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      await action();
    } catch (e) {
      this.error.set(e instanceof Error && !('code' in e) ? e.message : 'Não foi possível salvar.');
    } finally {
      this.loading.set(false);
    }
  }
}
