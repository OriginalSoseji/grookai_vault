export const STORE_CATALOG_GAMES: readonly string[];
export function storeCatalogPageIds(client: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> }, query: string, offset: number): Promise<{ ids: string[]; more: boolean }>;
