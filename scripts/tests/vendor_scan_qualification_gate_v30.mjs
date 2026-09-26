// Fail-closed release prerequisite. Partial shards and Windows smoke receipts
// can never satisfy this gate. This script neither hosts nor enables anything.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
export function qualificationGateV30(base = '.local/integration/vendor-scan-runtime-v30') {
  const read = p => JSON.parse(fs.readFileSync(p)), receipt = read(path.join(base, 'package.private.json'));
  const packageRoot = path.join(base, 'linux-package'), planFile = path.join(packageRoot, 'qualification-plan.private.json');
  assert.equal(hash(fs.readFileSync(planFile)), receipt.planSha256);
  const plan = read(planFile); assert.equal(plan.references.length, 20079); assert.equal(plan.scans.length, 320);
  for (const [file, sha] of Object.entries(plan.files)) {
    assert.equal(hash(fs.readFileSync(path.join(packageRoot, file))), sha, 'Packaged source changed');
    assert.equal(hash(fs.readFileSync(file)), sha, 'Current source changed');
  }
  const output = path.join(base, 'linux-output'), receipts = [], seen = new Set();
  let runtime;
  for (const [mode, shard, shards] of [['references', 0, 2], ['references', 1, 2], ['scans', 0, 1]]) {
    const label = `linux-${mode}-${shard}`, file = path.join(output, label + '.complete.json'), proof = read(file);
    assert.ok(proof.finishedAt); assert.equal(proof.planSha256, receipt.planSha256); assert.equal(proof.smoke, false);
    assert.equal(proof.qualifiesLinux, true); assert.equal(proof.runtime.platform, 'linux'); assert.equal(proof.runtime.arch, 'x64');
    assert.match(proof.runtime.node, /^v22\./); assert.equal(proof.mode, mode); assert.equal(proof.shard, shard); assert.equal(proof.shards, shards);
    if (runtime) assert.deepEqual(proof.runtime, runtime); else runtime = proof.runtime;
    const journal = fs.readFileSync(path.join(output, label + '.jsonl')); assert.equal(hash(journal), proof.journalSha256);
    const rows = journal.toString().trim().split('\n').map(JSON.parse); assert.equal(rows.length, proof.verified);
    const expected = mode === 'references' ? plan.references.filter((_, i) => i % shards === shard) : plan.scans;
    assert.equal(rows.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
      const r = rows[i], e = expected[i];
      if (mode === 'references') {
        assert.equal(r.id, e.id); assert.equal(r.imageSha256, e.imageSha256); assert.equal(r.artifactSha256, e.artifactSha256); assert.equal(r.exactFeatures, true);
        assert.ok(!seen.has(r.id)); seen.add(r.id);
      } else { assert.equal(r.key, e.key); assert.equal(r.scanSha256, e.sha256); assert.equal(r.exactParity, true); assert.ok(!r.error && !r.wrong); }
    }
    if (mode === 'scans') { assert.equal(proof.correct, 195); assert.equal(proof.wrong, 0); assert.equal(proof.negativesRejected, 56); }
    receipts.push({ mode, shard, verified: rows.length, sha256: hash(fs.readFileSync(file)), journalSha256: proof.journalSha256 });
  }
  assert.equal(seen.size, 20079);
  return { at: new Date().toISOString(), qualified: true, planSha256: receipt.planSha256, runtime, receipts, references: 20079, scans: 320 };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = qualificationGateV30(), output = '.local/integration/vendor-scan-runtime-v30/qualified.private.json';
  fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ qualified: true, references: result.references, scans: result.scans }));
}
