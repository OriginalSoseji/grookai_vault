import {randomUUID} from 'node:crypto';
import {SquareApiError} from './client_v1.mjs';
const code = error => /^square_[a-z_]{1,80}$/.test(error?.code) ? error.code : 'square_worker_failed';
export async function runSquareCatalogTick({client, service, environment, enabled, maxItems = 10, runId = randomUUID()}) {
  if (!['sandbox','production'].includes(environment) || !Number.isInteger(maxItems) || maxItems < 1 || maxItems > 25) throw new SquareApiError('square_invalid_worker_request');
  const rpc = async (name, args) => {const result = await client.rpc(name, args);
    if (result.error || result.data === null) throw new SquareApiError('square_worker_state_unavailable'); return result.data;};
  const started = await rpc('square_worker_run_v1', {p_id: runId, p_action: 'start', p_result: {environment}});
  if (started.status !== 'running') return {status: started.status, resumedTerminalRun: true};
  const result = {status: 'succeeded', succeeded: 0, failed: 0, skipped: 0, errorCode: ''};
  try {
    if (!enabled) result.status = 'paused';
    else {
      const candidates = await rpc('square_poll_v3', {p_environment: environment, p_limit: maxItems});
      if (!Array.isArray(candidates) || candidates.length > maxItems) throw new SquareApiError('square_worker_candidates_invalid');
      for (const candidate of candidates) {
        await rpc('square_worker_run_v1', {p_id: runId, p_action: 'heartbeat', p_result: {}});
        try {
          const outcome = await service.sync(candidate.ownerId, candidate.connectionId, candidate.targetId, randomUUID());
          if (['synced','unchanged','reconciled'].includes(outcome.status)) result.succeeded++;
          else result.skipped++;
        } catch (error) {
          if (code(error) === 'square_connection_busy') result.skipped++;
          else {result.failed++; result.errorCode = code(error);}
        }
      }
      if (result.failed) result.status = 'failed';
    }
  } catch (error) {result.status = 'failed'; result.errorCode = code(error);}
  await rpc('square_worker_run_v1', {p_id: runId, p_action: 'finish', p_result: result});
  return {runId, ...result};
}
