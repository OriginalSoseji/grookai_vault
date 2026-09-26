import fs from 'node:fs';

// Diagnostics only: own process and the child PID returned by fork(). No process
// enumeration, user data, paths, credentials or image identifiers are emitted.
export function parseProcessMemoryV26(text) {
  if (typeof text !== 'string' || text.length > 65536) return null;
  const value = name => { const match = text.match(new RegExp('^' + name + ':\\s+(\\d+) kB$', 'm')); const n = match ? Number(match[1]) * 1024 : NaN; return Number.isSafeInteger(n) && n >= 0 ? n : null; };
  return { rssBytes: value('VmRSS'), highWaterBytes: value('VmHWM') };
}
export function createResourceSamplerV26(childPid, { read = file => fs.readFileSync(file, 'utf8'), platform = process.platform, ownMemory = () => process.memoryUsage().rss, intervalMs = 200 } = {}) {
  if (!Number.isSafeInteger(childPid) || childPid <= 0 || !Number.isSafeInteger(intervalMs) || intervalMs < 50 || intervalMs > 1000) throw new Error('Invalid resource sampler.');
  const started = performance.now();
  const result = { version: 'scan_resources_v26', platform, intervalMs, samples: 0, parentPeakRssBytes: 0, parentFinalRssBytes: null, childPeakRssBytes: null, parentLifetimeHighWaterBytes: null, childHighWaterBytes: null, combinedPeakRssBytes: null, containerPeakObservedBytes: null, containerLimitBytes: null };
  let stopped = false;
  const safeRead = file => { try { return read(file); } catch { return null; } };
  const bytes = file => { const s = safeRead(file)?.trim(); if (!s || !/^\d{1,16}$/.test(s)) return null; const n = Number(s); return Number.isSafeInteger(n) && n > 0 ? n : null; };
  const maximum = (key, value) => { if (Number.isFinite(value)) result[key] = Math.max(result[key] ?? 0, value); };
  function sample() {
    if (stopped) return;
    try {
      result.samples++;
      const parent = platform === 'linux' ? parseProcessMemoryV26(safeRead('/proc/self/status')) : null;
      const child = platform === 'linux' ? parseProcessMemoryV26(safeRead('/proc/' + childPid + '/status')) : null;
      const parentRss = parent?.rssBytes ?? ownMemory();
      if (Number.isFinite(parentRss)) result.parentFinalRssBytes = parentRss;
      maximum('parentPeakRssBytes', parentRss); maximum('parentLifetimeHighWaterBytes', parent?.highWaterBytes);
      maximum('childPeakRssBytes', child?.rssBytes); maximum('childHighWaterBytes', child?.highWaterBytes);
      if (Number.isFinite(child?.rssBytes)) maximum('combinedPeakRssBytes', parentRss + child.rssBytes);
      if (platform === 'linux') {
        maximum('containerPeakObservedBytes', bytes('/sys/fs/cgroup/memory.current') ?? bytes('/sys/fs/cgroup/memory/memory.usage_in_bytes'));
        result.containerLimitBytes ??= bytes('/sys/fs/cgroup/memory.max') ?? bytes('/sys/fs/cgroup/memory/memory.limit_in_bytes');
      }
    } catch { /* Diagnostics cannot fail a matching request. */ }
  }
  sample(); const timer = setInterval(sample, intervalMs); timer.unref();
  return {
    sample,
    stop() { if (!stopped) { sample(); stopped = true; clearInterval(timer); } return { ...result, elapsedMs: Math.round(performance.now() - started) }; },
  };
}
