import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Blog, BlogRole, BlogsService } from '../core/blogs.service';
import {
  FIELD_KEY,
  FieldDef,
  FieldScope,
  FieldType,
  FieldsGroup,
  buildFieldsGroup,
  fieldKey,
  fieldTypes,
  readFieldsGroup,
} from '../core/fields';
import { CustomFields } from '../posts/custom-fields';

type DefForm = FormGroup<{
  key: FormControl<string>;
  label: FormControl<string>;
  type: FormControl<FieldType>;
  required: FormControl<boolean>;
  options: FormControl<string>;
  scope: FormControl<FieldScope>;
}>;

function defForm(def?: FieldDef): DefForm {
  return new FormGroup({
    key: new FormControl(def?.key ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50), Validators.pattern(FIELD_KEY)],
    }),
    label: new FormControl(def?.label ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    type: new FormControl<FieldType>(def?.type ?? 'text', { nonNullable: true }),
    required: new FormControl(def?.required ?? false, { nonNullable: true }),
    options: new FormControl(def?.options.join(', ') ?? '', { nonNullable: true }),
    scope: new FormControl<FieldScope>(def?.scope ?? 'post', { nonNullable: true }),
  });
}

@Component({
  selector: 'app-blog-settings',
  imports: [ReactiveFormsModule, RouterLink, CustomFields],
  templateUrl: './blog-settings.html',
})
export class BlogSettings implements OnInit {
  private readonly blogsService = inject(BlogsService);

  readonly blogId = input.required<string>();

  protected readonly blog = signal<Blog | null>(null);
  protected readonly role = signal<BlogRole | null>(null);
  protected readonly defsForm = new FormArray<DefForm>([]);
  protected readonly blogDefs = signal<FieldDef[]>([]);
  protected readonly settingsForm = signal<FieldsGroup>(buildFieldsGroup([], {}));
  protected readonly loading = signal(false);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly fieldTypes = fieldTypes;

  protected readonly isAdmin = computed(() => this.role() === 'admin');
  protected readonly canEditSettings = computed(() => this.role() === 'admin' || this.role() === 'editor');

  async ngOnInit() {
    const blog = await this.blogsService.get(this.blogId());
    if (!blog) return this.message.set({ ok: false, text: 'Blog não encontrado.' });
    this.role.set(await this.blogsService.roleIn(blog));
    this.load(blog);
  }

  protected addField() {
    this.defsForm.push(defForm());
  }

  protected labelChanged(row: DefForm) {
    if (!row.controls.key.dirty) row.controls.key.setValue(fieldKey(row.controls.label.value));
  }

  protected move(index: number, delta: number) {
    const row = this.defsForm.at(index);
    this.defsForm.removeAt(index);
    this.defsForm.insert(index + delta, row);
  }

  protected async saveDefs() {
    const defs: FieldDef[] = this.defsForm.getRawValue().map((d) => ({
      ...d,
      options: d.type === 'select' ? [...new Set(d.options.split(',').map((o) => o.trim()).filter(Boolean))] : [],
    }));
    const keys = defs.map((d) => d.key);
    if (new Set(keys).size !== keys.length) {
      return this.message.set({ ok: false, text: 'Há campos com a mesma chave.' });
    }
    if (defs.some((d) => d.type === 'select' && !d.options.length)) {
      return this.message.set({ ok: false, text: 'Campos do tipo lista precisam de opções.' });
    }
    await this.run('Campos salvos.', () => this.blogsService.saveFieldDefs(this.blogId(), defs));
  }

  protected async saveSettings() {
    const settings = readFieldsGroup(this.blogDefs(), this.settingsForm());
    await this.run('Valores salvos.', () => this.blogsService.saveSettings(this.blogId(), settings));
  }

  private load(blog: Blog) {
    this.blog.set(blog);
    this.defsForm.clear();
    blog.fieldDefs.forEach((def) => this.defsForm.push(defForm(def)));
    if (!this.isAdmin()) this.defsForm.disable();

    const blogDefs = blog.fieldDefs.filter((d) => d.scope === 'blog');
    this.blogDefs.set(blogDefs);
    const settingsForm = buildFieldsGroup(blogDefs, blog.settings);
    if (!this.canEditSettings()) settingsForm.disable();
    this.settingsForm.set(settingsForm);
  }

  private async run(success: string, action: () => Promise<void>) {
    this.loading.set(true);
    this.message.set(null);
    try {
      await action();
      this.load((await this.blogsService.get(this.blogId()))!);
      this.message.set({ ok: true, text: success });
    } catch {
      this.message.set({ ok: false, text: 'Não foi possível salvar.' });
    } finally {
      this.loading.set(false);
    }
  }
}
