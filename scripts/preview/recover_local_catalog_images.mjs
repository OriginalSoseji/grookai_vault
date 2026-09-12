import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardDestination } from './load_public_catalog_local.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const { createClient } = require('@supabase/supabase-js');
const dir = path.resolve(process.argv[2] ?? '');
if (!dir.startsWith('C:\\grookai_vault_operator_artifacts\\collector_polish\\')) throw new Error('Operator snapshot directory required.');
if (execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim() !== 'design/collector-real-local') throw new Error('Wrong branch.');
const receipt = JSON.parse(readFileSync(path.join(dir, 'receipt.json')));
const snapshot = JSON.parse(readFileSync(path.join(dir, 'source_snapshot.json')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
if (sha(JSON.stringify(snapshot)) !== receipt.sourceSha256) throw new Error('Source snapshot drift.');
const local = JSON.parse(execFileSync('supabase.exe', ['status', '-o', 'json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
guardDestination(local.API_URL);
const client = createClient(local.API_URL, local.SERVICE_ROLE_KEY, { auth: { persistSession: false }, global: { fetch: (input, init) => { guardDestination(new URL(String(input)).origin); return fetch(input, init); } } });
const recovered = [];
for (const gap of receipt.imageGaps.filter(item => item.reason.includes('(429)'))) {
  await delay(1200);
  const row = [...snapshot.cards, ...snapshot.printings].find(row => (row.gv_id ?? row.printing_gv_id) === gap.gvId);
  if (!row || !/^warehouse-derived\/(self-hosted-images-v1|image-truth-v1)\//.test(row.image_path) || row.image_path.includes('..')) throw new Error('Unbound image.');
  const url = `https://grookaivault.com/api/canon/cards/${encodeURIComponent(gap.gvId)}/image`;
  let response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (response.status === 429) {
    const header = response.headers.get('retry-after');
    const seconds = header && /^\d+$/.test(header) ? Number(header) : 65;
    if (seconds > 120) throw new Error('Rate limit requires a later retry.');
    await delay((seconds + 1) * 1000);
    response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  }
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Recovery stopped: ${gap.gvId} (${response.status})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const hash = sha(bytes);
  const existing = await client.storage.from('user-card-images').download(row.image_path);
  if (existing.data) {
    if (sha(Buffer.from(await existing.data.arrayBuffer())) !== hash) throw new Error('Local collision.');
  } else {
    const result = await client.storage.from('user-card-images').upload(row.image_path, bytes, { upsert: false, contentType: response.headers.get('content-type') });
    if (result.error) throw new Error(result.error.message);
  }
  const readback = await client.storage.from('user-card-images').download(row.image_path);
  if (!readback.data || sha(Buffer.from(await readback.data.arrayBuffer())) !== hash) throw new Error('Readback mismatch.');
  writeFileSync(path.join(dir, 'images', `${gap.gvId}.bin`), bytes);
  recovered.push({ gvId: gap.gvId, path: row.image_path, sha256: hash, bytes: bytes.length, sourceUrl: url });
  writeFileSync(path.join(dir, 'image_recovery.json'), JSON.stringify({ recovered, productionWrites: 0, databaseWrites: 0 }, null, 2));
  console.log(JSON.stringify({ recovered: recovered.length, gvId: gap.gvId }));
}
