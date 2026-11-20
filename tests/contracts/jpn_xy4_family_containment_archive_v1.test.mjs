import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
const dir='docs/audits/jpn_xy4_family_containment_20261120',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fingerprint='b0fffb8219cd09675984b55560cc8b57691697f771278896e1f0f39df0eddb23',plan='6cf22a949a8ef140227801d3317356507766f6d858a9d162b8d9a1d7c6654538';
test('archived executed writer preserves exact bytes and seven batch proofs',()=>{
  const archive=JSON.parse(gunzipSync(fs.readFileSync(`${dir}/executed-writer.json.gz`)));
  assert.equal(archive.version,'XY4_EXECUTED_WRITER_ARCHIVE_V1');assert.equal(archive.files.length,5);
  for(const f of archive.files)assert.equal(sha(Buffer.from(f.content_base64,'base64')),f.sha256);
  assert.equal(sha(Buffer.from(JSON.stringify(archive.files.map(f=>[f.path,f.sha256])))),fingerprint);assert.equal(archive.fingerprint,fingerprint);
  const proofs=fs.readdirSync(dir).filter(n=>n.startsWith('family-rollback-proof-')&&n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(`${dir}/${n}`)));
  for(let chunk=0;chunk<7;chunk++){const found=proofs.filter(p=>p.chunk===chunk);assert.equal(found.length,1);assert.equal(found[0].status,'rollback_proof_passed');assert.equal(found[0].package_fingerprint,plan);assert.equal(found[0].writer_fingerprint,fingerprint);}
});
test('independent readback covers all 62 and the seven durable receipts',()=>{
  const report=JSON.parse(fs.readFileSync(`${dir}/independent-readback.json`));
  assert.equal(report.status,'passed');assert.equal(report.records,62);assert.deepEqual(report.receipt_ids,['177115','177119','177145','177156','177160','177164','177168']);
  const ledger=JSON.parse(fs.readFileSync(`${dir}/ledger-reconciliation-verify.json`));assert.equal(ledger.status,'independent_readback_passed');
});
