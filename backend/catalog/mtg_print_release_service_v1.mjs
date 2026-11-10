import { readMtgPrintReleaseV1 } from './mtg_print_release_read_v1.mjs';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

const PARENT_FIELDS = 'id,gv_id,name,number,set_code,identity_domain,variant_key,print_identity_key,printed_identity_modifier,set_identity_model,external_ids,ai_metadata';
const IDENTITY_FIELDS = 'id,card_print_id,is_active,identity_domain,identity_key_version,identity_key_hash,set_code_identity,printed_number,identity_payload';

// Private candidate narrowing only. IDs must subsequently pass the request's
// public catalog visibility and readMtgPrintReleaseV1; this is not a public read
// model. Avoid expensive public RLS evaluation over every nonmatching print.
export async function findMtgPrintReleaseCandidateIdsV1(backendClient, { minYear, maxYear, setCodes = [] }) {
  if ((minYear === undefined && maxYear === undefined) ||
      [minYear, maxYear].some(year => year !== undefined && (!Number.isInteger(year) || year < 1 || year > 9998)) ||
      (minYear !== undefined && maxYear !== undefined && minYear > maxYear)) {
    throw new Error('Print release year range is invalid.');
  }
  const ids = [];
  for (;;) {
    let query = backendClient.from('card_prints').select('id')
      .eq('identity_domain', 'mtg_eng_paper_print')
      .eq('ai_metadata->mtg_print_details_v1->>verification_status', 'source_supported');
    if (minYear !== undefined) query = query.gte('ai_metadata->mtg_print_details_v1->>source_released_at', `${String(minYear).padStart(4, '0')}-01-01`);
    if (maxYear !== undefined) query = query.lt('ai_metadata->mtg_print_details_v1->>source_released_at', `${String(maxYear + 1).padStart(4, '0')}-01-01`);
    if (setCodes.length) query = query.in('set_code', setCodes);
    // Advance the UUID boundary rather than rescanning every prior JSON date
    // match for an increasing OFFSET on a rolling collection.
    if (ids.length) query = query.gt('id', ids.at(-1));
    const { data, error } = await query.order('id').range(0, 499);
    if (error) throw new Error('Print release date candidates could not be checked. Try again.');
    const page = data ?? [];
    for (const row of page) {
      if (!uuid(row.id) || (ids.length && row.id <= ids.at(-1))) throw new Error('Print release date candidates could not be checked completely.');
      ids.push(row.id);
    }
    if (ids.length > 20000) throw new Error('Print release date scope is too broad. Narrow the search.');
    if (page.length < 500) return ids;
  }
}

async function pages(query) {
  const result = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query().order('id').range(offset, offset + 499);
    if (error) throw new Error('Print release dates could not be verified. Try again.');
    const page = data ?? [];
    result.push(...page);
    if (page.length < 500) return result;
    if (offset >= 10000) throw new Error('Print release evidence is too broad to verify. Narrow the search.');
  }
}

// The caller supplies a request-scoped public client and a trusted backend
// client. Recheck public visibility BEFORE any privileged read; return only the
// narrow date projection, never private mappings, raw records or metadata.
export async function loadMtgPrintReleaseDatesV1(publicClient, backendClient, cardPrintIds) {
  const ids = [...new Set(cardPrintIds)];
  if (ids.some(id => !uuid(id)) || ids.length > 20000) {
    throw new Error('Print release date scope is invalid or too broad. Narrow the search.');
  }
  const result = new Map();
  // 160 UUIDs plus these bounded projections stay below the 8 KB GET limit.
  // Overlap only four chunks; child image embeds retain their smaller batches.
  const chunks = Array.from({ length: Math.ceil(ids.length / 160) }, (_, n) => ids.slice(n * 160, (n + 1) * 160));
  async function loadChunk(chunk) {
    const visible = await pages(() => publicClient.from('v_card_prints_discovery_v1')
      .select('id').eq('identity_domain', 'mtg_eng_paper_print').in('id', chunk));
    const visibleIds = visible.map(p => p.id).filter(id => chunk.includes(id));
    if (!visibleIds.length) return;
    const [parents, identities] = await Promise.all([
      pages(() => backendClient.from('card_prints').select(PARENT_FIELDS).in('id', visibleIds)),
      pages(() => backendClient.from('card_print_identity').select(IDENTITY_FIELDS)
        .eq('is_active', true).in('card_print_id', visibleIds)),
    ]);
    const sourceIds = [...new Set(parents.map(p => p.ai_metadata?.mtg_print_details_v1?.source_print_id).filter(uuid))];
    const owners = sourceIds.length ? await pages(() => backendClient.from('external_mappings')
      .select('id,source,external_id,card_print_id,active,meta').eq('source', 'scryfall')
      .eq('active', true).in('external_id', sourceIds)) : [];
    for (const parent of parents) {
      if (!visibleIds.includes(parent.id)) continue;
      const date = readMtgPrintReleaseV1(parent,
        identities.filter(i => i.card_print_id === parent.id),
        owners.filter(m => m.external_id === parent.ai_metadata?.mtg_print_details_v1?.source_print_id));
      if (date) result.set(parent.id, date);
    }
  }
  for (let n = 0; n < chunks.length; n += 4) {
    await Promise.all(chunks.slice(n, n + 4).map(loadChunk));
  }
  return result;
}
