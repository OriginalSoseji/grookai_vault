import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { previewTcgplayerEditionIdentityV1 as preview, parseTcgplayerEditionSubtypeV1 as parse } from '../../backend/pricing/tcgplayer_edition_identity_v1.mjs';

// Only local retained evidence is read. There are no network/DB/apply paths.
const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = /^--(review|sha256|out)=(.+)$/.exec(arg);
  assert.ok(match && !args.has(match[1]), 'Use unique --review= --sha256= --out= arguments only');
  args.set(match[1], match[2]);
}
assert.equal(args.size, 3, 'Required: --review= --sha256= --out=');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewPath = path.resolve(args.get('review'));
const bytes = fs.readFileSync(reviewPath);
assert.match(args.get('sha256'), /^[a-f0-9]{64}$/);
assert.equal(digest(bytes), args.get('sha256'), 'Review SHA mismatch');
const review = JSON.parse(bytes);
assert.equal(review.version, 'JUNGLE_EDITION_REVIEW_20261001_V1');
assert.equal(review.write_ready, false);
assert.equal(review.scope.set_code, 'base2');
assert.equal(review.rows.length, 64);
assert.equal(new Set(review.rows.map(r => r.card_print_id)).size, 64);
const artifacts = new Map();
for (const item of review.evidence) {
  assert.equal(path.basename(item.file), item.file, 'Only same-directory evidence allowed');
  assert.ok(!artifacts.has(item.file), 'Duplicate evidence reference');
  const artifact = fs.readFileSync(path.join(path.dirname(reviewPath), item.file));
  assert.equal(digest(artifact), item.sha256, `Evidence SHA mismatch: ${item.file}`);
  artifacts.set(item.file, artifact);
}
const snapshot = JSON.parse(artifacts.get('snapshot.json'));
assert.equal(snapshot.read_only, true);
const rows = [];
for (const row of review.rows) {
  const parents = snapshot.cards.filter(c => c.id === row.card_print_id);
  assert.equal(parents.length, 1);
  const parent = parents[0];
  assert.equal(parent.set_id, review.scope.set_id);
  for (const field of ['gv_id', 'name', 'number', 'variant_key', 'printed_identity_modifier']) {
    assert.equal(parent[field], row[field], `Frozen parent mismatch: ${field}`);
  }
  const sourceQuotes = Object.values(row.price_evidence ?? {}).flat();
  for (const quote of sourceQuotes) {
    assert.equal(quote.card_print_id, parent.id);
    assert.ok(row.source_product_ids.includes(quote.source_product_id));
    const parsed = parse(quote.source_subtype_name);
    const children = snapshot.printings.filter(p => p.card_print_id === parent.id && p.finish_key === parsed?.finish_key);
    rows.push(preview({ parent, printing: children.length === 1 ? children[0] : {},
      source: { ...quote, category_id: 3 } }));
  }
}
const output = { version: 'JUNGLE_EDITION_PRICING_PREVIEW_V1',
  review_sha256: digest(bytes), verified_evidence_files: artifacts.size,
  write_ready: false, publishable: false, database_writes: 0,
  summary: { parents: review.rows.length, quote_candidates: rows.length,
    identity_compatible: rows.filter(r => r.identity_compatible).length,
    canonical_edition_unresolved: rows.filter(r => r.reasons.includes('canonical_edition_unresolved')).length }, rows };
fs.writeFileSync(path.resolve(args.get('out')), JSON.stringify(output, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(output.summary));
