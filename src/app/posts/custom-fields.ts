import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FieldDef } from '../core/fields';
import { MarkdownEditor } from './markdown-editor';

/** Renderiza um FormGroup criado por buildFieldsGroup, um input por tipo de campo. */
@Component({
  selector: 'app-custom-fields',
  imports: [ReactiveFormsModule, MarkdownEditor],
  templateUrl: './custom-fields.html',
})
export class CustomFields {
  readonly defs = input.required<Pick<FieldDef, 'key' | 'label' | 'type' | 'required' | 'options'>[]>();
  readonly group = input.required<FormGroup>();
  readonly readonly = input(false);
  /** Mostra botão de remover em cada campo (usado nos campos avulsos do post). */
  readonly removable = input(false);
  readonly remove = output<string>();
}
