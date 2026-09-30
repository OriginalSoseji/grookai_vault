import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
for (const mismatch of [false, true]) test(`actual CLI ${mismatch ? 'blocks final evidence on identity failure' : 'persists progress and complete evidence'}`, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mee-batch-contract-'));
  try {
    const batch = path.join(dir, 'batch.json'), cards = path.join(dir, 'cards.json'), preload = path.join(dir, 'preload.mjs');
    await fs.writeFile(batch, JSON.stringify({ items: [{ source: 'pokemontcg_io_reference', card_print_id: '00000000-0000-4000-8000-000000000001', name: 'Venusaur', gv_id: 'GV-TEST', set_code: 'base1', number_plain: '15' }] }));
    await fs.writeFile(cards, JSON.stringify({ 'base1-15': { id: mismatch ? 'base1-3' : 'base1-15', name: 'Venusaur' } }));
    await fs.writeFile(preload, `globalThis.fetch = async input => {
      const url = new URL(typeof input === 'string' ? input : input.url ?? input.href);
      if (url.origin !== 'http://127.0.0.1:9' || url.pathname !== '/rest/v1/card_prints') throw new Error('Unexpected network route');
      return new Response(JSON.stringify([{id:'00000000-0000-4000-8000-000000000001',external_ids:{pokemonapi:'base1-15'}}]), {status:200,headers:{'Content-Type':'application/json'}});
    };`);
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|TEMP|TMP|HOME|USERPROFILE)$/i.test(key)));
    Object.assign(env, { DOTENV_CONFIG_PATH: path.join(dir, 'absent.env'), SUPABASE_URL: 'http://127.0.0.1:9', SUPABASE_SECRET_KEY: 'fixture-only-no-real-credential' });
    let exitCode = 0;
    try { await execute(process.execPath, ['--import', pathToFileURL(preload).href, 'scripts/audits/market_evidence_engine_pokemontcg_io_reference_acquisition_v1.mjs', `--batch=${batch}`, `--fixture-cards=${cards}`, `--out-dir=${dir}`], { cwd: root, env, timeout: 15000 }); }
    catch (error) { exitCode = error.code; assert.match(error.stderr, /POKEMON_REFERENCE_ACQUISITION_INCOMPLETE/); }
    assert.equal(exitCode, mismatch ? 1 : 0);
    const files = await fs.readdir(dir), acquisitions = files.filter(f => /^mee_06a.*\.json$/.test(f));
    assert.equal(acquisitions.length, mismatch ? 0 : 1);
    const progressDir = files.find(f => f.startsWith('mee_reference_progress_'));
    const progress = JSON.parse(await fs.readFile(path.join(dir, progressDir, 'progress.json')));
    const rows = (await fs.readFile(path.join(dir, progressDir, 'responses.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(rows.length, 1); assert.equal(progress.completed, 1);
    assert.equal(rows[0].status, mismatch ? 'failed' : 'fetched');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
