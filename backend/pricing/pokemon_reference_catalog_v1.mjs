import { fetchPokemonReferenceBatchV1 } from './pokemon_reference_batch_v1.mjs';
import { fetchPokemonCardsPageViaCurl } from './pokemon_reference_http_v1.mjs';
import { isPokemonReferenceIdV1 } from './pokemon_reference_id_v1.mjs';

// Retrieve the public catalog in bounded pages, then select ONLY exact existing
// external IDs. Catalog entries never infer mappings or create canonical cards.
export async function fetchPokemonReferenceCatalogV1({ ids, onResult = () => {}, onProgress = () => {},
  fetchPage = fetchPokemonCardsPageViaCurl, ...timing } = {}) {
  if (!Array.isArray(ids) || ids.length > 5000 || new Set(ids).size !== ids.length ||
      ids.some(id => !isPokemonReferenceIdV1(id)))
    throw new Error('POKEMON_REFERENCE_INVALID_BATCH');
  const wanted = new Set(ids), seen = new Set(), cardsByExternalId = {};
  let total = null, pages = 0, broken = false;
  const failure = () => Object.assign(new Error('POKEMON_REFERENCE_INCOMPLETE_CATALOG'), { code: 'POKEMON_REFERENCE_INCOMPLETE_CATALOG' });
  const result = await fetchPokemonReferenceBatchV1({ ...timing,
    // Capacity is fixed; after the verified final page, remaining slots perform
    // no network call. Single paced worker also respects the anonymous limit.
    ids: ids.length ? Array.from({ length: 200 }, (_, n) => `page-${n + 1}`) : [], authenticated: false, stopOnFailure: true,
    fetchCard: async (key, options) => {
      if (broken) throw failure();
      const page = Number(key.slice(5));
      if (Object.keys(cardsByExternalId).length === wanted.size ||
          (total !== null && page > Math.ceil(total / 250))) return { id: key, skipped: true };
      try {
        const payload = await fetchPage(page, options);
        if (!Array.isArray(payload?.data) || payload.page !== page || payload.pageSize !== 250 ||
            !Number.isInteger(payload.totalCount) || payload.totalCount < 1 || payload.totalCount > 50000 ||
            payload.count !== payload.data.length || payload.count !== Math.min(250, payload.totalCount - (page - 1) * 250) ||
            (total !== null && payload.totalCount !== total)) throw failure();
        total ??= payload.totalCount;
        for (const card of payload.data) {
          if (!card || !isPokemonReferenceIdV1(card.id) || seen.has(card.id)) throw failure();
          seen.add(card.id);
          if (wanted.has(card.id)) cardsByExternalId[card.id] = card;
        }
        pages++;
        return { id: key, payload };
      } catch (error) { broken = true; throw error; }
    },
    onResult: row => row.card?.skipped ? undefined : onResult(row),
    onProgress: progress => onProgress({ ...progress, pages_received: pages, catalog_count: seen.size,
      expected_catalog_count: total, selected_card_count: ids.length, exact_match_count: Object.keys(cardsByExternalId).length }),
  });
  const catalogComplete = total !== null && seen.size === total && pages === Math.ceil(total / 250);
  const allFound = Object.keys(cardsByExternalId).length === wanted.size;
  return { ...result, cardsByExternalId, pages_received: pages, catalog_count: seen.size, expected_catalog_count: total,
    selected_card_count: ids.length, exact_match_count: Object.keys(cardsByExternalId).length,
    catalog_scan_complete: catalogComplete, all_requested_ids_found: allFound,
    complete: result.complete && (allFound || catalogComplete) };
}
