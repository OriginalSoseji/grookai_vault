import { pokemonReferenceFailureV1 } from './pokemon_reference_http_v1.mjs';
import { isPokemonReferenceIdV1 } from './pokemon_reference_id_v1.mjs';

// Leave time for the adapter report, normalization and warehouse phases before
// the reference service's three-hour hard limit. HTTP attempts have their own
// 60s transfer/80s process limits; a budget stop starts no further requests.
export async function fetchPokemonReferenceBatchV1({ ids, fetchCard, onResult = () => {},
  onProgress = () => {}, authenticated = false, budgetMs = 90 * 60_000, stopOnFailure = false,
  now = () => performance.now(), sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
}) {
  if (!Array.isArray(ids) || ids.some(id => !isPokemonReferenceIdV1(id)) ||
      new Set(ids).size !== ids.length || ids.length > 5000 || !Number.isFinite(budgetMs) || budgetMs <= 0 || budgetMs > 90 * 60_000)
    throw new Error('POKEMON_REFERENCE_INVALID_BATCH');
  const started = now(), deadline = started + budgetMs;
  const concurrency = authenticated ? 2 : 1;
  const interval = authenticated ? 250 : 2100;
  const ceiling = authenticated ? 15000 : 900;
  let cursor = 0, attempts = 0, completed = 0, failures = 0, stop = null, nextAttemptAt = started;
  let gate = Promise.resolve();
  const cardsByExternalId = {}, errors = [];
  const progress = () => ({ selected: ids.length, completed, attempts, failures,
    pending: ids.length - completed, stop_reason: stop, elapsed_ms: Math.round(now() - started), concurrency });
  const fail = code => Object.assign(new Error(code), { code });
  const beforeAttempt = async () => {
    // Serialize request starts, including HTTP retries, without serializing I/O.
    const previous = gate; let release; gate = new Promise(resolve => { release = resolve; });
    await previous;
    try {
      if (stop) throw fail(stop);
      const delay = Math.max(0, nextAttemptAt - now());
      if (now() + delay + 80_000 >= deadline) stop = 'POKEMON_REFERENCE_BATCH_BUDGET';
      if (attempts >= ceiling) stop = 'POKEMON_REFERENCE_REQUEST_CEILING';
      if (stop) throw fail(stop);
      if (delay) await sleep(delay);
      if (stop || now() + 80_000 >= deadline) throw fail(stop ||= 'POKEMON_REFERENCE_BATCH_BUDGET');
      attempts++; nextAttemptAt = now() + interval;
    } finally { release(); }
  };
  const beforeRetryDelay = async delayMs => {
    // Do not enter a cooldown that cannot leave room for another bounded HTTP
    // attempt. Checking only after sleep would exceed the aggregate deadline.
    if (!Number.isFinite(delayMs) || delayMs < 0) throw fail('POKEMON_REFERENCE_INVALID_RETRY_DELAY');
    if (attempts >= ceiling) stop ||= 'POKEMON_REFERENCE_REQUEST_CEILING';
    if (stop || now() + delayMs + 80_000 >= deadline) throw fail(stop ||= 'POKEMON_REFERENCE_BATCH_BUDGET');
  };
  await onProgress(progress());
  async function worker() {
    while (!stop && cursor < ids.length) {
      const id = ids[cursor++];
      let result;
      try {
        const card = await fetchCard(id, { beforeAttempt, beforeRetryDelay });
        if (card !== null && (!card || Array.isArray(card) || card.id !== id)) throw fail('POKEMON_REFERENCE_ID_MISMATCH');
        if (card) cardsByExternalId[id] = card;
        result = { id, status: card ? 'fetched' : 'missing', card };
      } catch (error) {
        const safe = pokemonReferenceFailureV1(error);
        // A missing provider ID is retained as a coverage finding. All other
        // transport/auth/format failures make the acquisition incomplete.
        const missing = !stopOnFailure && safe.http_status === 404;
        errors.push({ id, ...safe });
        result = { id, status: missing ? 'missing' : 'failed', failure: safe };
        if (!missing) {
          failures++;
          if (stopOnFailure) stop ||= safe.code;
          if ([401, 403, 429].includes(safe.http_status) || /BATCH_BUDGET|REQUEST_CEILING/.test(safe.code)) stop ||= safe.code;
          if (failures >= 5) stop ||= 'POKEMON_REFERENCE_PROVIDER_FAILURE_LIMIT';
        }
      }
      completed++;
      // Persist each exact response outside the normalizer's acquisition glob.
      // Never turn an interrupted batch into a fresh successful acquisition.
      try { await onResult(result); await onProgress(progress()); }
      catch (error) { stop ||= 'POKEMON_REFERENCE_PROGRESS_WRITE_FAILED'; throw error; }
    }
  }
  const workers = await Promise.allSettled(Array.from({ length: concurrency }, worker));
  const rejected = workers.find(item => item.status === 'rejected');
  if (rejected) throw rejected.reason;
  return { cardsByExternalId, errors, ...progress(), complete: completed === ids.length && failures === 0 && !stop };
}
