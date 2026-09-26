import { fork } from 'node:child_process';
import fs from 'node:fs';
import { ScanProcessError } from './scanProcessV1.mjs';
import { validateReferenceIds, validateReferencePackets } from './scanReferenceDeliveryV24.mjs';
import { createResourceSamplerV26 } from './scanResourceSamplerV26.mjs';
import { validateFeaturePacketsV29 } from './scanFeatureDeliveryV29.mjs';

// One deadline covers child startup, retrieval, parent reference delivery and CV.
// Only the parent loader receives credentials/network access. No scan is stored.
export function runVisualProcessV24(entry, bytes, { byId, loadReferences, featureManifest, timeoutMs = 20_000, signal, onProgress, onResources } = {}) {
  if (signal?.aborted) return Promise.reject(new ScanProcessError('aborted'));
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 4 * 1024 * 1024
    || !(byId instanceof Map) || typeof loadReferences !== 'function' || (featureManifest !== undefined && !(featureManifest instanceof Map))
    || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new Error('Invalid visual request.');
  if (!fs.existsSync(entry)) return Promise.reject(new ScanProcessError('worker_missing'));
  return new Promise((resolve, reject) => {
    let child, timer, sampler, outcome, finished = false, phase = 'request', delivered = new Set(), progressCount = 0;
    const started = performance.now();
    const progress = stage => onProgress?.({ stage, ms: Math.round(performance.now() - started) });
    const controller = new AbortController();
    const settle = () => {
      if (finished) return; finished = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      controller.abort();
      if (sampler) { try { onResources({ ...sampler.stop(), outcome: outcome?.error?.code ?? (outcome ? 'complete' : 'failed') }); } catch { /* Diagnostics cannot change the result. */ } }
      if (outcome && !outcome.error) resolve(outcome.value); else reject(outcome?.error ?? new ScanProcessError('failed'));
    };
    const end = (error, value) => {
      if (outcome || finished) return; outcome = { error, value }; controller.abort(); clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      sampler?.sample();
      if (child?.pid && child.exitCode === null && child.signalCode === null) { if (!child.kill('SIGKILL')) settle(); } else settle();
    };
    const abort = () => end(new ScanProcessError('aborted'));
    timer = setTimeout(() => end(new ScanProcessError('timeout')), timeoutMs);
    signal?.addEventListener('abort', abort, { once: true });
    const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'PATH', 'Path', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LD_LIBRARY_PATH', 'LANG', 'LC_ALL'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
    env.NODE_ENV = 'production'; env.OMP_THREAD_LIMIT = '1';
    try {
      child = fork(entry, [], { env, execArgv: ['--max-old-space-size=512'], serialization: 'advanced', stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true });
      if (onResources && child.pid) sampler = createResourceSamplerV26(child.pid);
      child.once('error', () => end(new ScanProcessError('failed')));
      child.once('exit', () => { outcome ??= { error: new ScanProcessError('worker_exit') }; settle(); });
      child.on('message', async message => {
        if (outcome || finished) return;
        try {
          if (message?.version !== 'v24') throw new Error('Unknown protocol.');
          if (message.kind === 'progress' && ['request', 'loading', 'result'].includes(phase) && progressCount++ < 8
            && ['catalog','index','shortlist','opencv','geometry','prepared'].includes(message.stage)) {
            progress(message.stage);
          } else if (message.kind === 'references' && phase === 'request') {
            const ids = message.ids; validateReferenceIds(ids, byId); phase = 'loading';
            progress('delivery_start');
            const packets = await loadReferences(ids, { signal: controller.signal });
            if (outcome || finished) return;
            if (featureManifest) validateFeaturePacketsV29(packets, ids, byId, featureManifest);
            else validateReferencePackets(packets, ids, byId);
            delivered = new Set(packets.map(p => p.id)); phase = 'result';
            progress('delivery_complete');
            child.send({ version: 'v24', kind: 'references', packets }, error => { if (error) end(new ScanProcessError('failed')); });
          } else if (message.kind === 'result' && phase === 'result') {
            const result = message.result;
            if (!result || !['suggestions', 'no_match', 'manual_review'].includes(result.status) || !Array.isArray(result.candidates)
              || result.candidates.length > 1 || (result.status === 'suggestions') !== (result.candidates.length === 1)
              || result.candidates.some(c => !c || !delivered.has(c.id) || ![0, 90, 180, 270].includes(c.rotation))) throw new Error('Invalid visual result.');
            const candidates = result.candidates.map(({ id, rotation }) => ({ id, rotation }));
            progress('complete');
            end(null, { version: 'vendor_scan_visual_v24', status: result.status, candidates,
              references: candidates.map(({ id }) => { const row = byId.get(id); return { id, gv_id: row.gv_id, image_path: row.image_path }; }) });
          } else throw new Error('Unexpected worker message.');
        } catch { end(new ScanProcessError('worker_matching')); }
      });
      child.send({ version: 'v24', kind: 'start', bytes }, error => { if (error) end(new ScanProcessError('failed')); });
      if (signal?.aborted) abort();
    } catch { end(new ScanProcessError('failed')); }
  });
}
