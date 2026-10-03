import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../../scripts/audits/jungle_edition_pricing_preview_v1.mjs', import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');

test('offline preview binds source bytes and rejects tampering, apply flags and output replay', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'grookai-jungle-edition-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const cards = Array.from({ length: 64 }, (_, i) => ({ id: `parent-${i}`, gv_id: `GV-PK-JU-${i+1}`,
    name: `Fixture ${i}`, number: String(i+1), set_id: 'set', set_code: 'base2',
    identity_domain: 'pokemon_eng_standard', set_identity_model: 'standard',
    variant_key: '', printed_identity_modifier: null }));
  const printings = cards.map(c => ({ id: `child-${c.id}`, printing_gv_id: `${c.gv_id}-NORMAL`,
    card_print_id: c.id, finish_key: 'normal', is_provisional: false, public_visibility: null }));
  const snapshot = JSON.stringify({ read_only: true, cards, printings });
  fs.writeFileSync(path.join(dir, 'snapshot.json'), snapshot);
  const review = JSON.stringify({ version: 'JUNGLE_EDITION_REVIEW_20261001_V1', write_ready: false,
    scope: { set_code: 'base2', set_id: 'set' }, evidence: [{ file: 'snapshot.json', sha256: hash(snapshot) }],
    rows: cards.map((c, i) => ({ ...c, card_print_id: c.id, source_product_ids: [100+i],
      price_evidence: { unlimited: [{ card_print_id: c.id, source_product_id: 100+i, source_subtype_name: 'Unlimited' }] } })) });
  const reviewPath = path.join(dir, 'review.json'), output = path.join(dir, 'output.json');
  fs.writeFileSync(reviewPath, review);
  const args = [`--review=${reviewPath}`, `--sha256=${hash(review)}`, `--out=${output}`];
  const run = extra => spawnSync(process.execPath, [cli, ...args, ...extra], { encoding: 'utf8' });
  assert.notEqual(run(['--apply']).status, 0);
  assert.equal(fs.existsSync(output), false);
  fs.appendFileSync(reviewPath, '\n');
  assert.match(run([]).stderr, /Review SHA mismatch/);
  assert.equal(fs.existsSync(output), false);
  fs.writeFileSync(reviewPath, review);
  fs.appendFileSync(path.join(dir, 'snapshot.json'), '\n');
  assert.match(run([]).stderr, /Evidence SHA mismatch/);
  assert.equal(fs.existsSync(output), false);
  fs.writeFileSync(path.join(dir, 'snapshot.json'), snapshot);
  assert.equal(run([]).status, 0);
  const before = fs.readFileSync(output);
  const result = JSON.parse(before);
  assert.deepEqual(result.summary, { parents: 64, quote_candidates: 64, identity_compatible: 0, canonical_edition_unresolved: 64 });
  assert.equal(result.database_writes, 0);
  assert.equal(result.publishable, false);
  assert.notEqual(run([]).status, 0);
  assert.deepEqual(fs.readFileSync(output), before);
});
