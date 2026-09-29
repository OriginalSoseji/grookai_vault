import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { runMarketProcessTreeV1 } from '../../backend/pricing/market_process_tree_v1.mjs';

const linux = process.platform === 'linux';
const fixture = fileURLToPath(new URL('../fixtures/market_process_tree_worker_v1.mjs', import.meta.url));
const options = { encoding: 'utf8', timeout: 5000, maxBuffer: 8192, terminationGraceMs: 100 };

test('contained successful pipeline returns its output', { skip: !linux }, async () => {
  const result = await runMarketProcessTreeV1(process.execPath, [fixture, 'success'], options);
  assert.equal(result.stdout.trim(), 'complete');
});

for (const scenario of ['abort', 'timeout', 'parent_failure', 'buffer_overflow']) {
  test(`no descendant can keep writing after ${scenario}`, { skip: !linux, timeout: 15000 }, async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'market-process-proof-'));
    const marker = path.join(dir, 'writes');
    const controller = new AbortController();
    let failure;
    const running = runMarketProcessTreeV1(process.execPath, [fixture, 'parent', marker, scenario], {
      ...options, timeout: scenario === 'timeout' ? 450 : 5000, signal: controller.signal,
    }).catch(error => { failure = error; });
    try {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        if (await fs.stat(marker).catch(() => null)) break;
        await delay(10);
      }
      assert.ok((await fs.stat(marker)).size > 0, 'grandchild must actually write before cancellation');
      if (scenario === 'abort') controller.abort();
      await running;
      assert.ok(failure, 'an interrupted pipeline must not report success');
      assert.equal(failure.processTreeTerminated, true);
      const bytes = (await fs.stat(marker)).size;
      await delay(150);
      assert.equal((await fs.stat(marker)).size, bytes, 'retry cannot overlap a surviving writer');
    } finally {
      controller.abort(); await running;
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
}
