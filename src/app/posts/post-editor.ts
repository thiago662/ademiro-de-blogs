import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Blog, BlogRole, BlogsService } from '../core/blogs.service';
import {
  FieldDef,
  FieldType,
  FieldsGroup,
  buildFieldsGroup,
  fieldKey,
  fieldTypes,
  parseTags,
  readFieldsGroup,
} from '../core/fields';
import { Post, PostInput, PostStatus, PostsService } from '../core/posts.service';
import { slugify } from '../core/slug';
import { HasUnsavedChanges } from '../core/unsaved-changes.guard';
import { CustomFields } from './custom-fields';
import { MarkdownEditor } from './markdown-editor';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HTTPS = /^(https:\/\/.+)?$/;

@Component({
  selector: 'app-post-editor',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, MarkdownEditor, CustomFields],
  templateUrl: './post-editor.html',
  // Ternário, não &&: handler que retorna false faz o Angular chamar preventDefault().
  host: { '(window:beforeunload)': 'hasUnsavedChanges() ? $event.preventDefault() : null' },
})
export class PostEditor implements OnInit, HasUnsavedChanges {
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
  protected readonly bodyDirty = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly saved = signal(false);

  /** Campos do blog com escopo "post" → post.custom */
  protected readonly postDefs = signal<FieldDef[]>([]);
  protected readonly customForm = signal<FieldsGroup>(buildFieldsGroup([], {}));
  /** Campos avulsos só deste post → post.extras */
  protected readonly extraDefs = signal<FieldDef[]>([]);
  protected readonly extrasForm = signal<FieldsGroup>(buildFieldsGroup([], {}));
  protected readonly extraTypes = fieldTypes.filter((t) => t.value !== 'select');
  protected readonly newExtra = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    type: new FormControl<FieldType>('text', { nonNullable: true }),
  });

  /** Link do post no site do blog — só para o que está salvo e publicado. Pressupõe rotas /:slug no site. */
  protected readonly publicPostUrl = computed(() => {
    const publicUrl = this.blog()?.publicUrl;
    const post = this.post();
    return publicUrl && post?.status === 'published' ? `${publicUrl.replace(/\/+$/, '')}/${post.slug}` : '';
  });

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

    let post: Post | null = null;
    if (!this.isNew()) {
      post = await this.postsService.get(this.blogId(), this.postId());
      if (!post) return this.error.set('Post não encontrado.');
      this.post.set(post);
      const { title, subtitle, slug, summary, coverUrl, tags, status, body } = post;
      this.form.setValue({ title, subtitle, slug, summary, coverUrl, tags: tags.join(', '), status });
      this.body.set(body);
    }

    const postDefs = blog.fieldDefs.filter((d) => d.scope === 'post');
    this.postDefs.set(postDefs);
    this.customForm.set(buildFieldsGroup(postDefs, post?.custom ?? {}));
    const extras = post?.extras ?? [];
    const extraDefs = extras.map(({ key, label, type }) => this.extraDef(key, label, type));
    this.extraDefs.set(extraDefs);
    this.extrasForm.set(buildFieldsGroup(extraDefs, Object.fromEntries(extras.map((e) => [e.key, e.value]))));

    if (!this.canWrite()) {
      this.form.disable();
      this.customForm().disable();
      this.extrasForm().disable();
    }
    this.ready.set(true);
  }

  hasUnsavedChanges() {
    return (
      this.canWrite() &&
      (this.form.dirty || this.customForm().dirty || this.extrasForm().dirty || this.bodyDirty())
    );
  }

  protected invalid() {
    return this.form.invalid || this.customForm().invalid || this.extrasForm().invalid;
  }

  protected addExtra() {
    const { label, type } = this.newExtra.getRawValue();
    const taken = new Set([...this.postDefs(), ...this.extraDefs()].map((d) => d.key));
    let key = fieldKey(label);
    for (let i = 2; taken.has(key); i++) key = `${fieldKey(label)}_${i}`;
    const def = this.extraDef(key, label.trim(), type);
    this.extrasForm().addControl(key, buildFieldsGroup([def], {}).controls[key]);
    this.extraDefs.update((defs) => [...defs, def]);
    this.extrasForm().markAsDirty();
    this.newExtra.reset();
  }

  protected removeExtra(key: string) {
    this.extrasForm().removeControl(key);
    this.extraDefs.update((defs) => defs.filter((d) => d.key !== key));
    this.extrasForm().markAsDirty();
  }

  private extraDef(key: string, label: string, type: FieldType): FieldDef {
    return { key, label, type, required: false, options: [], scope: 'post' };
  }

  protected titleChanged() {
    const slug = this.form.controls.slug;
    if (this.isNew() && !slug.dirty) slug.setValue(slugify(this.form.controls.title.value).slice(0, 150));
  }

  protected async save() {
    const { tags, ...fields } = this.form.getRawValue();
    const extrasValues = readFieldsGroup(this.extraDefs(), this.extrasForm());
    const input: PostInput = {
      ...fields,
      tags: parseTags(tags),
      body: this.body(),
      custom: readFieldsGroup(this.postDefs(), this.customForm()),
      extras: this.extraDefs().map(({ key, label, type }) => ({ key, label, type, value: extrasValues[key] })),
    };
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
      this.customForm().markAsPristine();
      this.extrasForm().markAsPristine();
      this.bodyDirty.set(false);
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
      this.form.markAsPristine();
      this.customForm().markAsPristine();
      this.extrasForm().markAsPristine();
      this.bodyDirty.set(false);
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
