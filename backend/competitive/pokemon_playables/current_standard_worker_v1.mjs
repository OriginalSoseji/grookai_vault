import {randomUUID} from 'node:crypto';
import {assert, DAY_MS, digest, safeFailure, timestamp} from './common.mjs';
import {buildCurrentStandardUsage, readCurrentStandardUsage} from './current_standard_usage_v1.mjs';

export const STANDARD_USAGE_PUBLIC_KEY = 'standard-usage/current.json';

export function publicStandardUsage(snapshot, bindings, now) {
  const result = readCurrentStandardUsage(snapshot, {now, current_bindings: bindings});
  assert(['ready', 'insufficient_evidence'].includes(result.state), 'STANDARD_USAGE_UNREADABLE');
  return {version: 'pokemon_playables_public:v1', game: 'pokemon', format: 'standard', platform: 'paper',
    state: result.state, snapshot_id: result.snapshot_id, as_of: result.as_of, valid_until: result.valid_until,
    definition: result.definition, coverage: result.coverage, source_attribution: result.source_attribution,
    rows: result.rows.map(row => ({card_print_id: row.card_print_id, gv_id: row.gv_id,
      lists: row.support.lists, events: row.support.events}))};
}

// A separate atomic object keeps the simple usage feature independent of the
// retained exact-print eligibility worker and its current.json pointer.
export async function publishCurrentStandardUsage({store, input, policy, asOf, bindingsLoader,
  clock = () => new Date().toISOString()}) {
  return store.withLock(async () => {
    const run = {run_id: randomUUID(), purpose: 'current_standard_usage', started_at: clock(), stage: 'start', status: 'running'};
    let previous, replacing = false;
    try {
      await store.saveRun(run);
      assert(store.local || bindingsLoader, 'STANDARD_USAGE_REMOTE_BINDINGS_REQUIRED');
      assert(Math.abs(timestamp(clock()) - timestamp(asOf)) < 300000 || store.local, 'STANDARD_USAGE_CURRENT_BUILD_REQUIRED');
      run.stage = 'raw_ingress';
      const sources = new Map(input.context.sources.map(source => [source.id, source]));
      for (const receipt of input.context.receipts) {
        const source = sources.get(receipt.source_id);
        assert(source && Number.isFinite(source.retention_days), 'STANDARD_USAGE_SOURCE_REQUIRED');
        const until = new Date(Math.min(timestamp(input.context.retain_until),
          timestamp(receipt.observed_at) + source.retention_days * DAY_MS,
          receipt.retain_until ? timestamp(receipt.retain_until) : Infinity)).toISOString();
        assert(timestamp(until) > timestamp(asOf), 'STANDARD_USAGE_EXPIRED_ORIGINAL');
        const reference = await store.saveRaw(receipt, until);
        await store.refineRawRetention(reference, until);
      }
      run.stage = 'build';
      const ids = [...new Set(input.context.packet.groups.flatMap(group => group.members.map(member => member.provider_card_id)))].sort();
      const bindings = bindingsLoader ? await bindingsLoader(ids) : input.current_bindings;
      const snapshot = buildCurrentStandardUsage({...input, current_bindings: bindings}, policy, {asOf});
      const snapshotKey = `snapshots/standard-usage-${snapshot.snapshot_id}.json`;
      const envelope = {kind: 'current_standard_usage', retain_until: input.context.retain_until, snapshot};
      const existing = await store.get(snapshotKey);
      if (!existing) await store.put(snapshotKey, envelope, {immutable: true});
      assert(digest(await store.get(snapshotKey)) === digest(envelope), 'STANDARD_USAGE_SNAPSHOT_READBACK');
      run.stage = 'publish';
      const current = bindingsLoader ? await bindingsLoader(ids) : bindings;
      assert(digest(current) === digest(bindings), 'STANDARD_USAGE_BINDINGS_CHANGED');
      const manifest = publicStandardUsage(snapshot, current, store.local ? asOf : clock());
      previous = await store.get(STANDARD_USAGE_PUBLIC_KEY);
      // Persist the successful computation before atomically replacing visibility.
      await store.saveRun({...run, status: 'succeeded', stage: 'computed', snapshot_id: snapshot.snapshot_id, finished_at: clock()});
      replacing = true;
      await store.put(STANDARD_USAGE_PUBLIC_KEY, manifest);
      assert(digest(await store.get(STANDARD_USAGE_PUBLIC_KEY)) === digest(manifest), 'STANDARD_USAGE_PUBLIC_READBACK');
      return {run_id: run.run_id, snapshot_key: snapshotKey, manifest, idempotent: Boolean(existing)};
    } catch (error) {
      let rollbackFailed = false;
      if (replacing) {
        try {
          if (previous) await store.put(STANDARD_USAGE_PUBLIC_KEY, previous);
          else await store.remove(STANDARD_USAGE_PUBLIC_KEY);
        } catch { rollbackFailed = true; }
      }
      await store.saveRun({...run, status: 'failed', finished_at: clock(), rollback_failed: rollbackFailed, ...safeFailure(error)});
      throw error;
    }
  });
}
