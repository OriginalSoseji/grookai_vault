// Reproducibly consolidate only unapplied inputs. Original migration bytes stay
// intact; this candidate is not placed in the active chain or applied remotely.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,hash} from './storefront_production_lab_v1.mjs';
assert.equal(process.argv.length,2);
const out=path.join(root,'docs/audits/storefront_production_package_v1');assert.ok(!fs.existsSync(out));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/storefront_production_20260926/integration-manifest.json')));
const admission=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/storefront_production_20260926/scan-admission.json')));
const inputs=[...manifest.pendingCandidates,{name:admission.migration,sha256:admission.migrationSha256}];assert.equal(inputs.length,19);
const originals=inputs.map(item=>{const bytes=fs.readFileSync(path.join(root,'supabase/migrations',item.name));assert.equal(hash(bytes),item.sha256);return bytes;});
let parts=originals.map(bytes=>bytes.toString());
const functionPattern=/create(?:\s+or\s+replace)?\s+function\s+public\.(\w+)\s*\([\s\S]*?\$\$;/gi;
const definitions=new Map();
for(const part of parts)for(const match of part.matchAll(functionPattern)){
  const list=definitions.get(match[1])??[];list.push(match[0]);definitions.set(match[1],list);
}
const repeated=[...definitions].filter(([,values])=>values.length>1).map(([name])=>name).sort();
const review=JSON.parse(fs.readFileSync(path.join(root,'docs/audits/storefront_production_20260926/pending-duplicate-review.json'),'utf8').replace(/^\uFEFF/,''));
assert.deepEqual(repeated,review.functions.map(f=>f.name.match(/^public\.(\w+)/)[1]).sort());
assert.equal(repeated.length,13);
const finishInputs=definitions.get('vendor_batch_intake_finish_v1');assert.equal(finishInputs.length,3);
const finishBase=finishInputs[1].replace(/function public\.vendor_batch_intake_finish_v1\(/i,'function public.vendor_batch_intake_finish_base_v1(');
const seen=new Set();
parts=parts.map((part,index)=>part.replace(functionPattern,(definition,name)=>{
  if(!repeated.includes(name))return definition;
  // The private-copy body becomes the hidden base function when cancellation is
  // added. Materialize that final identity once instead of renaming a wrapper.
  if(name==='vendor_batch_intake_finish_v1' && inputs[index].name=== '20260923050000_vendor_batch_private_copy_v1.sql')return finishBase;
  if(seen.has(name))return '';seen.add(name);return definitions.get(name).at(-1);
}));
const cancellation=inputs.findIndex(r=>r.name==='20260923060000_vendor_batch_cancellation_v1.sql');
const renameBlock=/do \$\$ begin\r?\n if to_regprocedure\('public\.vendor_batch_intake_prepare_base_v1\(uuid,uuid,jsonb\)'\)[\s\S]*?end \$\$;/;
assert.ok(renameBlock.test(parts[cancellation]));parts[cancellation]=parts[cancellation].replace(renameBlock,'-- Final base functions are created directly by the consolidated release.');
const unwrap=part=>{
  assert.equal((part.match(/^begin;\r?$/gm)??[]).length,1);
  assert.equal((part.match(/^commit;\r?$/gm)??[]).length,1);
  return part.replace(/^begin;\r?$/m,'').replace(/^commit;\r?$/m,'').trim();
};
const result=`-- Production storefront release candidate; original 19 inputs are retained.
-- Final bodies and grants are preserved. No duplicated pending definitions.
-- Defer body validation until all additive dependencies exist (as in pg_dump).
-- Exact schema/security parity and runtime proofs are mandatory before release.
begin;
set local check_function_bodies = off;
${parts.map(unwrap).join('\n\n')}
commit;
`;
const finalNames=[...result.matchAll(functionPattern)].map(m=>m[1]);assert.equal(new Set(finalNames).size,finalNames.length);
assert.ok(finalNames.includes('vendor_batch_intake_prepare_base_v1'));assert.ok(finalNames.includes('vendor_batch_intake_finish_base_v1'));
fs.mkdirSync(path.join(out,'historical_migrations'),{recursive:true});
inputs.forEach((r,i)=>fs.writeFileSync(path.join(out,'historical_migrations',r.name),originals[i],{flag:'wx'}));
const name='20260926190000_vendor_storefront_production_v1.sql';fs.writeFileSync(path.join(out,name),result,{flag:'wx'});
const receipt={at:new Date().toISOString(),status:'candidate_needs_replay',inputs,output:{name,sha256:hash(result),bytes:Buffer.byteLength(result)},consolidatedFunctions:repeated,finalFunctions:finalNames.length,sourceChanges:0,productionWrites:0};
fs.writeFileSync(path.join(out,'consolidation.json'),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
