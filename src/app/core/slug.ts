/** "Olá, Mundo!" → "ola-mundo". Mesmo formato que as rules aceitam: ^[a-z0-9]+(-[a-z0-9]+)*$ */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/, '');
}
