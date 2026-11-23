import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';
import{printingManifestHash as hash}from'../../backend/catalog/printing_completeness_gate_v1.mjs';
import{reviewedPlayStampRows,PROGRAM}from'../../backend/catalog/play_stamp_normal_execution_v1.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function loadPlayStampSourcesV1(root,privateEvidenceDirectory){
 const dir='docs/catalog/play_pokemon_stamp_normal_completion_v1',index=JSON.parse(fs.readFileSync(path.join(root,dir,'index.json'))),{fingerprint,...body}=index;assert.equal(fingerprint,PROGRAM);assert.equal(hash(body),PROGRAM);assert.equal(index.executionAuthority,false);
 const scopes=index.scopes.map(s=>{
  const files={};for(const[name,pin]of Object.entries(s.files)){const bytes=fs.readFileSync(path.join(root,dir,s.setCode,name));assert.equal(sha(bytes),pin,'Reviewed package bytes changed');files[name]=bytes;}
  const manifest=JSON.parse(files['manifest.json']),binding=JSON.parse(files['source-bindings.json']),master=files['master_facts.json'];assert.equal(manifest.fingerprint,s.manifestFingerprint);assert.equal(sha(master),manifest.master_index_sha256);
  const facts=JSON.parse(master);assert.equal(facts.complete_printing_inventory,false);assert.equal(facts.foil_pattern_adjudicated,false);assert.equal(facts.records.length,manifest.parents.length);for(const r of facts.records){assert.equal(r.finish_key,'normal');assert.equal(r.variant_key,'play_pokemon_stamp');assert.equal(r.source_count,2);assert.deepEqual(r.independent_source_families,['official_pokemon_checklist','bulbapedia_human_checklist']);}
  const artifacts=new Map([[manifest.master_index_ref,master],[manifest.authority.review.ref,files['review.json']]]);
  for(const[ref,p]of Object.entries(binding.preservedFiles)){assert.equal(path.basename(p.file),p.file);assert.ok(!path.isAbsolute(p.file));const bytes=fs.readFileSync(path.join(privateEvidenceDirectory,p.file));assert.equal(sha(bytes),p.sha256,'Original source bytes changed: '+ref);if(ref.startsWith('official-'))assert.equal(bytes.subarray(0,5).toString(),'%PDF-');artifacts.set(ref,bytes);}
  return{manifest,artifacts};
 });reviewedPlayStampRows(scopes);return scopes;
}
