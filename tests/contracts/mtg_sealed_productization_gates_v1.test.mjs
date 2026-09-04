import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

const auditDir = 'docs/audits/pricing/mtg_sealed_merged_main_readback_v1';
const contract = fs.readFileSync(
  'docs/contracts/MTG_SEALED_PRODUCTIZATION_GATES_V1.md',
  'utf8',
);
const checkpoint = fs.readFileSync(
  'docs/checkpoints/pricing/PRICING_CHECKPOINT_104_MTG_SEALED_PRODUCTIZATION_GATES_FROZEN.md',
  'utf8',
);
const summary = JSON.parse(fs.readFileSync(
  `${auditDir}/summary.json`,
  'utf8',
));
const artifactHashes = JSON.parse(fs.readFileSync(
  `${auditDir}/artifact_hashes.json`,
  'utf8',
));

test('permanent readback artifacts retain their recorded hashes', () => {
  for (const [name, expectedHash] of Object.entries(artifactHashes.artifacts)) {
    const actualHash = crypto.createHash('sha256')
      .update(fs.readFileSync(`${auditDir}/${name}`))
      .digest('hex');
    assert.equal(actualHash, expectedHash, `${name} hash drifted`);
  }
});

test('merged-main evidence preserves the exact hidden MTG sealed boundary', () => {
  assert.equal(summary.status, 'mtg_sealed_readback_passed');
  assert.equal(summary.repository.commit_sha,
    'a9a384cb4085a5369e73ebd7039ab6ddcffb2a47');
  assert.equal(summary.counts.variants, 2904);
  assert.equal(summary.counts.members, 2182);
  assert.equal(summary.counts.pointer, 1);
  assert.equal(summary.database_writes, 0);
  assert.equal(summary.hidden_rpc_rows_returned, 0);
  assert.equal(summary.one_piece_unchanged, true);
  assert.ok(Object.values(summary.projection_exact).every(Boolean));
});

test('productization keeps images, pricing, and visibility as separate gates', () => {
  const imageGate = contract.indexOf('## Gate A: Self-Hosted Images');
  const pricingGate = contract.indexOf('## Gate B: Governed Pricing Refresh');
  const visibilityGate = contract.indexOf('## Gate C: Signed-In Visibility');
  assert.ok(imageGate > 0);
  assert.ok(pricingGate > imageGate);
  assert.ok(visibilityGate > pricingGate);
  assert.match(contract, /No gate inherits mutation authority from another/);
  assert.match(contract, /Anonymous access stays denied throughout V1/);
  assert.match(contract, /authorizes no Storage\s+write, database write, price publication, visibility change/);
  assert.match(contract, /`v2` is not accepted as the final client interface/);
  assert.match(contract, /joins exact\s+sealed-image evidence\/pointers/);
  assert.match(contract, /seven-day serving-time expiry/);
  assert.match(contract, /fail closed to zero\s+price rows/);
});

test('the next gate is image planning only and cannot activate the product', () => {
  for (const document of [contract, checkpoint]) {
    assert.match(document, /zero-write.*image-source coverage plan/is);
    assert.match(document,
      /Stop before migration creation, Storage upload, database\s+(?:mutation|writes),\s+pricing refresh, deployment, or visibility activation/is);
  }
});
