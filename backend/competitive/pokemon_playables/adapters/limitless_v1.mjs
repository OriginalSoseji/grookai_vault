import { setTimeout as delay } from 'node:timers/promises';
import { assert, boundedArray, digest, reviewValid, safeId, sha256, text, timestamp } from '../common.mjs';
import { acquireApprovedReceipt } from '../acquire.mjs';

const ORIGIN = 'https://play.limitlesstcg.com';

function verifyOriginal(snapshot, url, asOf) {
  assert(snapshot?.url === url && typeof snapshot.body_text === 'string' &&
    sha256(snapshot.body_text) === snapshot.body_sha256 && timestamp(snapshot.observed_at) <= asOf, 'LIMITLESS_ORIGINAL_RESPONSE_REQUIRED');
}

// A deliberately narrow, versioned source marker. Layout changes fail closed.
// Strip inert/raw-text content before looking for an actual standings container.
export function hasCompletedStandings(body) {
  const html = body.replace(/<!--[\s\S]*?(?:-->|$)/g, '')
    .replace(/<(script|style|textarea|template)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '');
  const containers = [...html.matchAll(/<div\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)].flatMap(match => {
    const attributes = [...match[0].slice(4, -1).matchAll(/([^\s=<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)]
      .filter(attribute => attribute[1].toLowerCase() === 'class');
    if (attributes.length !== 1) return [];
    const classes = (attributes[0][2] ?? attributes[0][3] ?? attributes[0][4] ?? '').split(/\s+/);
    return classes.includes('standings') ? [classes] : [];
  });
  return containers.length === 1 && containers[0].includes('completed') &&
    !containers[0].some(value => ['ongoing', 'active', 'unfinished'].includes(value));
}

export function normalizeLimitlessCapture(capture, policy, asOf) {
  assert(capture?.version === 'pokemon_playables_limitless_capture:v1', 'LIMITLESS_CAPTURE_VERSION');
  assert(/^[a-f0-9]{24}$/.test(capture.event_id), 'LIMITLESS_EVENT_ID');
  const review = capture.event_review;
  assert(reviewValid(review, asOf, policy), 'LIMITLESS_EVENT_REVIEW_REQUIRED');
  safeId(review.event_key); safeId(review.ruleset_id);
  assert(['complete', 'ongoing', 'canceled', 'withdrawn', 'unverified'].includes(review.event_status), 'LIMITLESS_EVENT_STATUS_REVIEW');
  assert(['full_field', 'top_cut', 'published_subset'].includes(review.population), 'LIMITLESS_POPULATION_REVIEW');
  assert(review.top_cut_size === null || Number.isInteger(review.top_cut_size) && review.top_cut_size >= 0 && review.top_cut_size <= 1024, 'LIMITLESS_TOP_CUT_REVIEW');
  assert(Number.isInteger(review.revision) && review.revision >= 0, 'LIMITLESS_REVISION');
  for (const [key, endpoint] of [['details', 'details'], ['standings', 'standings']]) {
    verifyOriginal(capture[key], `${ORIGIN}/api/tournaments/${capture.event_id}/${endpoint}`, asOf);
  }
  if (capture.standings_page) verifyOriginal(capture.standings_page, `${ORIGIN}/tournament/${capture.event_id}/standings`, asOf);
  if (capture.pairings) verifyOriginal(capture.pairings, `${ORIGIN}/api/tournaments/${capture.event_id}/pairings`, asOf);
  if (review.event_status === 'complete') {
    assert(capture.standings_page && hasCompletedStandings(capture.standings_page.body_text), 'LIMITLESS_COMPLETION_PROOF_REQUIRED');
  }
  let details, standings;
  try { details = JSON.parse(capture.details.body_text); standings = JSON.parse(capture.standings.body_text); }
  catch { assert(false, 'LIMITLESS_RESPONSE_JSON'); }
  assert(details.id === capture.event_id && details.game === 'PTCG' && details.format === 'STANDARD' &&
    details.isPublic === true && typeof details.isOnline === 'boolean' && !details.multideck &&
    (!details.bannedCards || details.bannedCards.length === 0) && (!details.specialRules || details.specialRules.length === 0), 'LIMITLESS_EVENT_SCOPE');
  assert(Number.isInteger(details.players) && details.players > 0, 'LIMITLESS_PARTICIPANTS');
  timestamp(details.date);
  const rows = boundedArray(standings, policy.maximum_decks_per_event), decks = [];
  const participants = new Set(rows.map(row => text(row.player)));
  assert(participants.size === rows.length, 'LIMITLESS_DUPLICATE_ENTRY');
  const played = new Map();
  if (capture.pairings) {
    let pairs;
    try { pairs = JSON.parse(capture.pairings.body_text); } catch { assert(false, 'LIMITLESS_RESPONSE_JSON'); }
    const seen = new Set();
    for (const pair of boundedArray(pairs, policy.maximum_decks_per_event * 100)) {
      assert(Number.isInteger(pair.phase) && pair.phase > 0 && Number.isInteger(pair.round) && pair.round > 0, 'LIMITLESS_PAIRING_SCOPE');
      assert(participants.has(pair.player1) && (!pair.player2 || participants.has(pair.player2)), 'LIMITLESS_PAIRING_ENTRY');
      if (!pair.player2 || pair.winner === -1) continue; // byes, tardiness and double losses are not proof of play
      assert(pair.player1 !== pair.player2 && [pair.player1, pair.player2, 0].includes(pair.winner), 'LIMITLESS_PAIRING_RESULT');
      const key = digest([pair.phase, pair.round, ...[pair.player1, pair.player2].sort(), pair.match ?? null]);
      assert(!seen.has(key), 'LIMITLESS_DUPLICATE_PAIRING'); seen.add(key);
      for (const player of [pair.player1, pair.player2]) played.set(player, (played.get(player) ?? 0) + 1);
    }
  }
  for (const row of rows) {
    if (row.decklist == null) continue;
    text(row.player);
    assert(row.placing == null || Number.isInteger(row.placing) && row.placing > 0, 'LIMITLESS_PLACING');
    assert(row.decklist && !Array.isArray(row.decklist) && typeof row.decklist === 'object', 'LIMITLESS_DECK_OBJECT');
    assert(Object.keys(row.decklist).every(key => ['pokemon', 'trainer', 'energy'].includes(key)), 'LIMITLESS_DECK_SECTION');
    const cards = [];
    for (const section of ['pokemon', 'trainer', 'energy']) {
      for (const card of boundedArray(row.decklist[section] ?? [], 60)) {
        const quantity = typeof card.count === 'string' && /^\d+$/.test(card.count) ? Number(card.count) : card.count;
        assert(Number.isInteger(quantity) && quantity > 0 && quantity <= 60, 'LIMITLESS_QUANTITY');
        cards.push({ set: text(card.set), number: text(String(card.number)), name: text(card.name), quantity, section });
      }
    }
    // Standings wins may include byes. Only source pairings with an opponent prove a match.
    const playedMatches = capture.pairings ? played.get(row.player) ?? 0 : null;
    decks.push({ entry_key: `entry-${sha256(`${capture.event_id}|${row.player}`).slice(0, 24)}`,
      placing: row.placing ?? null, played_matches: playedMatches,
      top_cut: review.top_cut_size === null || row.placing == null ? null : review.top_cut_size > 0 && row.placing <= review.top_cut_size, cards });
  }
  return { version: 'pokemon_playables_event_export:v1', events: [{ event_key: review.event_key, source_event_id: capture.event_id,
    revision: review.revision, status: review.event_status, game: 'pokemon', format: 'standard', ruleset_id: review.ruleset_id,
    played_at: details.date, online: details.isOnline, participant_count: details.players, population: review.population, decks }] };
}

export async function captureLimitlessEvent({ request, source, policy, observedAt, fetchImpl }) {
  assert(/^[a-f0-9]{24}$/.test(request.event_id), 'LIMITLESS_EVENT_ID');
  assert(source.adapter === 'limitless_event_v1' && reviewValid(request.event_review, timestamp(observedAt), policy), 'LIMITLESS_EVENT_REVIEW_REQUIRED');
  const snapshots = {};
  assert(request.capture_completion === undefined || typeof request.capture_completion === 'boolean', 'LIMITLESS_COMPLETION_OPTION');
  const endpoints = ['details', 'standings', 'pairings', ...(request.capture_completion ? ['standings_page'] : [])];
  for (const endpoint of endpoints) {
    if (endpoint !== 'details') await delay(Math.max(1000, source.request_interval_ms ?? 1000));
    const result = await acquireApprovedReceipt({ source, policy, observedAt, fetchImpl,
      request: { id: `${request.id}-${endpoint}`, kind: 'tournament', url: endpoint === 'standings_page'
        ? `${ORIGIN}/tournament/${request.event_id}/standings` : `${ORIGIN}/api/tournaments/${request.event_id}/${endpoint}` } });
    snapshots[endpoint] = { url: result.receipt.url, observed_at: result.receipt.observed_at,
      body_text: result.receipt.body_text, body_sha256: result.receipt.body_sha256 };
  }
  const capture = { version: 'pokemon_playables_limitless_capture:v1', event_id: request.event_id, event_review: request.event_review, ...snapshots };
  const bodyText = JSON.stringify(capture);
  const receipt = { id: request.id, source_id: source.id, kind: 'tournament', url: `${ORIGIN}/tournament/${request.event_id}`,
    observed_at: observedAt, body_text: bodyText, body_sha256: sha256(bodyText) };
  return { receipt, acquisition_hash: digest(receipt) };
}
