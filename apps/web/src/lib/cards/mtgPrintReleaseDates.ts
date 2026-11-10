import 'server-only';
import { loadMtgPrintReleaseDatesV1, findMtgPrintReleaseCandidateIdsV1, type ReleaseReadClient } from '../../../../../backend/catalog/mtg_print_release_service_v1.mjs';
import { createServerAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

export type IndividualPrintDate = {
  release_date: string | null;
  release_year: number | null;
  release_date_scope: 'individual_print';
  release_date_source?: 'scryfall';
};

// Called only with candidates obtained through the request's public catalog
// reads. The backend rechecks visibility and current identity/source ownership.
export async function withMtgPrintReleaseDates<T extends { id: string }>(
  client: SupabaseClient,
  rows: T[],
): Promise<Array<T & IndividualPrintDate>> {
  if (!rows.length) return [];
  // Both are real SDK clients; use their structural read surface across the
  // independent web/backend lockfiles without comparing private SDK members.
  const dates = await loadMtgPrintReleaseDatesV1(client as unknown as ReleaseReadClient,
    createServerAdminClient() as unknown as ReleaseReadClient, rows.map(row => row.id));
  return rows.map(row => ({ ...row, release_date: null, release_year: null,
    release_date_scope: 'individual_print' as const, ...dates.get(row.id) }));
}

// Display-only consumers can retain the rest of a card when optional date
// evidence is unavailable. Keep an explicit unknown individual-print scope;
// never replace it with the collection's launch date. Search remains strict.
export async function getMtgCardReleaseDates(
  client: SupabaseClient,
  rows: Array<{ id: string | null; identity_domain: string | null }>,
): Promise<Map<string, IndividualPrintDate>> {
  const ids = [...new Set(rows.filter(row => row.identity_domain === 'mtg_eng_paper_print')
    .map(row => row.id).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return new Map();
  try {
    const dates = await withMtgPrintReleaseDates(client, ids.map(id => ({ id })));
    return new Map(dates.map(date => [date.id, date]));
  } catch {
    console.error('[catalog-release-date] optional current print dates unavailable', {
      code: 'MTG_PRINT_RELEASE_READ_UNAVAILABLE', card_count: ids.length,
    });
    return new Map(ids.map(id => [id, { release_date: null, release_year: null,
      release_date_scope: 'individual_print' as const }]));
  }
}

// Only public fields obtained with the request's own client leave this helper.
// The private candidate IDs are never an authorization or a search result.
export async function fetchMtgPrintDateCandidates(
  client: SupabaseClient,
  selectClause: string,
  range: { minYear?: number; maxYear?: number; setCodes?: string[] },
): Promise<unknown[]> {
  const ids = await findMtgPrintReleaseCandidateIdsV1(createServerAdminClient() as unknown as ReleaseReadClient, range);
  const rows: unknown[] = [];
  for (let offset = 0; offset < ids.length; offset += 640) {
    const chunks = Array.from({ length: Math.min(4, Math.ceil((ids.length - offset) / 160)) }, (_, n) => ids.slice(offset + n * 160, offset + (n + 1) * 160));
    const results = await Promise.all(chunks.map(async chunk => {
      const { data, error } = await client.from('v_card_prints_discovery_v1')
        .select(selectClause).in('id', chunk).order('id').range(0, 159);
      if (error) throw new Error('Visible print release date candidates could not be checked. Try again.');
      return data ?? [];
    }));
    rows.push(...results.flat());
  }
  return rows;
}
