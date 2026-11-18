import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {AS_OF} from './fixtures.mjs';
import {setupCurrentSampleFixture} from './current_sample_fixtures.mjs';
import {createCurrentSampleGameplayTemplate} from '../current_gameplay_template_v1.mjs';
import {limitlessPublishedReceipt} from '../adapters/limitless_published_decklists_v1.mjs';
import {digest, sha256} from '../common.mjs';
import {buildCurrentStandardUsage, readCurrentStandardUsage} from '../current_standard_usage_v1.mjs';
import {FileArtifactStore} from '../store.mjs';
import {publishCurrentStandardUsage, STANDARD_USAGE_PUBLIC_KEY} from '../current_standard_worker_v1.mjs';

function setup() {
  const f = setupCurrentSampleFixture();
  const original = f.native_proposals[0].capture;
  const captures = [original, structuredClone(original)];
  for (const [index, capture] of captures.entries()) {
    capture.event_id = String(index + 1).padStart(24, '0');
    capture.event_context.source_event_id = capture.event_id;
    for (const [kind, value] of Object.entries(capture.originals)) {
      value.receipt.id = `native-${capture.event_id}-${kind}`;
      value.receipt.url = kind === 'standings_page' ? `https://play.limitlesstcg.com/tournament/${capture.event_id}/standings` :
        `https://play.limitlesstcg.com/api/tournaments/${capture.event_id}/${kind}`;
    }
    const details = JSON.parse(capture.originals.details.receipt.body_text);
    details.id = capture.event_id;
    details.date = `2026-11-${10 + index}T12:00:00.000Z`;
    capture.originals.details.receipt.body_text = JSON.stringify(details);
    capture.originals.details.receipt.body_sha256 = sha256(capture.originals.details.receipt.body_text);
  }
  f.native_proposals = captures.map(capture => ({capture, receipt: limitlessPublishedReceipt(capture, f.native_source.id)}));
  for (const proposal of f.native_proposals) f.retention_bounds[proposal.receipt.id] = proposal.capture.retain_until;
  const template = createCurrentSampleGameplayTemplate(f, AS_OF);
  const policy = JSON.parse(fs.readFileSync(new URL('../policy_current_standard_v1.json', import.meta.url)));
  Object.assign(policy, {minimum_events: 2, minimum_lists: 4});
  const context = {packet: template.packet, sources: template.sources, receipts: template.receipts, retain_until: template.retain_until};
  return {input: {version: 'pokemon_current_standard_usage_input:v1', context, current_bindings: f.current_bindings}, policy};
}
const build = f => buildCurrentStandardUsage(f.input, f.policy, {asOf: AS_OF});

test('recent Standard lists qualify exact Common/full-art mechanics together without manual review decisions', () => {
  const f = setup(), before = digest(f), snapshot = build(f);
  assert.equal(digest(f), before);
  assert.deepEqual(build(f), snapshot);
  assert.equal(snapshot.state, 'ready');
  assert.equal(snapshot.coverage.events, 2);
  assert.equal(snapshot.coverage.lists, 4);
  const variants = snapshot.rows.filter(row => row.name === 'Fixture Draw Supporter');
  assert.equal(variants.length, 2);
  assert(variants.every(row => row.playable && row.support.events === 2 && row.support.lists === 4));
  assert.equal(variants[0].gameplay_id, variants[1].gameplay_id);
  assert.equal(snapshot.date_basis, 'publisher_event_date_with_completed_decklists');
});

test('different mechanics stay separate and current canonical/source ownership drift is rejected', () => {
  const drift = setup(); drift.input.current_bindings.catalog[0].identity_key_hash = sha256('drift');
  assert.throws(() => build(drift), /STANDARD_USAGE_IDENTITY_DRIFT/);
  const owner = setup(); owner.input.current_bindings.mappings[0].active = false;
  assert.throws(() => build(owner), /STANDARD_USAGE_IDENTITY_DRIFT/);
  const f = setup(), result = build(f);
  assert(result.coverage.gameplay_groups < result.coverage.catalog_members);
  assert.notEqual(result.rows.find(row => row.name === 'Fixture Basic Pokemon').gameplay_id,
    result.rows.find(row => row.name === 'Fixture Draw Supporter').gameplay_id);
});

test('duplicate captures do not multiply support', () => {
  const f = setup(), baseline = build(f);
  const original = f.input.context.receipts.find(receipt => receipt.kind === 'tournament');
  f.input.context.receipts.push({...structuredClone(original), id: 'duplicate-event'});
  const result = build(f);
  assert.deepEqual(result.coverage, baseline.coverage);
  assert.deepEqual(result.rows, baseline.rows);
});

test('global thresholds hold insufficient evidence', () => {
  const f = setup(); f.policy.minimum_events = 3;
  const result = build(f);
  assert.equal(result.state, 'insufficient_evidence');
  assert(result.rows.every(row => !row.playable));
  assert.equal(result.coverage.mapping_ratio, 1);
});

test('invalid source scope and the exact 30-day boundary contribute no lists', () => {
  for (const edit of [details => { details.isOnline = true; }, details => { details.format = 'EXPANDED'; },
    details => { details.date = '2026-10-13T12:00:00.000Z'; }]) {
    const f = setup();
    for (const receipt of f.input.context.receipts.filter(receipt => receipt.kind === 'tournament')) {
      const capture = JSON.parse(receipt.body_text), original = capture.originals.details.receipt;
      const details = JSON.parse(original.body_text); edit(details);
      original.body_text = JSON.stringify(details); original.body_sha256 = sha256(original.body_text);
      receipt.body_text = JSON.stringify(capture); receipt.body_sha256 = sha256(receipt.body_text);
      // This mutation changes exact originals referenced by the existing packet.
      for (const group of f.input.context.packet.groups) for (const alias of group.aliases) {
        for (const ref of alias.event_originals) if (ref.id === receipt.id) ref.receipt_hash = digest(receipt);
      }
    }
    const result = build(f);
    assert.equal(result.coverage.events, 0);
    assert.equal(result.state, 'insufficient_evidence');
  }
});

test('reader enforces exact expiry, integrity and current identity before returning positives', () => {
  const f = setup(), snapshot = build(f);
  assert.equal(readCurrentStandardUsage(snapshot, {now: AS_OF, current_bindings: f.input.current_bindings}).rows.length, 4);
  assert.equal(readCurrentStandardUsage(snapshot, {now: snapshot.valid_until, current_bindings: f.input.current_bindings}).state, 'stale');
  const changed = structuredClone(snapshot); changed.rows[0].support.lists++;
  assert.equal(readCurrentStandardUsage(changed, {now: AS_OF, current_bindings: f.input.current_bindings}).state, 'invalid_snapshot');
  const bindings = structuredClone(f.input.current_bindings); bindings.catalog[0].identity_key_hash = sha256('new identity');
  assert.equal(readCurrentStandardUsage(snapshot, {now: AS_OF, current_bindings: bindings}).state, 'catalog_changed');
});

async function fileStore(t, Store = FileArtifactStore) {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'grookai-standard-usage-'));
  t.after(async () => {
    assert(path.resolve(directory).startsWith(`${path.resolve(os.tmpdir())}${path.sep}grookai-standard-usage-`));
    await fsp.rm(directory, {recursive: true, force: true});
  });
  return new Store(directory);
}

test('worker persists originals and reads back a minimal atomic manifest; reruns are idempotent', async t => {
  const f = setup(), store = await fileStore(t);
  const options = {...f, store, asOf: AS_OF, clock: () => AS_OF};
  const result = await publishCurrentStandardUsage(options);
  assert.equal(result.manifest.rows.length, 4);
  assert.deepEqual(Object.keys(result.manifest.rows[0]).sort(), ['card_print_id', 'events', 'gv_id', 'lists']);
  assert.equal((await store.list('raw')).length, f.input.context.receipts.length);
  assert.deepEqual(await store.get(STANDARD_USAGE_PUBLIC_KEY), result.manifest);
  assert.equal((await publishCurrentStandardUsage(options)).idempotent, true);
  assert.equal(await store.get('current.json'), null);
});

test('binding drift preserves previous visibility and persists the failed stage', async t => {
  const f = setup(), store = await fileStore(t);
  const options = {...f, store, asOf: AS_OF, clock: () => AS_OF};
  await publishCurrentStandardUsage(options);
  const previous = await store.get(STANDARD_USAGE_PUBLIC_KEY);
  let reads = 0;
  await assert.rejects(publishCurrentStandardUsage({...options, bindingsLoader: async () => {
    const value = structuredClone(f.input.current_bindings);
    if (++reads === 2) value.catalog[0].identity_key_hash = sha256('changed');
    return value;
  }}), /STANDARD_USAGE_BINDINGS_CHANGED/);
  assert.deepEqual(await store.get(STANDARD_USAGE_PUBLIC_KEY), previous);
  const runs = await Promise.all((await store.list('runs')).map(key => store.get(key)));
  assert(runs.some(run => run.status === 'failed' && run.stage === 'publish'));
});

test('a publication failure preserves the previous complete manifest', async t => {
  class FailingStore extends FileArtifactStore {
    async put(key, value, options) {
      if (this.fail && key === STANDARD_USAGE_PUBLIC_KEY) { this.fail = false; throw new Error('INJECTED_PUBLICATION_FAILURE'); }
      return super.put(key, value, options);
    }
  }
  const f = setup(), store = await fileStore(t, FailingStore);
  const options = {...f, store, asOf: AS_OF, clock: () => AS_OF};
  await publishCurrentStandardUsage(options);
  const previous = await store.get(STANDARD_USAGE_PUBLIC_KEY);
  store.fail = true;
  await assert.rejects(publishCurrentStandardUsage(options), /INJECTED_PUBLICATION_FAILURE/);
  assert.deepEqual(await store.get(STANDARD_USAGE_PUBLIC_KEY), previous);
  const runs = await Promise.all((await store.list('runs')).map(key => store.get(key)));
  assert(runs.some(run => run.status === 'failed'));
});
