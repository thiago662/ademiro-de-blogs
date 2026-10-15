import { FormControl, FormGroup, FormRecord, ValidatorFn, Validators } from '@angular/forms';
import { slugify } from './slug';

export type FieldType = 'text' | 'textarea' | 'markdown' | 'number' | 'boolean' | 'date' | 'url' | 'select' | 'tags';
export type FieldScope = 'blog' | 'post';

/** Definição de campo customizado. Ordem = posição no array. */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  scope: FieldScope;
}

/** Campo avulso de um único post: definição e valor juntos. */
export interface ExtraField {
  key: string;
  label: string;
  type: FieldType;
  value: unknown;
}

export const fieldTypes: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'date', label: 'Data' },
  { value: 'url', label: 'URL (https)' },
  { value: 'select', label: 'Lista de opções' },
  { value: 'tags', label: 'Tags' },
];

export const FIELD_KEY = /^[a-z][a-z0-9_]*$/;

/** "Nível de dificuldade" → "nivel_de_dificuldade" */
export function fieldKey(label: string): string {
  const key = slugify(label).replace(/-/g, '_').slice(0, 50);
  return /^[a-z]/.test(key) ? key : `campo_${key}`.replace(/_$/, '');
}

/** "Angular, angular , RxJS" → ['angular', 'rxjs'] */
export function parseTags(text: string): string[] {
  return [...new Set(text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

function toFormValue(type: FieldType, value: unknown): string | boolean {
  if (type === 'boolean') return value === true;
  if (type === 'tags') return Array.isArray(value) ? value.join(', ') : '';
  return value == null ? '' : String(value);
}

function fromFormValue(type: FieldType, value: string | boolean): unknown {
  if (type === 'boolean') return value === true;
  const text = String(value).trim();
  if (type === 'tags') return parseTags(text);
  if (type === 'number') return text === '' ? null : Number(text.replace(',', '.'));
  return text;
}

function validatorsFor(def: Pick<FieldDef, 'type' | 'required'>): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (def.required && def.type !== 'boolean') validators.push(Validators.required);
  if (def.type === 'url') validators.push(Validators.pattern(/^(https:\/\/.+)?$/));
  if (def.type === 'number') validators.push(Validators.pattern(/^-?\d+([.,]\d+)?$/));
  if (def.type === 'text' || def.type === 'url') validators.push(Validators.maxLength(1000));
  return validators;
}

export type FieldsGroup = FormRecord<FormControl<string | boolean>>;

/** Um FormControl por campo, já com valores iniciais e validação. */
export function buildFieldsGroup(defs: Pick<FieldDef, 'key' | 'type' | 'required'>[], values: Record<string, unknown>) {
  const group: FieldsGroup = new FormRecord({});
  for (const def of defs) {
    group.addControl(
      def.key,
      new FormControl(toFormValue(def.type, values[def.key]), { nonNullable: true, validators: validatorsFor(def) }),
    );
  }
  return group;
}

/** Lê o grupo de volta já convertido; só as chaves definidas (campo removido some do doc). */
export function readFieldsGroup(defs: Pick<FieldDef, 'key' | 'type'>[], group: FormGroup): Record<string, unknown> {
  const raw = group.getRawValue() as Record<string, string | boolean>;
  return Object.fromEntries(defs.map((def) => [def.key, fromFormValue(def.type, raw[def.key] ?? '')]));
}
