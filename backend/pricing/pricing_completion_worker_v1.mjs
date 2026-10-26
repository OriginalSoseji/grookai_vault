import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { readBoundPricingInputV1, writePricingArtifactV1 } from './pricing_completion_files_v1.mjs';
import { openPricingCompletionQueueV1, pricingCompletionDigestV1 } from './pricing_completion_queue_v1.mjs';
import { importPricingBacklogV1, normalizePricingCompletionSnapshotV1 } from './pricing_completion_intake_v1.mjs';

export const PRICING_COMPLETION_WORKER_V1 = 'PRICING_COMPLETION_WORKER_V1';

function disjoint(left, right) {
  const normalize = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
  const a = normalize(left); const b = normalize(right);
  return a !== b && !a.startsWith(b + path.sep) && !b.startsWith(a + path.sep);
}

export function validatePricingCompletionDirectoriesV1({input,stateDirectory,outputDirectory}) {
  const root = fs.realpathSync(path.dirname(path.resolve(input)));
  if (!disjoint(root,stateDirectory) || !disjoint(root,outputDirectory)
      || !disjoint(stateDirectory,outputDirectory)) throw new Error('input_state_output_must_be_disjoint');
}

// Do not retain the raw bound text/snapshot while opening the durable queue.
// Intake owns its normalized evidence; only the small digest survives this scope.
function intakeInput(input,now) {
  const bound=readBoundPricingInputV1(input);
  const intake=bound.kind==='snapshot' ? normalizePricingCompletionSnapshotV1(bound.snapshot,{now})
    : importPricingBacklogV1({reportText:bound.reportText,identityGapsText:bound.identityGapsText,
      artifactHashes:{'summary.json':bound.reportDigest,'identity_mapping_gaps.jsonl':bound.rowsDigest}},{now});
  return {inputDigest:bound.digest,intake};
}

/** Preparation worker. No production executor, network client or model credential.
 * A packet is a request for evidence/review, never a production instruction.
 * Deliberately cannot load executable plugins or treat worker receipts as truth.
 */
export function runPricingCompletionCycleV1({ input, stateDirectory, outputDirectory,
  batchSize = 100, now = Date.now(), owner = 'pricing-completion-preparation-v1' }) {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error('invalid_batch_size');
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('invalid_time');
  const started = performance.now();
  const phaseTime = () => now + Math.floor(performance.now() - started);
  validatePricingCompletionDirectoriesV1({input,stateDirectory,outputDirectory});
  const {inputDigest,intake}=intakeInput(input,now);
  const queue = openPricingCompletionQueueV1({directory:stateDirectory});
  // One exclusive session retains the validated private state across the same
  // durable ingest/claim/defer boundaries, instead of reparsing it four times.
  return queue.withPreparationSession(queue => {
    const ingestion = queue.ingest(intake.observations, {now});
    // Ingestion has copied and persisted these observations. Later session steps
    // must not keep the full input evidence live alongside the private queue tree.
    delete intake.observations;
    const runId = randomUUID();
    const claims = queue.claim({owner,runId,limit:batchSize,leaseMs:300000,now:phaseTime()});
    const groups = new Map();
    for (const item of claims) {
      const groupIdentity = {scope:item.scope,owner:item.owner,reason:item.reason,sourceRunId:item.sourceRunId,
        direction:item.identity.kind,provider:item.identity.provider ?? null,category:item.identity.category ?? null,
        currency:item.identity.currency,condition:item.identity.condition};
      const groupKey = pricingCompletionDigestV1(groupIdentity);
      const packet = groups.get(groupKey) ?? {schema_version:'PRICING_COMPLETION_REVIEW_PACKET_V1',
        ...groupIdentity, inputDigest, sourceFreshness:intake.freshness,
        productionAuthority:false, requiresFreshReadback:true, items:[]};
      packet.items.push({key:item.key,identity:item.identity,sourceDigest:item.sourceDigest,
        generation:item.generation,evidence:item.evidence,nextAction:item.nextAction});
      groups.set(groupKey,packet);
    }
    const packets = [];
    for (const packet of groups.values()) {
      const digest = pricingCompletionDigestV1(packet);
      writePricingArtifactV1(outputDirectory, `packet-${digest}.json`, packet);
      packets.push({digest,items:packet.items.length});
    }
    // Persist packets before acknowledging claims. A crash leaves a retryable lease;
    // repeating preparation yields the same content-addressed packet, not a write.
    if (claims.length) queue.deferBatch({items:claims.map(item => ({key:item.key,leaseToken:item.lease.token,
      reason:'review_packet_prepared_executor_unconfigured',reviewRequired:true,
      nextAction:`${item.nextAction} Obtain a fresh dimension-complete snapshot and separately qualified execution/readback capability.`})),now:phaseTime()});
    const summary = queue.summary({now:phaseTime()});
    const report = {schema_version:PRICING_COMPLETION_WORKER_V1,observed_at:new Date(now).toISOString(),
      runId,inputDigest,mode:'prepare_only',state:'blocked_execution_capability',
      ingestion,intakeSummary:intake.summary,coverage:intake.coverage,freshness:intake.freshness,
      queue:summary,preparedItems:claims.length,packets,productionWrites:0,pricePublications:0,
      activeProductionExecutors:0,completionAllowed:false,
      nextGate:'Fresh full bidirectional input, isolated trusted executor and independent price-read verifier are required before activation.'};
    writePricingArtifactV1(outputDirectory,'latest.json',report);
    return report;
  });
}
