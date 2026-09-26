// Each page advances the same 20-row window in every supported game. Retain
// every row in those windows; globally truncating the merge would skip results.
export const STORE_CATALOG_GAMES = ['pokemon', 'mtg', 'one_piece'];
export async function storeCatalogPageIds(client, query, offset) {
  const pages = await Promise.all(STORE_CATALOG_GAMES.map(async game => {
    const { data, error } = await client.rpc('search_game_card_prints_v4', {
      game_code_in: game, q: query, set_code_in: null, number_in: null,
      illustrator_in: null, language_scope_in: 'all', limit_in: 21, offset_in: offset,
    });
    if (error || !Array.isArray(data)) throw new Error('Catalog search unavailable.');
    return data;
  }));
  return {
    ids: [...new Set(pages.flatMap(page => page.slice(0, 20).map(row => row.id)))],
    more: pages.some(page => page.length > 20),
  };
}
