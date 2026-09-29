import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { runMarketProcessTreeV1 } from '../../backend/pricing/market_process_tree_v1.mjs';

const linux = process.platform === 'linux';
const options = { encoding: 'utf8', timeout: 5000, maxBuffer: 8192, terminationGraceMs: 100 };

test('contained successful pipeline returns its output', { skip: !linux }, async () => {
  const result = await runMarketProcessTreeV1(process.execPath, ['-e', "console.log('complete')"], options);
  assert.equal(result.stdout.trim(), 'complete');
});

for (const scenario of ['abort', 'timeout', 'parent_failure', 'buffer_overflow']) {
  test(`no descendant can keep writing after ${scenario}`, { skip: !linux, timeout: 15000 }, async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'market-process-proof-'));
    const marker = path.join(dir, 'writes');
    const grandchild = `const fs=require('node:fs');process.on('SIGTERM',()=>{});setInterval(()=>fs.appendFileSync(${JSON.stringify(marker)},'x'),10);`;
    const action = scenario === 'parent_failure' ? 'setTimeout(()=>process.exit(2),250);'
      : scenario === 'buffer_overflow' ? "setTimeout(()=>console.log('x'.repeat(20000)),250);" : '';
    const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(grandchild)}],{stdio:'ignore'});process.on('SIGTERM',()=>{});${action}setInterval(()=>{},1000);`;
    const controller = new AbortController();
    let failure;
    const running = runMarketProcessTreeV1(process.execPath, ['-e', parent], {
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
