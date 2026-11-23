import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{SCOPE,reviewedExRows}from'../../backend/catalog/ex_intrinsic_printing_execution_v1.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function loadExPrintingSourcesV1(root,privateEvidenceDirectory){
 const dir=path.join(root,'docs/catalog/ex_intrinsic_printing_completion_v1'),index=JSON.parse(fs.readFileSync(path.join(dir,'index.json')));
 assert.equal(index.executionAuthority,false);assert.equal(index.scopes.length,3);
 const scopes=SCOPE.map(w=>{const pin=index.scopes.find(s=>s.setCode===w.code);assert.equal(pin.manifestFingerprint,w.manifest);
  const files={};for(const[file,hash]of Object.entries(pin.files)){const bytes=fs.readFileSync(path.join(dir,w.code,file));assert.equal(sha(bytes),hash);files[file]=bytes;}
  const manifest=JSON.parse(files['manifest.json']),binding=JSON.parse(files['source-bindings.json']),master=fs.readFileSync(path.join(root,manifest.master_index_ref));
  const sources={'official-numbered-checklist':fs.readFileSync(path.join(privateEvidenceDirectory,binding.official.path)),'exact-reverse-image':fs.readFileSync(path.join(privateEvidenceDirectory,binding.physicalImage.file)),'public-master-printings':master};
  assert.equal(sha(sources['official-numbered-checklist']),binding.official.sha256);assert.equal(sha(sources['exact-reverse-image']),binding.physicalImage.sha256);
  for(const[file,pin]of Object.entries(binding.sourcePins))assert.equal(sha(fs.readFileSync(path.join(root,file))),pin,'Reviewed source pin changed: '+file);
  const artifacts=new Map([[manifest.master_index_ref,master],[manifest.authority.review.ref,files['review.json']],...Object.entries(sources)]);
  return {manifest,artifacts};
 });reviewedExRows(scopes);return scopes;
}
