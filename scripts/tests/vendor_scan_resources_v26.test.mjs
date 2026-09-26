import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceSamplerV26, parseProcessMemoryV26 } from '../../apps/web/src/lib/stores/scanResourceSamplerV26.mjs';
test('reads bounded RSS and high-water fields, not arbitrary status content', () => {
  assert.deepEqual(parseProcessMemoryV26('Name:\tprivate\nVmRSS:\t123 kB\nVmHWM:\t456 kB\n'), { rssBytes: 123 * 1024, highWaterBytes: 456 * 1024 });
  assert.equal(parseProcessMemoryV26('x'.repeat(65537)), null);
  assert.deepEqual(parseProcessMemoryV26('VmRSS: -1 kB\nVmHWM: nope kB'), { rssBytes: null, highWaterBytes: null });
});
test('samples only own/child PIDs, tracks simultaneous sum and stops sampling', () => {
  const reads = [], data = new Map([
    ['/proc/self/status', 'VmRSS: 100 kB\nVmHWM: 300 kB'], ['/proc/42/status', 'VmRSS: 200 kB\nVmHWM: 400 kB'],
    ['/sys/fs/cgroup/memory.current', '512000'], ['/sys/fs/cgroup/memory.max', '2147483648'],
  ]);
  const sampler = createResourceSamplerV26(42, { platform: 'linux', read: p => { reads.push(p); if (!data.has(p)) throw Error('absent'); return data.get(p); }, intervalMs: 1000 });
  data.set('/proc/42/status', 'VmRSS: 350 kB\nVmHWM: 450 kB'); sampler.sample();
  const value = sampler.stop(), count = reads.length; sampler.sample(); sampler.stop(); assert.equal(reads.length, count);
  assert.equal(value.combinedPeakRssBytes, 450 * 1024); assert.equal(value.childHighWaterBytes, 450 * 1024);
  assert.equal(value.parentLifetimeHighWaterBytes, 300 * 1024); assert.equal(value.containerPeakObservedBytes, 512000); assert.equal(value.containerLimitBytes, 2147483648);
  assert.ok(reads.every(p => data.has(p))); assert.equal('childPid' in value, false);
});
test('unavailable Linux/cgroup data remains unknown; Windows does not pretend to measure child RSS', () => {
  for (const platform of ['linux', 'win32']) {
    const sampler = createResourceSamplerV26(42, { platform, read: () => { throw Error('not permitted'); }, ownMemory: () => 1000 });
    const value = sampler.stop(); assert.equal(value.parentPeakRssBytes, 1000); assert.equal(value.childPeakRssBytes, null); assert.equal(value.combinedPeakRssBytes, null); assert.equal(value.containerLimitBytes, null);
  }
  assert.throws(() => createResourceSamplerV26('../1'));
});
