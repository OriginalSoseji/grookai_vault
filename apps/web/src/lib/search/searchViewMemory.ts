// Navigation state only: never cache cards, pricing, ownership, or account data.
const views = new Map<string, { count: number; scrollY: number }>();
export function readSearchView(key: string) { return views.get(key); }
export function rememberSearchView(key: string, count: number, scrollY: number) {
  views.delete(key);
  views.set(key, { count, scrollY });
  if (views.size > 20) views.delete(views.keys().next().value!);
}
