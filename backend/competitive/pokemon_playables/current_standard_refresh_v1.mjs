import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {admittedSourceUrl, assert, boundedArray, collectorNumber, DAY_MS, digest, EngineError, mapUnique, normalize, safeFailure, sha256, timestamp} from './common.mjs';
import {aliasKey} from './evidence.mjs';
import {tcgdexGameplayProposal} from './cohort.mjs';
import {gameplayMetadataHints} from './gameplay_decisions_v1.mjs';
import {readTcgdexProfileReceipt} from './tcgdex_profile_receipt_v1.mjs';
import {readTcgdexSetReceipt} from './tcgdex_set_receipt_v1.mjs';
import {hasCompletedStandings} from './adapters/limitless_v1.mjs';
import {createLimitlessPublishedProposal, readLimitlessPublishedLists} from './adapters/limitless_published_decklists_v1.mjs';
import {publishCurrentStandardUsage} from './current_standard_worker_v1.mjs';

export const REFRESH_SEED_KEY = 'standard-usage/refresh-seed.json';
const ORIGIN = 'https://play.limitlesstcg.com';
const ref = receipt => ({id: receipt.id, receipt_hash: digest(receipt)});
const pending = () => ({status: 'pending'});
const labels = set => [...new Set([set.id, set.tcgOnline,
  typeof set.abbreviation === 'string' ? set.abbreviation : set.abbreviation?.official].filter(value => typeof value === 'string'))];

export function sourceRateDelay(headers, now) {
  // Current Limitless headers use the structured r/t form (remaining/reset).
  // Also accept the older separate delta-seconds headers.
  const combined = headers.get('ratelimit') ?? '';
  const remaining = Number(/(?:^|[;,])\s*r=(\d+)/.exec(combined)?.[1] ?? headers.get('ratelimit-remaining'));
  const reset = Number(/(?:^|[;,])\s*t=(\d+)/.exec(combined)?.[1] ?? headers.get('ratelimit-reset'));
  const retry = headers.get('retry-after');
  const retryMs = retry == null ? 0 : /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - now);
  const paced = Number.isFinite(remaining) && remaining >= 0 && Number.isFinite(reset) && reset > 0 && reset <= 3600
    ? Math.ceil(reset * 1000 / (remaining + 1)) + 250 : 0;
  return Math.max(Number.isFinite(retryMs) ? retryMs : 0, paced);
}

// Seed only known metadata/canonical provider coordinates. Positive flags and
// historical event evidence are deliberately not carried into a new run.
export function createStandardUsageRefreshSeed(input, asOf) {
  assert(input?.version === 'pokemon_current_standard_usage_input:v1', 'REFRESH_INPUT_VERSION');
  const context = input.context;
  assert(timestamp(context.retain_until) > timestamp(asOf), 'REFRESH_SEED_EXPIRED');
  const members = context.packet.groups.flatMap(group => group.members.map(member => ({
    provider_card_id: member.provider_card_id, profile_receipt_id: member.profile_original.id,
  })));
  assert(new Set(members.map(member => member.provider_card_id)).size === members.length, 'REFRESH_DUPLICATE_PROVIDER');
  const setIds = [...new Set(context.packet.groups.flatMap(group => group.aliases.map(alias => alias.set_original.id)))].sort();
  const wanted = new Set([...members.map(member => member.profile_receipt_id), ...setIds]);
  const receipts = context.receipts.filter(receipt => wanted.has(receipt.id));
  assert(receipts.length === wanted.size && members.length > 0 && members.length <= 500, 'REFRESH_METADATA_SCOPE');
  return {version: 'pokemon_standard_usage_refresh_seed:v1', retain_until: context.retain_until,
    members, set_receipt_ids: setIds, metadata_receipts: structuredClone(receipts),
    sources: structuredClone(context.sources.filter(source => receipts.some(receipt => receipt.source_id === source.id))),
    event_ids: [...new Set(context.receipts.filter(receipt => receipt.kind === 'tournament').map(receipt => JSON.parse(receipt.body_text).event_id))].sort(),
    collection: {discovery_pages: 3, candidate_events: 25, maximum_events: 20, maximum_requests: 600,
      request_interval_ms: 1200, maximum_receipt_bytes: 4 * 1024 * 1024},
    event_source: {id: 'limitless_current_standard_usage_v1', adapter: 'pokemon_limitless_published_decklists_v1',
      allowed_origins: [ORIGIN], retention_days: 7, allow_ingest: true, request_interval_ms: 6500,
      collection_basis: 'Documented public tournament/decklist endpoints; owner-authorized independent recent-usage classification. No raw redistribution.',
      documentation: 'https://docs.limitlesstcg.com/developer/tournaments',
      attribution: {label: 'Limitless tournament platform', url: ORIGIN}}};
}

export async function collectCurrentStandardUsage({seed, bindingsLoader, onReceipt = async () => {},
  onRateLimit = async () => {}, fetchImpl = globalThis.fetch, clock = () => new Date().toISOString(), sleepImpl = delay}) {
  assert(seed?.version === 'pokemon_standard_usage_refresh_seed:v1', 'REFRESH_SEED_VERSION');
  const started = timestamp(clock());
  assert(timestamp(seed.retain_until) > started, 'REFRESH_SEED_EXPIRED');
  const limits = seed.collection;
  assert(Number.isInteger(limits.discovery_pages) && limits.discovery_pages >= 1 && limits.discovery_pages <= 5 &&
    Number.isInteger(limits.candidate_events) && limits.candidate_events >= 1 && limits.candidate_events <= 100 &&
    Number.isInteger(limits.maximum_events) && limits.maximum_events >= 1 && limits.maximum_events <= 20 &&
    Number.isInteger(limits.maximum_requests) && limits.maximum_requests >= 1 && limits.maximum_requests <= 600 &&
    Number.isInteger(limits.request_interval_ms) && limits.request_interval_ms >= 1000 && limits.request_interval_ms <= 60000 &&
    Number.isInteger(limits.maximum_receipt_bytes) && limits.maximum_receipt_bytes >= 1024 && limits.maximum_receipt_bytes <= 4 * 1024 * 1024, 'REFRESH_COLLECTION_BOUNDS');
  const metadata = mapUnique(boundedArray(seed.metadata_receipts, 1000), 'id');
  const sources = mapUnique(boundedArray(seed.sources, 100), 'id');
  for (const receipt of metadata.values()) {
    assert(sha256(receipt.body_text) === receipt.body_sha256 && timestamp(receipt.observed_at) <= started, 'REFRESH_METADATA_CHANGED');
  }
  const eventSource = seed.event_source;
  assert(eventSource?.adapter === 'pokemon_limitless_published_decklists_v1' &&
    digest(eventSource.allowed_origins) === digest([ORIGIN]) && eventSource.retention_days === 7, 'REFRESH_EVENT_SOURCE_SCOPE');
  let requests = 0, rateRetries = 0;
  const lastRequest = new Map();
  const rateNotBefore = new Map();
  async function capture(source, url, kind, observedAt = clock(), retried = false) {
    assert(source?.allow_ingest === true && Number.isInteger(source.retention_days) && source.retention_days >= 1 && source.retention_days <= 30,
      'REFRESH_COLLECTION_SOURCE');
    assert(timestamp(clock()) - started < 25 * 60 * 1000, 'REFRESH_TIME_BOUND');
    const parsed = admittedSourceUrl(source, url);
    assert(++requests <= limits.maximum_requests, 'REFRESH_REQUEST_BOUND');
    const interval = Math.max(limits.request_interval_ms, source.request_interval_ms ?? 0);
    const wait = Math.max(0, Math.max((lastRequest.get(parsed.origin) ?? -Infinity) + interval,
      rateNotBefore.get(parsed.origin) ?? 0) - timestamp(clock()));
    assert(wait <= 10 * 60 * 1000, 'REFRESH_RETRY_LATER');
    for (let remaining = wait; remaining > 0; remaining -= 60000) await sleepImpl(Math.min(remaining, 60000));
    assert(timestamp(clock()) - started < 25 * 60 * 1000, 'REFRESH_TIME_BOUND');
    lastRequest.set(parsed.origin, timestamp(clock()));
    const response = await fetchImpl(url, {method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: {Accept: kind === 'tournament' && url.endsWith('/standings') && !url.includes('/api/') ? 'text/html' : 'application/json',
        'User-Agent': 'grookai-vault-playables/1.0'}});
    const rateDelay = sourceRateDelay(response.headers, timestamp(clock()));
    rateNotBefore.set(parsed.origin, Math.max(rateNotBefore.get(parsed.origin) ?? 0, timestamp(clock()) + rateDelay));
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      if (response.status === 429 && !retried) {
        const pause = rateDelay || 300000;
        rateNotBefore.set(parsed.origin, timestamp(clock()) + pause);
        await onRateLimit({http_status: 429, retry_after_seconds: Math.ceil(pause / 1000), request_fingerprint: digest({url})});
        rateRetries++;
        return capture(source, url, kind, observedAt, true);
      }
      const error = new EngineError(response.status === 429 ? 'REFRESH_RATE_LIMITED' : 'REFRESH_SOURCE_HTTP_FAILURE');
      error.acquisition = {request_fingerprint: digest({url}), http_status: response.status,
        retryable: [429, 500, 502, 503, 504].includes(response.status), retry_after_seconds: Math.ceil(rateDelay / 1000)};
      throw error;
    }
    const chunks = []; let size = 0;
    for await (const chunk of response.body ?? []) {
      size += chunk.byteLength; assert(size <= limits.maximum_receipt_bytes, 'REFRESH_RECEIPT_SIZE'); chunks.push(Buffer.from(chunk));
    }
    const body_text = Buffer.concat(chunks).toString('utf8');
    const receipt = {id: `refresh-${digest({url, observedAt, source: source.id})}`, source_id: source.id, kind, url,
      observed_at: observedAt, body_text, body_sha256: sha256(body_text),
      retain_until: new Date(timestamp(observedAt) + source.retention_days * DAY_MS).toISOString()};
    await onReceipt(receipt, source);
    return receipt;
  }

  // Renew actual original bytes before the retained metadata bundle expires.
  // Fixed-commit repository proofs/license are rechecked by the existing reader.
  const replacements = new Map(), renewed = timestamp(seed.retain_until) - started <= 2 * DAY_MS;
  if (renewed) {
    const observedAt = clock(), originals = new Map();
    const get = async (source, url) => {
      const key = `${source.id}|${url}`;
      if (!originals.has(key)) originals.set(key, await capture(source, url, 'gameplay', observedAt));
      return originals.get(key);
    };
    for (const receipt of metadata.values()) {
      const source = sources.get(receipt.source_id); assert(source, 'REFRESH_METADATA_SOURCE');
      let next;
      const repositorySet = source.adapter === 'tcgdex_repository_set_v1';
      if (source.adapter === 'tcgdex_repository_card_v1' || repositorySet) {
        const value = JSON.parse(receipt.body_text);
        const snapshots = [];
        for (const original of boundedArray(value.snapshots, repositorySet ? 502 : 3)) {
          const fresh = await get(source, original.url);
          snapshots.push({url: fresh.url, observed_at: observedAt, body_text: fresh.body_text, body_sha256: fresh.body_sha256});
        }
        const body_text = JSON.stringify({...value, snapshots});
        next = {id: `refresh-wrapper-${digest({url: receipt.url, observedAt, source: source.id})}`, source_id: source.id,
          kind: 'gameplay', url: receipt.url, observed_at: observedAt, body_text, body_sha256: sha256(body_text),
          retain_until: new Date(timestamp(observedAt) + source.retention_days * DAY_MS).toISOString()};
        if (repositorySet) readTcgdexSetReceipt(next, source);
        else readTcgdexProfileReceipt(next, source);
        await onReceipt(next, source);
      } else {
        assert(!source.adapter || !source.adapter.startsWith('tcgdex_repository'), 'REFRESH_UNSUPPORTED_METADATA_ADAPTER');
        next = await get(source, receipt.url);
      }
      replacements.set(receipt.id, next);
    }
  }
  const nextSeed = structuredClone(seed);
  if (renewed) {
    nextSeed.metadata_receipts = [...replacements.values()];
    for (const member of nextSeed.members) member.profile_receipt_id = replacements.get(member.profile_receipt_id).id;
    nextSeed.set_receipt_ids = nextSeed.set_receipt_ids.map(id => replacements.get(id).id);
    nextSeed.retain_until = new Date(Math.min(...nextSeed.metadata_receipts.map(receipt => timestamp(receipt.retain_until)))).toISOString();
  }
  const currentMetadata = mapUnique(nextSeed.metadata_receipts, 'id');
  const bindings = await bindingsLoader(nextSeed.members.map(member => member.provider_card_id));
  const owners = bindings.mappings.filter(mapping => mapping.source === 'tcgdex' && mapping.active);
  const catalog = mapUnique(bindings.catalog, 'id');
  const sets = nextSeed.set_receipt_ids.map(id => {
    const receipt = currentMetadata.get(id); assert(receipt, 'REFRESH_SET_ORIGINAL');
    return {receipt, set: readTcgdexSetReceipt(receipt, sources.get(receipt.source_id)).set};
  });
  const groups = [], byAlias = new Map();
  for (const member of boundedArray(nextSeed.members, 500)) {
    const receipt = currentMetadata.get(member.profile_receipt_id); assert(receipt, 'REFRESH_PROFILE_ORIGINAL');
    const {card: profile} = readTcgdexProfileReceipt(receipt, sources.get(receipt.source_id), {providerCardId: member.provider_card_id});
    assert(profile.id === member.provider_card_id, 'REFRESH_PROFILE_ID');
    const mappings = owners.filter(mapping => mapping.external_id === profile.id), card = catalog.get(mappings[0]?.card_print_id);
    assert(mappings.length === 1 && card, 'REFRESH_CANONICAL_OWNER_REQUIRED');
    const proposal = tcgdexGameplayProposal(profile);
    const group = {id: `usage-${digest({card: card.id, fingerprint: proposal.fingerprint})}`, mode: 'exact_source_profile',
      metadata: gameplayMetadataHints(profile), review: pending(), aliases: [], members: [{provider_card_id: profile.id,
        card_print_id: card.id, identity_id: card.identity_id, identity_key_hash: card.identity_key_hash, mapping_id: String(mappings[0].id),
        profile_original: ref(receipt), profile_hash: digest(profile), mechanics_hash: proposal.fingerprint, review: pending()}]};
    groups.push(group);
    for (const {receipt: setReceipt, set} of sets.filter(value => value.set.id === profile.set.id)) {
      if (set.cards.filter(value => value.id === profile.id && collectorNumber(value.localId) === collectorNumber(profile.localId) &&
        normalize(value.name) === normalize(profile.name)).length !== 1) continue;
      for (const label of labels(set)) {
        const key = aliasKey({source_id: eventSource.id, set: label, number: profile.localId, name: profile.name});
        assert(!byAlias.has(key) || byAlias.get(key).group.id === group.id, 'REFRESH_AMBIGUOUS_COORDINATE');
        byAlias.set(key, {group, setReceipt});
      }
    }
  }

  const candidates = new Set(boundedArray(seed.event_ids, 20)), discovery = [], exclusions = [];
  assert([...candidates].every(id => /^[a-f0-9]{24}$/.test(id)), 'REFRESH_EVENT_ID');
  for (let page = 1; page <= limits.discovery_pages; page++) {
    const receipt = await capture(eventSource, `${ORIGIN}/api/tournaments?game=PTCG&format=STANDARD&limit=100&page=${page}`, 'tournament');
    const rows = boundedArray(JSON.parse(receipt.body_text), 100); discovery.push(receipt.id);
    for (const row of rows) {
      if (!/^[a-f0-9]{24}$/.test(row.id) || row.game !== 'PTCG' || row.format !== 'STANDARD') continue;
      const date = timestamp(row.date), at = timestamp(clock());
      if (date <= at && date > at - 30 * DAY_MS && row.isOnline !== true) candidates.add(row.id);
    }
    if (rows.length < 100) break;
  }
  const events = [], occurrences = new Map(); let checked = 0;
  for (const id of candidates) {
    if (checked >= limits.candidate_events || events.length >= limits.maximum_events) break;
    checked++;
    const detail = await capture(eventSource, `${ORIGIN}/api/tournaments/${id}/details`, 'tournament');
    const details = JSON.parse(detail.body_text), date = timestamp(details.date), at = timestamp(clock());
    if (details.id !== id || details.game !== 'PTCG' || details.format !== 'STANDARD' || details.isOnline !== false ||
      details.isPublic !== true || details.multideck || details.bannedCards?.length || details.specialRules?.length ||
      date > at || date <= at - 30 * DAY_MS) {exclusions.push({event_id: id, reason: 'OUTSIDE_USAGE_SCOPE'}); continue;}
    const page = await capture(eventSource, `${ORIGIN}/tournament/${id}/standings`, 'tournament');
    if (!hasCompletedStandings(page.body_text)) {exclusions.push({event_id: id, reason: 'NOT_COMPLETED'}); continue;}
    const standings = await capture(eventSource, `${ORIGIN}/api/tournaments/${id}/standings`, 'tournament');
    const originals = Object.fromEntries([['details', detail], ['standings', standings], ['standings_page', page]]
      .map(([key, receipt]) => [key, {receipt, retain_until: receipt.retain_until}]));
    const {capture: value, receipt} = createLimitlessPublishedProposal({event_id: id, source_id: eventSource.id,
      event_context: {source_event_id: id, date_basis: 'publisher_event_date_with_completed_decklists'}, originals});
    const decks = readLimitlessPublishedLists(value, {maximum_decks_per_event: 10000}).decks;
    if (!decks.some(deck => deck.cards.reduce((total, line) => total + line.quantity, 0) === 60)) continue;
    await onReceipt(receipt, eventSource); events.push(receipt);
    for (const deck of decks) for (const line of deck.cards) {
      const key = aliasKey({...line, source_id: eventSource.id}), target = byAlias.get(key);
      if (!target || target.group.metadata.section !== line.section) continue;
      if (!occurrences.has(key)) occurrences.set(key, {line, target, refs: new Map()});
      occurrences.get(key).refs.set(receipt.id, ref(receipt));
    }
  }
  for (const {line, target, refs} of occurrences.values()) target.group.aliases.push({source_id: eventSource.id,
    set: line.set, number: line.number, name: line.name, card_print_id: target.group.members[0].card_print_id,
    set_original: ref(target.setReceipt), event_originals: [...refs.values()], review: pending()});
  const asOf = clock();
  const until = new Date(Math.min(timestamp(nextSeed.retain_until), ...events.map(receipt => timestamp(receipt.retain_until)))).toISOString();
  nextSeed.event_ids = events.map(receipt => JSON.parse(receipt.body_text).event_id);
  return {input: {version: 'pokemon_current_standard_usage_input:v1', current_bindings: bindings,
    context: {sources: [...seed.sources, eventSource], receipts: [...nextSeed.metadata_receipts, ...events], retain_until: until,
      packet: {version: 'pokemon_playables_gameplay_review_packet:v1', groups}}}, next_seed: nextSeed, as_of: asOf,
    collection: {requests, rate_retries: rateRetries, discovery_receipts: discovery, checked_events: checked,
      included_events: events.length, metadata_renewed: renewed, exclusions}};
}

export async function refreshCurrentStandardUsage({store, policy, bindingsLoader, fetchImpl, clock = () => new Date().toISOString(), sleepImpl}) {
  const run = {run_id: randomUUID(), purpose: 'current_standard_refresh', status: 'running', stage: 'collect', started_at: clock()};
  // Separate from the short publication lock: concurrent collections must not
  // renew an older seed over a newer one, while the existing publication worker
  // continues to own its normal lock and atomic read-model replacement.
  let token;
  try {
    token = randomUUID(); await store.put('standard-usage/refresh-lock.json', {token}, {immutable: true});
    await store.saveRun(run);
    const seed = await store.get(REFRESH_SEED_KEY); assert(seed, 'REFRESH_SEED_REQUIRED');
    const result = await collectCurrentStandardUsage({seed, bindingsLoader, fetchImpl, clock, sleepImpl,
      onRateLimit: acquisition => store.saveRun({...run, stage: 'source_backoff', acquisition}),
      onReceipt: async receipt => {await store.saveRaw(receipt, receipt.retain_until);}});
    run.stage = 'publish';
    assert(digest(await store.get(REFRESH_SEED_KEY)) === digest(seed), 'REFRESH_CONFIGURATION_CHANGED');
    const published = await publishCurrentStandardUsage({store, input: result.input, policy, bindingsLoader, asOf: result.as_of, clock});
    // Seed data is private, retained and replaceable. It contains no positive flags.
    assert(digest(await store.get(REFRESH_SEED_KEY)) === digest(seed), 'REFRESH_CONFIGURATION_CHANGED');
    await store.put(REFRESH_SEED_KEY, result.next_seed);
    assert(digest(await store.get(REFRESH_SEED_KEY)) === digest(result.next_seed), 'REFRESH_SEED_READBACK');
    await store.saveRun({...run, status: 'succeeded', stage: 'complete', finished_at: clock(),
      snapshot_id: published.manifest.snapshot_id, collection: result.collection, coverage: published.manifest.coverage});
    return {run_id: run.run_id, snapshot_id: published.manifest.snapshot_id, coverage: published.manifest.coverage,
      valid_until: published.manifest.valid_until, collection: result.collection};
  } catch (error) {
    await store.saveRun({...run, status: 'failed', finished_at: clock(), ...safeFailure(error)}); throw error;
  } finally {
    if (token && (await store.get('standard-usage/refresh-lock.json'))?.token === token) await store.remove('standard-usage/refresh-lock.json');
  }
}
