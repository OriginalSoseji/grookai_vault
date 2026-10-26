import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readBoundPricingInputV1, sha256V1, writePricingArtifactV1 } from '../../backend/pricing/pricing_completion_files_v1.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pricing-files-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const report = '{"status":"incomplete"}';
  const rows = '{"source_product_id":1}\n';
  fs.writeFileSync(path.join(root, 'report.json'), report);
  fs.writeFileSync(path.join(root, 'gaps.jsonl'), rows);
  const manifest = { schema_version: 'PRICING_COMPLETION_FILES_V1', report: {path:'report.json',sha256:sha256V1(report)}, identity_gaps: {path:'gaps.jsonl',sha256:sha256V1(rows)} };
  const input = path.join(root, 'input.json');
  fs.writeFileSync(input, JSON.stringify(manifest));
  return {root,input,manifest};
}
test('digest-bound input is data only and detects a changed source file', t => {
  const f = fixture(t);
  assert.equal(readBoundPricingInputV1(f.input).rows.length, 1);
  fs.appendFileSync(path.join(f.root, 'gaps.jsonl'), '{}\n');
  assert.throws(() => readBoundPricingInputV1(f.input), /digest_mismatch/);
});
test('input cannot escape its approved directory or supply executable configuration', t => {
  const f = fixture(t);
  f.manifest.report.path = '../report.json';
  fs.writeFileSync(f.input, JSON.stringify(f.manifest));
  assert.throws(() => readBoundPricingInputV1(f.input), /invalid_input_path/);
  f.manifest.report.path = 'report.json'; f.manifest.command = 'anything';
  fs.writeFileSync(f.input, JSON.stringify(f.manifest));
  assert.throws(() => readBoundPricingInputV1(f.input), /invalid_input_manifest/);
});
test('output replacement is valid JSON and rejects path traversal', t => {
  const f = fixture(t);
  writePricingArtifactV1(f.root, 'status.json', {revision:1});
  writePricingArtifactV1(f.root, 'status.json', {revision:2});
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'status.json'))).revision,2);
  assert.throws(() => writePricingArtifactV1(f.root,'../escape.json',{}), /invalid_artifact_name/);
});

test('content-addressed packets are immutable and can be retried', t => {
  const f = fixture(t);
  writePricingArtifactV1(f.root,'packet-abc.json',{items:[1]});
  writePricingArtifactV1(f.root,'packet-abc.json',{items:[1]});
  assert.throws(() => writePricingArtifactV1(f.root,'packet-abc.json',{items:[2]}),/immutable_packet_conflict/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root,'packet-abc.json'))),{items:[1]});
  assert.equal(fs.readdirSync(f.root).filter(name => name.endsWith('.tmp')).length,0);
});
