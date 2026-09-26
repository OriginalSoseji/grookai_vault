// Anonymous-boundary, read-only reconciliation of bundled reference identities.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,fixture,hash,sql} from './storefront_production_lab_v1.mjs';
import {loadReferenceMetadataV27,METADATA_SHA256,METADATA_SOURCE_SHA256} from '../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import {loadFeatureManifestV29,FEATURE_MANIFEST_PINS} from '../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
assert.equal(process.argv.length,2);
const target='ycdxbpibncqcchqiihfz';
const references=loadReferenceMetadataV27(path.join(root,'apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz'));
const features=loadFeatureManifestV29(path.join(root,'apps/web/src/lib/stores/scanExpandedFeaturesV29.json.gz'),references);
const rows=[...references.values()],receipts=[];
const dir=path.join(fixture,`references-${new Date().toISOString().replaceAll(':','-')}`);fs.mkdirSync(dir);
const token=execFileSync('pwsh',['-NoProfile','-File','C:/gv_store_billing_20260919/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();assert.match(token,/^sbp_/);
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const p=await fetch(`https://api.supabase.com/v1/projects/${target}`,{headers});assert.ok(p.ok);assert.equal((await p.json()).id,target);
for(let offset=0;offset<rows.length;offset+=1000){
  const chunk=rows.slice(offset,offset+1000);
  const payload=JSON.stringify(chunk.map(({id,gv_id,image_path})=>({id,gv_id,image_path}))).replaceAll("'","''");
  const query=`begin isolation level repeatable read read only;
set local statement_timeout='45s';set local lock_timeout='3s';set local role anon;
with expected as (select (value->>'id')::uuid id,value->>'gv_id' gv_id,value->>'image_path' image_path,((ordinality-1)/250)::integer grp from jsonb_array_elements('${payload}'::jsonb) with ordinality),
groups as (select grp,array_agg(id) ids from expected group by grp),
eligible as (select distinct p.card_print_id from groups g cross join lateral public.get_public_card_printing_options_v1(g.ids,1000,0) p where p.printing_gv_id is not null),
checked as (select e.id,c.id is not null visible,c.gv_id=e.gv_id identity_equal,c.image_path=e.image_path and c.image_status='exact' and c.image_source='identity' image_equal,p.card_print_id is not null printing_eligible from expected e left join public.card_prints c on c.id=e.id left join eligible p on p.card_print_id=e.id)
select current_setting('transaction_read_only') read_only,current_user role,count(*) requested,
count(*) filter(where visible and identity_equal and image_equal and printing_eligible) eligible,
coalesce(jsonb_agg(to_jsonb(checked)) filter(where not coalesce(visible and identity_equal and image_equal and printing_eligible,false)),'[]'::jsonb) excluded from checked;
rollback;`;
  fs.writeFileSync(path.join(dir,`${offset}.sql`),query,{flag:'wx'});
  if(offset===0)sql(query); // Syntax/role check in the isolated replica first.
  const response=await fetch(`https://api.supabase.com/v1/projects/${target}/database/query`,{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(60000)});
  if(!response.ok)fs.writeFileSync(path.join(dir,`${offset}.error.private.json`),await response.text(),{flag:'wx'});
  assert.ok(response.ok,`Reference audit HTTP ${response.status}`);
  const result=(await response.json())[0];assert.equal(result.read_only,'on');assert.equal(result.role,'anon');assert.equal(Number(result.requested),chunk.length);
  receipts.push(result);fs.writeFileSync(path.join(dir,`${offset}.json`),JSON.stringify(result),{flag:'wx'});
}
const result={at:new Date().toISOString(),status:'passed',target,artifactSha256:METADATA_SOURCE_SHA256,metadataSha256:METADATA_SHA256,featureManifestSha256:FEATURE_MANIFEST_PINS.sha256,references:references.size,features:features.size,eligible:receipts.reduce((n,r)=>n+Number(r.eligible),0),excluded:receipts.flatMap(r=>r.excluded),anonymousBoundary:true,productionWrites:0,qualification:'Current public identity, exact artwork path and public printing eligibility. No claim of Master Index completeness or new image-byte verification.',receiptSha256:hash(JSON.stringify(receipts))};
fs.writeFileSync(path.join(root,'docs/audits/storefront_production_20260926/reference-authority.json'),JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({...result,excluded:result.excluded.length}));
