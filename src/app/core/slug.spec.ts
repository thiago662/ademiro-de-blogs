import { slugify } from './slug';

describe('slugify', () => {
  it('remove acentos, pontuação e espaços', () => {
    expect(slugify('  Olá, Mundo! Ação & Reação  ')).toBe('ola-mundo-acao-reacao');
  });

  it('gera slug aceito pelas rules', () => {
    for (const s of ['---', 'Café', 'a'.repeat(99) + ' b', 'C++ e C#']) {
      const slug = slugify(s);
      expect(slug === '' || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)).toBe(true);
      expect(slug.length).toBeLessThanOrEqual(100);
    }
  });
});
