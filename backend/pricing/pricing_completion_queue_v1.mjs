/**
 * Local, plan-only completion state. No credentials, database, network, subprocess,
 * receipt-path loading, or publication executor belongs here.
 *
 * TRUST BOUNDARY: trustedVerifier is supplied by the separately reviewed controller,
 * never by candidate/plugin code. It must independently authenticate publication
 * AND application read-path evidence. Structural checks below do not authenticate
 * receipts. Do not inject a callback that merely echoes worker claims. This module
 * cannot sandbox its caller or defend files from a principal who can rewrite them.
 * Use a controller-owned local directory on a filesystem providing exclusive-create
 * and atomic same-directory rename. A stale lock fails closed: operator recovery
 * must first prove no live writer exists. No automatic lock stealing.
 */
import {
  closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync,
  readSync, renameSync, unlinkSync, writeFileSync, writeSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, join, parse, resolve } from 'node:path';
import { StringDecoder } from 'node:string_decoder';

export const PRICING_COMPLETION_QUEUE_VERSION_V1 = 'pricing-completion-queue-v1';
const STATES = new Set(['pending', 'leased', 'retry', 'review_needed', 'resolved']);
const MAX_BATCH = 500;
const MAX_LEASE_MS = 60 * 60 * 1000;
const MIN_RETRY_MS = 60 * 1000;
const MAX_RETRY_MS = 24 * 60 * 60 * 1000;
const SHA256 = /^[a-f0-9]{64}$/;

function fail(message) { throw new Error(`pricing_completion_queue: ${message}`); }
function text(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1000) fail(`invalid ${name}`);
  return value;
}
function integer(value, name, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`invalid ${name}`);
  return value;
}
function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) fail('non-JSON value');
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}
function clone(value) { return JSON.parse(JSON.stringify(canonical(value))); }
// Emit bounded complete JSON tokens instead of cloning/stringifying the whole
// queue. Native JSON.stringify still defines primitive escaping/number bytes.
// Canonical objects must reproduce enumeration of Object.fromEntries(sorted
// keys): array-index names enumerate numerically before all other sorted names.
function streamJson(value, emit, sorted = true) {
  const ancestors = new Set();
  let tokens = [], length = 0;
  function flush() { if (length) { emit(tokens.join('')); tokens = []; length = 0; } }
  function token(text) {
    if (length + text.length > 65536) flush();
    if (text.length >= 65536) emit(text);
    else { tokens.push(text); length += text.length; }
  }
  function indexKey(key) { const n = Number(key); return Number.isInteger(n) && n >= 0 && n < 4294967295 && String(n) === key; }
  function visit(item) {
    if (item === null || typeof item === 'boolean' || typeof item === 'string'
        || (typeof item === 'number' && Number.isFinite(item))) { token(JSON.stringify(item)); return; }
    if (typeof item !== 'object' || (!Array.isArray(item) && Object.getPrototypeOf(item) !== Object.prototype)) fail('non-JSON value');
    if (ancestors.has(item)) fail('cyclic JSON value');
    ancestors.add(item);
    if (Array.isArray(item)) {
      token('[');
      for (let i = 0; i < item.length; i++) { if (i) token(','); if (i in item) visit(item[i]); else token('null'); }
      token(']');
    } else {
      let keys = Object.keys(item);
      if (sorted) keys.sort((a,b) => {
        const ai = indexKey(a), bi = indexKey(b);
        return ai && bi ? Number(a) - Number(b) : ai ? -1 : bi ? 1 : a < b ? -1 : a > b ? 1 : 0;
      });
      token('{');
      for (let i = 0; i < keys.length; i++) { if (i) token(','); token(JSON.stringify(keys[i])); token(':'); visit(item[keys[i]]); }
      token('}');
    }
    ancestors.delete(item);
  }
  visit(value); flush();
}
export function pricingCompletionDigestV1(value) {
  const hash = createHash('sha256');
  streamJson(value, chunk => hash.update(chunk));
  return hash.digest('hex');
}
// Construct the parsed tree directly from bounded UTF-8 chunks. The old
// JSON.parse(readFileSync(..., 'utf8')) retained a whole-file Buffer/string at
// the same time as the next full queue tree. Only individual scalar tokens are
// joined here; native JSON.parse still owns string escapes and number semantics.
// The chunk-size option exists for deterministic boundary compatibility tests.
export function readPricingCompletionQueueSnapshotJsonV1(file, { chunkBytes = 65536 } = {}) {
  integer(chunkBytes, 'snapshot chunk bytes', 1, 65536);
  const fd = openSync(file, 'r'), bytes = Buffer.alloc(chunkBytes), decoder = new StringDecoder('utf8');
  let buffer = '', offset = 0, ended = false;
  function available() {
    while (offset === buffer.length && !ended) {
      const count = readSync(fd, bytes, 0, bytes.length, null);
      buffer = count ? decoder.write(bytes.subarray(0, count)) : decoder.end();
      offset = 0; if (!count) ended = true;
    }
    return offset < buffer.length;
  }
  function whitespace() {
    while (available()) {
      const found = /[^ \t\r\n]/g; found.lastIndex = offset;
      const next = found.exec(buffer);
      if (next) { offset = next.index; return; }
      offset = buffer.length;
    }
  }
  function punctuation(expected) {
    whitespace(); if (!available() || buffer[offset] !== expected) fail('corrupt snapshot JSON');
    offset += 1;
  }
  function string() {
    const parts = ['"']; offset += 1;
    while (available()) {
      const special = /["\\]/g; special.lastIndex = offset;
      const next = special.exec(buffer);
      if (!next) { parts.push(buffer.slice(offset)); offset = buffer.length; continue; }
      parts.push(buffer.slice(offset, next.index + 1)); offset = next.index + 1;
      if (next[0] === '"') return JSON.parse(parts.join(''));
      if (!available()) fail('corrupt snapshot JSON');
      parts.push(buffer[offset++]);
    }
    fail('corrupt snapshot JSON');
  }
  function value() {
    whitespace(); if (!available()) fail('corrupt snapshot JSON');
    const first = buffer[offset];
    if (first === '"') return string();
    if (first === '{') {
      offset += 1; const result = {}; whitespace();
      if (available() && buffer[offset] === '}') { offset += 1; return result; }
      for (;;) {
        whitespace(); if (!available() || buffer[offset] !== '"') fail('corrupt snapshot JSON');
        const key = string(); punctuation(':'); const child = value();
        // JSON.parse treats __proto__ as an own data key. Redefinition also
        // preserves duplicate-key last-wins semantics and enumeration order.
        Object.defineProperty(result, key, { value: child, enumerable: true, writable: true, configurable: true });
        whitespace(); if (!available()) fail('corrupt snapshot JSON');
        if (buffer[offset] === '}') { offset += 1; return result; }
        punctuation(',');
      }
    }
    if (first === '[') {
      offset += 1; const result = []; whitespace();
      if (available() && buffer[offset] === ']') { offset += 1; return result; }
      for (;;) {
        result.push(value()); whitespace(); if (!available()) fail('corrupt snapshot JSON');
        if (buffer[offset] === ']') { offset += 1; return result; }
        punctuation(',');
      }
    }
    const parts = [];
    while (available()) {
      const delimiter = /[,\]} \t\r\n]/g; delimiter.lastIndex = offset;
      const next = delimiter.exec(buffer);
      if (next) { parts.push(buffer.slice(offset, next.index)); offset = next.index; break; }
      parts.push(buffer.slice(offset)); offset = buffer.length;
    }
    return JSON.parse(parts.join(''));
  }
  try {
    const result = value(); whitespace();
    if (available()) fail('corrupt snapshot JSON');
    return result;
  } finally { closeSync(fd); }
}
function identityV1(identity) {
  if (!identity || !['source', 'master'].includes(identity.kind)) fail('invalid identity kind');
  const fields = identity.kind === 'source'
    ? ['kind', 'provider', 'category', 'productId', 'subtype', 'currency', 'condition']
    : ['kind', 'printingId', 'currency', 'condition'];
  if (Object.keys(identity).some(key => !fields.includes(key))) fail('unexpected identity field');
  const result = Object.fromEntries(fields.map(key => [key, text(identity[key], `identity.${key}`)]));
  if (!/^[A-Z]{3}$/.test(result.currency)) fail('invalid currency');
  return result;
}
export function pricingCompletionKeyV1(identity) {
  return `pcq1:${pricingCompletionDigestV1(identityV1(identity))}`;
}
function observationV1(raw) {
  const identity = identityV1(raw.identity);
  // This reference stays private to the synchronous transaction. Validate it
  // without invoking a toJSON hook; copy only when a changed
  // observation is admitted to state. Snapshot validation needs no deep copy.
  const evidence = raw.evidence;
  if (!evidence || Array.isArray(evidence) || typeof evidence !== 'object') fail('evidence must be an object');
  const evidenceHash = createHash('sha256');
  let evidenceBytes = 0;
  streamJson(evidence, chunk => {
    evidenceBytes += Buffer.byteLength(chunk);
    if (evidenceBytes > 131072) fail('evidence too large');
    evidenceHash.update(chunk);
  });
  const sourceDigest = evidenceHash.digest('hex');
  const result = {
    key: pricingCompletionKeyV1(identity), identity,
    reason: text(raw.reason, 'reason'), evidence,
    sourceRunId: text(raw.sourceRunId, 'sourceRunId'), scope: text(raw.scope, 'scope'),
    priority: integer(raw.priority ?? 0, 'priority', 0, 100),
    owner: text(raw.owner ?? 'pricing-completion-triage-v1', 'owner'),
    nextAction: text(raw.nextAction ?? 'Review source evidence and prepare a bounded repair proposal.', 'nextAction'),
  };
  result.sourceDigest = sourceDigest;
  result.observationDigest = pricingCompletionDigestV1({
    identity, reason: result.reason, sourceDigest: result.sourceDigest,
    sourceRunId: result.sourceRunId, scope: result.scope,
  });
  return result;
}
function detachedObservation(row) {
  const evidence = clone(row.evidence);
  // A later input accessor must not alter previously validated borrowed data.
  if (pricingCompletionDigestV1(evidence) !== row.sourceDigest) fail('observation evidence changed during ingestion');
  return { ...row, evidence };
}
function assertRegular(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || !stat.isFile()) fail('state path must be a regular file');
}
function assertDirectory(path) {
  // Reject existing symlink/junction ancestors before creating any state.
  const root = parse(path).root;
  let current = root;
  for (const part of path.slice(root.length).split(/[\\/]/).filter(Boolean)) {
    current = join(current, part);
    if (!existsSync(current)) mkdirSync(current, { mode: 0o700 });
    const stat = lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('queue directory must not contain symlink ancestors');
  }
}
function syncDirectory(path) {
  // Windows does not provide a portable directory fsync through Node. File bytes
  // are always flushed; atomic rename protects process-crash consistency. Power
  // loss durability additionally depends on filesystem/platform guarantees.
  let fd;
  try { fd = openSync(path, 'r'); fsyncSync(fd); }
  catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EISDIR', 'EINVAL', 'EACCES'].includes(error.code)) throw error;
  } finally { if (fd !== undefined) closeSync(fd); }
}
function writeExclusive(path, bytes) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
function writeSnapshotExclusive(path, state) {
  // Digest validates the full JSON tree before any snapshot file is created.
  const digest = pricingCompletionDigestV1(state);
  const fd = openSync(path, 'wx', 0o600);
  try {
    // Preserve the legacy envelope/property ordering exactly while bounding
    // string/buffer allocation. Handle short writes without truncating output.
    streamJson({ digest, state }, chunk => {
      const bytes = Buffer.from(chunk);
      let offset = 0;
      while (offset < bytes.length) {
        const written = writeSync(fd, bytes, offset, bytes.length - offset);
        if (written <= 0) fail('snapshot write made no progress');
        offset += written;
      }
    }, false);
    fsyncSync(fd);
  } finally { closeSync(fd); }
}
function validateSnapshot(state) {
  if (!state || state.version !== PRICING_COMPLETION_QUEUE_VERSION_V1 || !Array.isArray(state.items)) fail('invalid snapshot schema');
  integer(state.revision, 'revision');
  const keys = new Set();
  for (const item of state.items) {
    const observation = observationV1(item);
    if (keys.has(item.key) || item.key !== observation.key || item.sourceDigest !== observation.sourceDigest
      || item.observationDigest !== observation.observationDigest || !STATES.has(item.state)) fail('invalid snapshot item');
    keys.add(item.key);
    integer(item.firstSeen, 'firstSeen'); integer(item.lastSeen, 'lastSeen');
    integer(item.updatedAt, 'updatedAt'); integer(item.attempts, 'attempts');
    integer(item.totalAttempts, 'totalAttempts'); integer(item.generation, 'generation', 1);
    integer(item.nextAttemptAt, 'nextAttemptAt');
    if (!Array.isArray(item.history)) fail('missing history');
    if (item.state === 'leased') {
      if (!item.lease) fail('missing lease');
      text(item.lease.token, 'lease token'); text(item.lease.runId, 'lease run');
      text(item.lease.owner, 'lease owner'); integer(item.lease.expiresAt, 'lease expiry');
      if (item.lease.generation !== item.generation) fail('invalid lease generation');
    } else if (item.lease !== null) fail('unexpected lease');
    if (item.state === 'resolved' && !item.resolution) fail('missing resolution');
  }
  return state;
}
function event(item, now, action, detail = {}) {
  item.updatedAt = now;
  item.history.push({ at: now, action, generation: item.generation, ...detail });
}
function retryDelay(attempts) { return Math.min(MAX_RETRY_MS, MIN_RETRY_MS * (2 ** Math.min(20, Math.max(0, attempts - 1)))); }
function expireLeases(state, now) {
  for (const item of state.items) {
    if (item.state === 'leased' && item.lease.expiresAt <= now) {
      event(item, now, 'lease_expired', { runId: item.lease.runId });
      item.state = 'retry'; item.lease = null;
      item.nextAttemptAt = now + retryDelay(item.attempts);
    }
  }
}
function leaseItem(state, key, token, now) {
  const item = state.items.find(row => row.key === key);
  if (!item || item.state !== 'leased' || item.lease.token !== token
    || item.lease.expiresAt <= now || now < item.updatedAt
    || item.lease.generation !== item.generation) fail('stale or missing lease');
  return item;
}
function eligible(item, now) {
  return ['pending', 'retry'].includes(item.state) && item.nextAttemptAt <= now && item.updatedAt <= now;
}
function validateDeferral(row) {
  text(row.key, 'key'); text(row.leaseToken, 'leaseToken');
  text(row.reason, 'failure reason'); text(row.nextAction, 'nextAction');
  if (typeof (row.reviewRequired ?? false) !== 'boolean') fail('invalid reviewRequired');
}
function deferItem(state, row, now) {
  const item = leaseItem(state, row.key, row.leaseToken, now);
  event(item, now, row.reviewRequired ? 'review_required' : 'retry_scheduled', { reason: row.reason, runId: item.lease.runId });
  item.state = row.reviewRequired ? 'review_needed' : 'retry'; item.lease = null;
  item.nextAction = row.nextAction; item.nextAttemptAt = now + retryDelay(item.attempts);
  return item;
}
function ordered(items) {
  // Source generations retain their full evidence/run binding. Reopening must not
  // let frequently refreshed high-priority rows starve the untouched backlog.
  // Lifetime attempts survive generation changes; priority breaks fairness ties.
  return [...items].sort((a, b) => a.totalAttempts - b.totalAttempts
    || b.priority - a.priority || a.firstSeen - b.firstSeen || a.key.localeCompare(b.key));
}
function verifiedResolution(item, result, now) {
  if (item.identity.currency === 'XXX' || item.identity.condition === 'UNKNOWN'
    || item.evidence.identityDimensionsVerified === false) fail('unresolved identity dimensions');
  if (!result || typeof result !== 'object' || typeof result.then === 'function') fail('trusted verifier must return synchronous evidence');
  const proof = clone(result);
  if (proof.version !== 'pricing-completion-verification-v1' || proof.key !== item.key
    || proof.sourceDigest !== item.sourceDigest || proof.sourceRunId !== item.sourceRunId
    || proof.claimRunId !== item.lease.runId || proof.generation !== item.generation) fail('verification binding mismatch');
  text(proof.verifierPrincipal, 'verifier principal');
  text(proof.producerPrincipal, 'producer principal');
  if (proof.verifierPrincipal === proof.producerPrincipal) fail('independent verification required');
  integer(proof.verifiedAt, 'verifiedAt', item.updatedAt, now);
  const pub = proof.publication, read = proof.appRead;
  // This reserved dimension describes an aggregate market quote, never an NM
  // or other physical-condition value. All three independently bound sides must
  // identify the same governed market basis before this scope can be completed.
  if (item.identity.condition === 'NOT_CONDITION_SPECIFIC'
    && (item.evidence.priceBasis !== 'TCGPLAYER_MARKET'
      || pub?.priceBasis !== 'TCGPLAYER_MARKET'
      || read?.priceBasis !== 'TCGPLAYER_MARKET')) fail('market quote price basis mismatch');
  if (!pub || !read || pub.key !== item.key || read.key !== item.key
    || pub.sourceDigest !== item.sourceDigest || pub.sourceRunId !== item.sourceRunId
    || pub.currency !== item.identity.currency || read.currency !== pub.currency
    || pub.condition !== item.identity.condition || read.condition !== pub.condition
    || !Number.isFinite(pub.price) || pub.price <= 0 || read.price !== pub.price
    || read.provenanceId !== pub.provenanceId || read.printingId !== pub.printingId
    || (item.identity.kind === 'master' && pub.printingId !== item.identity.printingId)) fail('publication/read-path evidence mismatch');
  text(pub.provenanceId, 'provenanceId'); text(pub.printingId, 'printingId');
  text(read.route, 'app read route');
  if (!SHA256.test(pub.evidenceDigest ?? '') || !SHA256.test(read.evidenceDigest ?? '')) fail('missing independently acquired evidence digests');
  integer(pub.publishedAt, 'publishedAt', 0, proof.verifiedAt);
  integer(read.observedAt, 'app read observedAt', pub.publishedAt, proof.verifiedAt);
  return proof;
}

export function openPricingCompletionQueueV1({ directory, trustedVerifier } = {}) {
  if (typeof directory !== 'string' || !isAbsolute(directory)) fail('explicit absolute queue directory required');
  if (trustedVerifier !== undefined && typeof trustedVerifier !== 'function') fail('invalid trusted verifier');
  const root = resolve(directory);
  assertDirectory(root);
  const snapshotPath = join(root, 'queue.json');
  const markerPath = join(root, 'initialized');
  const lockPath = join(root, 'writer.lock');

  let preparationActive = false;
  function withLockedState(use) {
    assertDirectory(root);
    let lock;
    try { lock = openSync(lockPath, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') fail('writer lock present; no automatic stale-lock recovery'); throw error; }
    let state;
    try {
      writeFileSync(lock, JSON.stringify({ token: randomUUID(), version: PRICING_COMPLETION_QUEUE_VERSION_V1 }));
      fsyncSync(lock);
      if (existsSync(snapshotPath)) {
        assertRegular(snapshotPath);
        let envelope;
        try { envelope = readPricingCompletionQueueSnapshotJsonV1(snapshotPath); } catch { fail('corrupt snapshot JSON'); }
        if (envelope.digest !== pricingCompletionDigestV1(envelope.state)) fail('snapshot checksum mismatch');
        state = validateSnapshot(envelope.state);
      } else {
        if (existsSync(markerPath)) fail('initialized queue snapshot missing; manual recovery required');
        state = { version: PRICING_COMPLETION_QUEUE_VERSION_V1, revision: 0, items: [] };
      }
      return use((change, write = true) => {
        const result = change(state);
        if (write) {
          state.revision += 1;
          validateSnapshot(state);
          // Every durable boundary retains full validation, checksum, fsync and
          // atomic rename. A session saves only repeated reads of this private
          // tree while the same exclusive lock remains continuously held.
          if (!existsSync(markerPath)) writeExclusive(markerPath, `${PRICING_COMPLETION_QUEUE_VERSION_V1}\n`);
          else assertRegular(markerPath);
          const tempPath = join(root, `queue.${randomUUID()}.tmp`);
          writeSnapshotExclusive(tempPath, state);
          renameSync(tempPath, snapshotPath);
          syncDirectory(root);
        }
        return clone(result);
      });
    } finally {
      // A retained, revoked session must not keep the full queue graph alive.
      state = null;
      closeSync(lock);
      unlinkSync(lockPath);
    }
  }
  function transaction(change, write = true) {
    if (preparationActive) fail('original queue API unavailable during preparation session');
    return withLockedState(apply => apply(change, write));
  }

  function operations(transaction) { return Object.freeze({
    ingest(observations, { now = Date.now() } = {}) {
      integer(now, 'now');
      if (!Array.isArray(observations) || observations.length > 250000) fail('invalid observations batch');
      const unique = new Map();
      const count = observations.length;
      for (let index = 0; index < count; index++) {
        const row = observationV1(observations[index]);
        if (unique.has(row.key) && pricingCompletionDigestV1(unique.get(row.key)) !== pricingCompletionDigestV1(row)) fail('conflicting duplicate observation');
        unique.set(row.key, row);
      }
      return transaction(state => {
        const byKey = new Map(state.items.map(item => [item.key, item]));
        const counts = { inserted: 0, unchanged: 0, reopened: 0 };
        for (const row of unique.values()) {
          let item = byKey.get(row.key);
          if (!item) {
            item = { ...detachedObservation(row), state: 'pending', firstSeen: now, lastSeen: now, updatedAt: now,
              generation: 1, attempts: 0, totalAttempts: 0, nextAttemptAt: now, lease: null, resolution: null, history: [] };
            event(item, now, 'discovered'); state.items.push(item); byKey.set(row.key, item); counts.inserted += 1;
          } else {
            if (now < Math.max(item.lastSeen, item.updatedAt)) fail('observation clock moved backwards');
            if (item.observationDigest !== row.observationDigest) {
              const previous = { observationDigest: item.observationDigest, reason: item.reason, state: item.state, resolution: item.resolution };
              Object.assign(item, detachedObservation(row), { state: 'pending', generation: item.generation + 1,
                attempts: 0, nextAttemptAt: now, lease: null, resolution: null });
              event(item, now, 'source_changed', { previous }); counts.reopened += 1;
            } else {
              item.priority = row.priority; item.owner = row.owner;
              // Keep an actionable blocked/failure explanation until evidence changes.
              if (item.state === 'pending') item.nextAction = row.nextAction;
              counts.unchanged += 1;
            }
            item.lastSeen = now;
          }
        }
        return counts; // Missing rows deliberately remain open.
      });
    },
    claim({ owner, runId, limit = 50, leaseMs = 300000, now = Date.now() }) {
      text(owner, 'claim owner'); text(runId, 'claim runId'); integer(limit, 'limit', 1, MAX_BATCH);
      integer(leaseMs, 'leaseMs', 1000, MAX_LEASE_MS); integer(now, 'now');
      return transaction(state => {
        expireLeases(state, now);
        const rows = ordered(state.items.filter(item => eligible(item, now))).slice(0, limit);
        for (const item of rows) {
          item.state = 'leased'; item.attempts += 1; item.totalAttempts += 1;
          item.lease = { token: randomUUID(), owner, runId, generation: item.generation, expiresAt: now + leaseMs };
          event(item, now, 'claimed', { owner, runId });
        }
        return rows;
      });
    },
    defer({ key, leaseToken, reason, nextAction, reviewRequired = false, now = Date.now() }) {
      integer(now, 'now');
      const row = { key, leaseToken, reason, nextAction, reviewRequired };
      validateDeferral(row);
      return transaction(state => deferItem(state, row, now));
    },
    deferBatch({ items, now = Date.now() }) {
      integer(now, 'now');
      if (!Array.isArray(items)) fail('invalid deferral batch');
      integer(items.length, 'deferral batch length', 1, MAX_BATCH);
      items.forEach(validateDeferral);
      if (new Set(items.map(item => item.key)).size !== items.length) fail('duplicate batch deferral key');
      return transaction(state => items.map(row => deferItem(state, row, now)));
    },
    resolve({ key, leaseToken, evidence, now = Date.now() }) {
      integer(now, 'now');
      if (!trustedVerifier) fail('independent trusted verifier is not configured; completion disabled');
      return transaction(state => {
        const item = leaseItem(state, key, leaseToken, now);
        const proof = verifiedResolution(item, trustedVerifier({ item: clone(item), evidence: clone(evidence), now }), now);
        event(item, now, 'publication_independently_verified', { runId: item.lease.runId, proofDigest: pricingCompletionDigestV1(proof) });
        item.state = 'resolved'; item.resolution = proof; item.lease = null;
        item.nextAction = 'Monitor pricing freshness and reopen on changed source evidence.';
        return item;
      });
    },
    snapshot() { return transaction(state => state, false); },
    summary({ now = Date.now() } = {}) {
      integer(now, 'now');
      return transaction(state => {
        const counts = Object.fromEntries([...STATES].map(name => [name, 0]));
        for (const item of state.items) counts[item.state] += 1;
        const open = state.items.filter(item => item.state !== 'resolved');
        return { version: state.version, revision: state.revision, total: state.items.length,
          counts, unresolved: open.length, eligible: open.filter(item => eligible(item, now)).length,
          expiredLeases: open.filter(item => item.state === 'leased' && item.lease.expiresAt <= now).length,
          oldestUnresolvedAt: open.length ? open.reduce((oldest, item) => Math.min(oldest, item.firstSeen), Infinity) : null,
          productionExecutionEnabled: false, completionVerifierConfigured: Boolean(trustedVerifier) };
      }, false);
    },
    plan({ limit = 100, now = Date.now() } = {}) {
      integer(limit, 'limit', 1, MAX_BATCH); integer(now, 'now');
      return transaction(state => {
        const groups = new Map();
        for (const item of ordered(state.items.filter(row => eligible(row, now))).slice(0, limit)) {
          const dimensions = { kind: item.identity.kind, provider: item.identity.provider ?? null,
            category: item.identity.category ?? null, scope: item.scope, reason: item.reason, owner: item.owner };
          const groupKey = pricingCompletionDigestV1(dimensions);
          const group = groups.get(groupKey) ?? { groupKey, ...dimensions, mode: 'plan_only', items: [] };
          group.items.push({ key: item.key, identity: item.identity, generation: item.generation,
            sourceDigest: item.sourceDigest, sourceRunId: item.sourceRunId, nextAction: item.nextAction });
          groups.set(groupKey, group);
        }
        return [...groups.values()];
      }, false);
    },
  }); }
  return Object.freeze({
    ...operations(transaction),
    withPreparationSession(prepare) {
      if (typeof prepare !== 'function') fail('preparation callback required');
      if (preparationActive) fail('preparation session already active');
      preparationActive = true;
      try {
        return withLockedState(apply => {
          const methods = operations(apply);
          let active = true, poisoned = false, failure;
          const session = Object.freeze(Object.fromEntries(['ingest', 'claim', 'deferBatch', 'summary'].map(name => [name, (...args) => {
            if (!active) fail('preparation session is closed');
            if (poisoned) throw failure;
            try { return methods[name](...args); }
            catch (error) { poisoned = true; failure = error; throw error; }
          }])));
          try {
            const result = prepare(session);
            if (result && typeof result.then === 'function') fail('preparation callback must be synchronous');
            if (poisoned) throw failure;
            return result;
          } finally { active = false; }
        });
      } finally { preparationActive = false; }
    },
  });
}
