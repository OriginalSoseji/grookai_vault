import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

async function liveGroupMembers(group) {
  const members = [];
  for (const entry of await readdir('/proc')) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const stat = await readFile(`/proc/${entry}/stat`, 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      // state, ppid, pgrp, session. Zombies cannot issue further writes.
      if (Number(fields[2]) === group && Number(fields[3]) === group && fields[0] !== 'Z') {
        members.push(Number(entry));
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error;
    }
  }
  return members;
}

function signalGroup(group, signal) {
  try { process.kill(-group, signal); }
  catch (error) { if (error.code !== 'ESRCH') throw error; }
}

async function drainGroup(group, graceMs) {
  if (!(await liveGroupMembers(group)).length) return;
  signalGroup(group, 'SIGTERM');
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    if (!(await liveGroupMembers(group)).length) return;
    await delay(25);
  }
  signalGroup(group, 'SIGKILL');
  const hardDeadline = Date.now() + 5000;
  while (Date.now() < hardDeadline) {
    if (!(await liveGroupMembers(group)).length) return;
    await delay(25);
  }
  throw Object.assign(new Error('Pipeline descendants remain alive; retry is forbidden'), {
    code: 'PROCESS_TREE_CLEANUP_FAILED', processTreeTerminated: false,
  });
}

// The authoritative scheduled runtime is Linux/systemd. A separate process
// group includes nested warehouse/publication workers, not just the pipeline
// parent. Never allow a retry while a descendant can still write.
export async function runMarketProcessTreeV1(file, args, options = {}) {
  if (process.platform !== 'linux') throw new Error('Live scheduled pricing requires Linux process containment');
  const { signal, timeout = 0, terminationGraceMs = 5000,
    encoding = 'utf8', maxBuffer = 1024 * 1024, ...rest } = options;
  signal?.throwIfAborted();
  // execFile does not forward detached to spawn. Use spawn directly so the
  // negative PID below actually addresses a dedicated process group.
  const child = spawn(file, args, { ...rest, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stopError;
  let terminationError;
  let escalation;
  const stop = error => {
    stopError ??= error;
    if (child.pid) {
      try { signalGroup(child.pid, 'SIGTERM'); }
      catch (failure) { terminationError ??= failure; }
      escalation ??= setTimeout(() => {
        try { signalGroup(child.pid, 'SIGKILL'); }
        catch (failure) { terminationError ??= failure; }
      }, terminationGraceMs);
    }
  };
  const abort = () => stop(Object.assign(new Error('Pipeline aborted after losing execution authority'), { code: 'ABORT_ERR' }));
  const chunks = { stdout: [], stderr: [] };
  const lengths = { stdout: 0, stderr: 0 };
  for (const stream of ['stdout', 'stderr']) child[stream].on('data', chunk => {
    const available = Math.max(0, maxBuffer - lengths[stream]);
    if (available > 0) chunks[stream].push(chunk.subarray(0, available));
    lengths[stream] += chunk.length;
    if (lengths[stream] > maxBuffer) stop(Object.assign(new Error(`Pipeline ${stream} exceeded maxBuffer`), {
      code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',
    }));
  });
  const operation = new Promise((resolve, reject) => {
    let spawnError;
    child.once('error', error => { spawnError = error; });
    child.once('close', (code, exitSignal) => {
      const output = Object.fromEntries(Object.entries(chunks).map(([key, value]) => [key, Buffer.concat(value).toString(encoding)]));
      if (spawnError || code !== 0) reject(Object.assign(spawnError ?? new Error(`Pipeline exited ${code ?? exitSignal}`), {
        ...output, code: spawnError?.code ?? code, signal: exitSignal,
      }));
      else resolve(output);
    });
  });
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = timeout > 0 ? setTimeout(() => stop(Object.assign(new Error('Pipeline timed out'), { code: 'ETIMEDOUT' })), timeout) : null;
  let exitCheck = Promise.resolve();
  const exited = () => { exitCheck = (async () => {
    try {
      if (child.pid && (await liveGroupMembers(child.pid)).length) {
        stop(Object.assign(new Error('Pipeline descendant outlived its parent'), { code: 'PIPELINE_DESCENDANT_OUTLIVED_PARENT' }));
      }
    } catch (error) { terminationError ??= error; }
  })(); };
  child.once('exit', exited);
  let result, failure;
  try { result = await operation; }
  catch (error) { failure = error; }
  finally {
    await exitCheck;
    clearTimeout(timer); clearTimeout(escalation);
    signal?.removeEventListener('abort', abort);
    child.removeListener('exit', exited);
  }
  try {
    if (terminationError) throw terminationError;
    if (child.pid) await drainGroup(child.pid, terminationGraceMs);
  } catch (error) {
    throw Object.assign(error, { code: 'PROCESS_TREE_CLEANUP_FAILED', processTreeTerminated: false,
      stdout: failure?.stdout ?? result?.stdout ?? '', stderr: failure?.stderr ?? result?.stderr ?? '' });
  }
  if (stopError || failure) {
    throw Object.assign(stopError ?? failure, { processTreeTerminated: true,
      stdout: failure?.stdout ?? result?.stdout ?? '', stderr: failure?.stderr ?? result?.stderr ?? '' });
  }
  return result;
}
