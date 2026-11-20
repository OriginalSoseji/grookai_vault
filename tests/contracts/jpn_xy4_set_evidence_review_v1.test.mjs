import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

const dir='docs/audits/jpn_xy4_set_evidence_review_20261120',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=n=>fs.readFileSync(path.join(dir,n)),json=n=>JSON.parse(read(n));
const manifestHash='224afe2fd2c03a90ef5963cfa7c7b5f1ad30e721f6bb4064ab73ac12d8347329';

test('research package retains the exact pinned source and snapshot bytes',()=>{
  const bytes=read('manifest.json');assert.equal(sha(bytes),manifestHash);const manifest=JSON.parse(bytes);
  assert.equal(manifest.version,'XY4_SET_EVIDENCE_REVIEW_PACKAGE_V1');assert.equal(manifest.official_captures,92);assert.equal(manifest.files.length,301);
  assert.equal(new Set(manifest.files.map(f=>f.path)).size,manifest.files.length);
  for(const f of manifest.files){assert.ok(!path.isAbsolute(f.path)&&!f.path.split('/').includes('..'));const b=read(f.path);assert.equal(b.length,f.bytes,f.path);assert.equal(sha(b),f.sha256,f.path);}
});

test('92 official card captures agree with the retained exact storage proofs',()=>{
  const proofs=['xy4-coordinate-source-storage-verification-20261120.json','xy4-ambiguous-base-storage-verification-20261120.json','xy4-secret-storage-verification-20261120.json'].flatMap(n=>json(n).results);
  const parents=json('parent-preimages.json').parents;assert.equal(parents.length,95);assert.equal(proofs.length,92);assert.equal(new Set(proofs.map(r=>r.gv_id)).size,92);
  for(const proof of proofs){
    assert.equal(proof.status,'exact_image_candidate_only');assert.equal(proof.byte_identical,true);assert.equal(proof.parent_owner_count,1);assert.equal(proof.exact_storage_object_count,1);
    const id=proof.official_id,receipt=json(`official-captures/${id}-receipt.json`),page=read(`official-captures/${id}.html`),image=read(`official-captures/${id}.image`),parent=parents.find(p=>p.gv_id===proof.gv_id);
    assert.ok(parent);assert.equal(receipt.gv_id,proof.gv_id);assert.equal(receipt.heading,parent.name);assert.equal(receipt.status,'matching_prefix_candidate_only');
    assert.equal(sha(page),receipt.page.sha256);assert.equal(sha(image),receipt.image.sha256);assert.equal(sha(image),proof.official_sha256);assert.equal(proof.stored_sha256,proof.official_sha256);
    assert.equal(Number(receipt.printed_number),Number(proof.printed_number));assert.equal(Number(receipt.printed_total),88);
  }
});

test('coordinate collisions and historical containment evidence remain explicit',()=>{
  const graph=json('xy4-verified-coordinate-collision-graph-20261120.json');
  assert.equal(graph.parents,95);assert.equal(graph.source_image_verified,92);assert.equal(graph.coordinate_disagreements,85);assert.equal(graph.coordinate_agreements,7);assert.equal(graph.number_occupied_by_other,85);assert.equal(graph.padded_token_owned_by_other,82);assert.equal(graph.padded_token_not_present,3);
  const historical=json('xy4-verified-identity-preimages-20261120.json');assert.equal(historical.assessed.length,62);assert.ok(historical.assessed.every(r=>r.status==='official_image_and_dex_conflict_with_active_primary'));
  const contained=JSON.parse(fs.readFileSync('docs/audits/jpn_xy4_family_containment_20261120/independent-readback.json'));assert.equal(contained.status,'passed');assert.equal(contained.records,62);
  const pricing=json('xy4-pricing-index-counts-20261120.json');assert.equal(pricing.results.length,2);assert.ok(pricing.results.every(r=>r.status==='counted_index_plan'&&r.count==='0'));
});

test('third-party images and English checklist remain naming leads, not exact image proof',()=>{
  const research=json('xy4-unpadded-image-research-20261120.json');assert.equal(research.rows.length,3);
  for(const r of research.rows){assert.equal(r.byte_identical,false);assert.equal(sha(read(`third-party-captures/${r.official_id}.image`)),r.third_party_sha256);}
  const checklist=json('xy4-english-official-checklist-receipt-20261120.json');assert.equal(sha(read('xy4-english-official-checklist-20261120.pdf')),checklist.sha256);assert.equal(checklist.matched_english_names.length,3);
});
