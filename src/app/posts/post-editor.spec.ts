import { parseTags } from './post-editor';

describe('parseTags', () => {
  it('normaliza, remove vazios e duplicadas', () => {
    expect(parseTags(' Angular, angular ,, RxJS ,')).toEqual(['angular', 'rxjs']);
  });

  it('texto vazio vira lista vazia', () => {
    expect(parseTags('')).toEqual([]);
  });
});
