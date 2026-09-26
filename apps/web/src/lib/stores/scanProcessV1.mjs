import { fork } from 'node:child_process';
import fs from 'node:fs';

export class ScanProcessError extends Error {
  constructor(code) { super(code === 'timeout' ? 'Matching timed out.' : code === 'aborted' ? 'Matching cancelled.' : 'Matching could not finish.'); this.code = code; }
}

// One disposable process owns decoding, OCR and its nested workers. Killing it
// ends all of that work, including a reader that never resolves its promise.
export function runScanProcess(entry, payload, { timeoutMs = 20_000, signal } = {}) {
  if (signal?.aborted) return Promise.reject(new ScanProcessError('aborted'));
  if (!fs.existsSync(entry)) return Promise.reject(new ScanProcessError('worker_missing'));
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 25_000) throw new Error('Invalid scan deadline.');
  return new Promise((resolve, reject) => {
    let child, timer, outcome, finished = false;
    const end = (error, value) => {
      if (finished || outcome) return;
      outcome = { error, value };
      clearTimeout(timer); signal?.removeEventListener('abort', abort);
      if (child?.pid && child.exitCode === null && child.signalCode === null) { if (!child.kill('SIGKILL')) settle(); }
      else settle();
    };
    const settle = () => {
      if (finished) return;
      finished = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      if (outcome && !outcome.error) resolve(outcome.value);
      else reject(outcome?.error ?? new ScanProcessError('failed'));
    };
    const abort = () => end(new ScanProcessError('aborted'));
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => end(new ScanProcessError('timeout')), timeoutMs);
    // No Supabase/Stripe/hosting secrets or caller-controlled NODE_OPTIONS.
    const env = Object.fromEntries(['SystemRoot', 'WINDIR', 'PATH', 'Path', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LD_LIBRARY_PATH', 'LANG', 'LC_ALL'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
    env.NODE_ENV = 'production'; env.OMP_THREAD_LIMIT = '1';
    try {
      child = fork(entry, [], { env, execArgv: ['--max-old-space-size=512'], serialization: 'advanced', stdio: ['ignore', 'ignore', 'ignore', 'ipc'], windowsHide: true });
      child.once('error', () => end(new ScanProcessError('failed')));
      child.once('exit', code => { if (!outcome) outcome = { error: new ScanProcessError(code === 127 ? 'runtime_library_missing' : 'worker_exit'), value: undefined }; settle(); });
      child.once('message', message => {
        if (message?.ok === true && message.result && Array.isArray(message.result.candidates)) end(null, message.result);
        else end(new ScanProcessError(['load_reference', 'prepare_index', 'import_engine', 'matching', 'result'].includes(message?.stage) ? 'worker_' + message.stage : 'failed'));
      });
      child.send(payload, error => { if (error) end(new ScanProcessError('failed')); });
      if (signal?.aborted) abort();
    } catch { end(new ScanProcessError('failed')); }
  });
}

export async function readScanBody(body, { maxBytes, timeoutMs = 5_000, signal } = {}) {
  if (!body) throw new ScanProcessError('empty');
  if (signal?.aborted) throw new ScanProcessError('aborted');
  const reader = body.getReader(), chunks = [];
  let timer, abort, length = 0;
  const stop = code => { void reader.cancel().catch(() => {}); throw new ScanProcessError(code); };
  const reading = (async () => {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > maxBytes) stop('too_large');
      chunks.push(value);
    }
    if (!length) throw new ScanProcessError('empty');
    return Buffer.concat(chunks, length);
  })();
  try {
    return await Promise.race([reading, new Promise((_, reject) => {
      const cancel = code => { void reader.cancel().catch(() => {}); reject(new ScanProcessError(code)); };
      timer = setTimeout(() => cancel('timeout'), timeoutMs);
      abort = () => cancel('aborted'); signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    })]);
  } finally { clearTimeout(timer); if (abort) signal?.removeEventListener('abort', abort); }
}
