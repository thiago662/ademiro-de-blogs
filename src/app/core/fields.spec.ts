import { FieldDef, buildFieldsGroup, fieldKey, parseTags, readFieldsGroup } from './fields';

const def = (key: string, type: FieldDef['type'], required = false): FieldDef => ({
  key,
  label: key,
  type,
  required,
  options: [],
  scope: 'post',
});

describe('campos customizados', () => {
  it('ida e volta preserva tipos', () => {
    const defs = [def('a', 'text'), def('n', 'number'), def('b', 'boolean'), def('t', 'tags'), def('d', 'date')];
    const values = { a: 'olá, mundo', n: 3.5, b: true, t: ['x', 'y'], d: '2026-10-10', removido: 'some' };
    expect(readFieldsGroup(defs, buildFieldsGroup(defs, values))).toEqual({
      a: 'olá, mundo',
      n: 3.5,
      b: true,
      t: ['x', 'y'],
      d: '2026-10-10',
    });
  });

  it('número aceita vírgula e vazio vira null', () => {
    const defs = [def('n', 'number'), def('m', 'number')];
    const group = buildFieldsGroup(defs, {});
    group.setValue({ n: '2,5', m: '' });
    expect(readFieldsGroup(defs, group)).toEqual({ n: 2.5, m: null });
  });

  it('valida obrigatório e url https', () => {
    const defs = [def('r', 'text', true), def('u', 'url')];
    const group = buildFieldsGroup(defs, { u: 'http://inseguro' });
    expect(group.controls['r'].valid).toBe(false);
    expect(group.controls['u'].valid).toBe(false);
  });

  it('gera chave válida a partir do rótulo', () => {
    expect(fieldKey('Nível de dificuldade')).toBe('nivel_de_dificuldade');
    expect(fieldKey('2º autor')).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('parseTags normaliza e remove duplicadas', () => {
    expect(parseTags(' Angular, angular ,, RxJS ,')).toEqual(['angular', 'rxjs']);
  });
});
