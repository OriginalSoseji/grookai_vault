import { createHash } from 'node:crypto';
import { parseOfficialJapaneseCardDetail } from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs';

// Each accepted assertion is reparsed from the original official response.
// Incomplete, conflicting or non-official evidence cannot assert a name.
export function officialJapaneseNamesByCoordinateV1(snapshots, setCode, normalizeCoordinate) {
  if (!Array.isArray(snapshots) || typeof normalizeCoordinate !== 'function') return new Map();
  const names = new Map();
  for (const snapshot of snapshots) {
    try {
      const url = new URL(snapshot.request_url);
      const finalUrl = new URL(snapshot.final_url);
      const match = url.pathname.match(/^\/card-search\/details\.php\/card\/(\d+)\/regu\/all$/);
      if (url.origin !== 'https://www.pokemon-card.com' || url.search || url.hash || !match ||
          finalUrl.origin !== url.origin || finalUrl.pathname !== url.pathname || finalUrl.search || finalUrl.hash ||
          snapshot.http_status !== 200 || typeof snapshot.body !== 'string' ||
          createHash('sha256').update(snapshot.body).digest('hex') !== snapshot.body_sha256) continue;
      const card = parseOfficialJapaneseCardDetail(snapshot.body, match[1]);
      const coordinate = normalizeCoordinate(card.card_number_raw);
      if (card.source_set_code?.toUpperCase() !== setCode || !coordinate || !card.printed_name) continue;
      const candidates = names.get(coordinate) ?? { names: new Set(), refs: [] };
      candidates.names.add(card.printed_name.normalize('NFKC').replace(/\s+/gu, ''));
      candidates.refs.push({ url: snapshot.request_url, final_url: snapshot.final_url,
        http_status: snapshot.http_status, fetched_at: snapshot.fetched_at ?? null,
        body_sha256: snapshot.body_sha256, body: snapshot.body });
      names.set(coordinate, candidates);
    } catch {
      // Bad evidence does not turn source unavailability into a canonical fact.
    }
  }
  return names;
}

export async function collectOfficialJapaneseIdentitySnapshotsV1({ cards, cache, limit, fetchDetail, pool, isExpectedFailure }) {
  if (!Array.isArray(cards) || !(cache instanceof Map) || !Number.isInteger(limit) || limit < 1 ||
      typeof fetchDetail !== 'function' || typeof pool !== 'function' || typeof isExpectedFailure !== 'function') throw Error('INVALID_OFFICIAL_IDENTITY_COLLECTION');
  const ids = [...new Set(cards.map((card) => String(card.card_id ?? '').trim()).filter((id) => /^\d+$/.test(id)))];
  const pending = ids.filter((id) => !cache.has(id));
  if (ids.length > limit || cache.size + pending.length > limit) return [];
  await pool(pending, 4, async (id) => {
    try { cache.set(id, await fetchDetail(id)); }
    catch (error) { if (!isExpectedFailure(error)) throw error; cache.set(id, null); }
  });
  return ids.map((id) => cache.get(id)).filter(Boolean);
}
