import { randomUUID } from 'node:crypto';
import { assert, DAY_MS, digest, ENGINE_VERSION, EngineError, iso, safeFailure, timestamp } from './common.mjs';
import { acquireInputReceipts } from './acquire.mjs';
import { buildCohortReview } from './cohort.mjs';
import { normalizeEventExport, prepareEvidence } from './evidence.mjs';
import { validatePolicy } from './policy.mjs';

export async function reviewCohort({ store, input, policy, asOf, bindingsLoader, fetchImpl, clock = () => new Date().toISOString() }) {
  return runPrivateReview({ store, input, policy, asOf, bindingsLoader, fetchImpl, clock,
    purpose: 'cohort_review', reportBuilder: buildCohortReview,
    bindingIds: value => value.cohort.provider_card_ids, localBindings: value => value.cohort.bindings });
}

// Shared private-review lifecycle. Builders/loaders are backend code, never
// user-supplied executable input. Neither review lane changes publication state.
export async function runPrivateReview({ store, input, policy, asOf, bindingsLoader, fetchImpl,
  clock = () => new Date().toISOString(), purpose, reportBuilder, bindingIds, localBindings }) {
  return store.withLock(async () => {
    const run = { run_id: randomUUID(), engine_version: ENGINE_VERSION, purpose,
      stage: 'start', status: 'running', started_at: iso(clock()) };
    try {
      await store.saveRun(run); validatePolicy(policy);
      prepareEvidence(input, policy, timestamp(asOf), 'shadow');
      assert(store.local || input.synthetic !== true, 'SYNTHETIC_INPUT_FORBIDDEN_IN_REMOTE_STORE');
      if (input.acquisitions?.length) {
        assert(Math.abs(timestamp(clock()) - timestamp(asOf)) < 300000, 'LIVE_ACQUISITION_REQUIRES_CURRENT_AS_OF');
        run.stage = 'acquisition';
        input = await acquireInputReceipts(input, policy, iso(clock()), fetchImpl, async (receipt, source) => {
          await store.saveRaw(receipt, new Date(Math.min(timestamp(receipt.observed_at) + source.retention_days * DAY_MS,
            receipt.retain_until===undefined?Infinity:timestamp(receipt.retain_until))).toISOString());
        });
        asOf = iso(clock());
      }
      const evidence = prepareEvidence(input, policy, timestamp(asOf), 'shadow'), refs = [], bounds = [];
      run.stage = 'raw_ingress';
      for (const receipt of input.receipts) {
        const until = Math.min(timestamp(receipt.observed_at) + evidence.sources.get(receipt.source_id).retention_days * DAY_MS,
          receipt.retain_until===undefined?Infinity:timestamp(receipt.retain_until));
        refs.push(await store.saveRaw(receipt, iso(new Date(until).toISOString()))); bounds.push(until);
      }
      run.stage = `${purpose}_normalize`;
      for (let i = 0; i < input.receipts.length; i++) {
        const receipt = input.receipts[i];
        if (receipt.kind !== 'tournament') continue;
        bounds[i] = Math.min(bounds[i], ...normalizeEventExport(receipt, evidence.sources.get(receipt.source_id), policy, timestamp(asOf))
          .map(event => timestamp(event.expires_at)));
        await store.refineRawRetention(refs[i], new Date(bounds[i]).toISOString());
      }
      const retainUntil = new Date(Math.min(...bounds, timestamp(asOf) + 30 * DAY_MS)).toISOString();
      assert(timestamp(retainUntil) > timestamp(asOf), 'COHORT_EVIDENCE_EXPIRED');
      const ids = bindingIds(input, policy, asOf);
      const bindings = bindingsLoader ? await bindingsLoader(ids) : localBindings(input);
      assert(bindings && Array.isArray(bindings.mappings) && Array.isArray(bindings.catalog), 'COHORT_BINDINGS_REQUIRED');
      const report = reportBuilder(input, policy, asOf, bindings);
      if (bindingsLoader) assert(digest(await bindingsLoader(ids)) === digest(bindings), 'COHORT_BINDINGS_CHANGED');
      const { receipts, ...context } = input;
      const envelope = { kind: 'cohort_review', retain_until: retainUntil, run_id: run.run_id,
        report, context, policy, bindings, raw_keys: refs.map(ref => ref.key) };
      const key = `reviews/${report.report_id}.json`, existing = await store.get(key);
      if (!existing) await store.put(key, envelope, { immutable: true });
      const readback = await store.get(key);
      assert(digest(readback.report) === digest(report) && digest(readback.bindings) === digest(bindings) &&
        digest(readback.context) === digest(context) && digest(readback.policy) === digest(policy) &&
        digest(readback.raw_keys) === digest(envelope.raw_keys), 'COHORT_REVIEW_READBACK_MISMATCH');
      await store.saveRun({ ...run, status: 'succeeded', stage: `${purpose}_saved`, report_id: report.report_id, finished_at: iso(clock()) });
      return { run_id: run.run_id, report_key: key, report, retained_until: retainUntil, idempotent: Boolean(existing) };
    } catch (error) {
      try { await store.saveRun({ ...run, status: 'failed', finished_at: iso(clock()), ...safeFailure(error) }); }
      catch { const failure = new EngineError('FAILURE_PERSISTENCE_UNAVAILABLE'); failure.run_id = run.run_id; throw failure; }
      error.run_id = run.run_id; throw error;
    }
  });
}
