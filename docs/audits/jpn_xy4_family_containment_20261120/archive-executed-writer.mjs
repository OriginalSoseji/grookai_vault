import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
const dir='docs/audits/jpn_xy4_family_containment_20261120',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const paths=['backend/catalog/jpn_xy4_family_containment_v1.mjs','backend/catalog/jpn_xy4_family_containment_policy_v1.mjs','backend/lib/contracts/contract_scope_v1.mjs','backend/lib/contracts/execute_canon_write_v1.mjs','backend/lib/contracts/run_post_write_proofs_v1.mjs'];
const files=paths.map(path=>{const bytes=fs.readFileSync(path);return {path,sha256:sha(bytes),content_base64:bytes.toString('base64')};});
const fingerprint=sha(Buffer.from(JSON.stringify(files.map(f=>[f.path,f.sha256]))));
const proofs=fs.readdirSync(dir).filter(n=>n.startsWith('family-rollback-proof-')&&n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(`${dir}/${n}`)));
for(const chunk of [0,1,2]){const found=proofs.filter(p=>p.chunk===chunk&&p.status==='rollback_proof_passed');assert.equal(found.length,1);assert.equal(found[0].writer_fingerprint,fingerprint);}
const archive={version:'XY4_EXECUTED_WRITER_ARCHIVE_V1',fingerprint,files};
fs.writeFileSync(`${dir}/executed-writer.json.gz`,zlib.gzipSync(Buffer.from(JSON.stringify(archive)),{level:9}),{flag:'wx'});
console.log(JSON.stringify({fingerprint,files:files.length,verified_proof_chunks:[0,1,2]}));
