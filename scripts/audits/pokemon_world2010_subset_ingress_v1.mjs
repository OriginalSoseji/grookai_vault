import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DECKS } from '../../backend/catalog/pokemon_world2010_relationship_review_v1.mjs';
import { buildWorld2010SubsetIngress } from '../../backend/catalog/pokemon_world2010_subset_ingress_v1.mjs';

export function loadSubsetOriginals() {
  return new Map(DECKS.map(d=>[d.code,fs.readFileSync(new URL('../../docs/audits/verified_master_set_index_v1/english_master_index_v1/world2010_relationship_sources_v1/'+d.code+'.txt',import.meta.url))]));
}
export function stageSubsetIngress(args) {
  const opts=new Map(); for(const arg of args){const m=arg.match(/^--(relationship-dir|ingress-dir|out-dir)=(.+)$/);
    assert.ok(m&&!opts.has(m[1]),'unique_offline_subset_arguments_required');opts.set(m[1],path.resolve(m[2]));}
  assert.equal(opts.size,3); const out=opts.get('out-dir'); fs.mkdirSync(out);
  const save=(f,v)=>fs.writeFileSync(path.join(out,f),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
  const sha=b=>createHash('sha256').update(b).digest('hex');
  try {
    const inputs=[];
    const read=(dir,file)=>{const p=path.join(opts.get(dir),file),b=fs.readFileSync(p);inputs.push({file:p,sha256:sha(b)});return JSON.parse(b);};
    const relationship=read('relationship-dir','snapshot.json'),rr=read('relationship-dir','complete.json');
    const ingress=read('ingress-dir','snapshot.json'),ir=read('ingress-dir','complete.json');
    assert.equal(rr.status,'whole109_existing_identity_observed_not_mapping_authority');
    assert.equal(ir.status,'read_only_ingress_compatibility_not_plan_or_apply');
    for(const [r,s,n] of [[rr,relationship,0],[ir,ingress,2]]){
      assert.equal(r.snapshot_sha256,inputs[n].sha256,'observation_hash_drift');
      assert.equal(r.independent_connections,2);assert.equal(r.verified_tls,true);assert.equal(r.read_only,true);assert.equal(r.production_writes,0);
      assert.deepEqual(r.sanity,s.sanity);assert.ok(Number.isFinite(Date.parse(r.at)));
    }
    const originals=loadSubsetOriginals(),now=new Date().toISOString();
    const plan=buildWorld2010SubsetIngress({observed_at:ir.at,relationship_snapshot:relationship,ingress_snapshot:ingress},originals);
    save('start.json',{at:now,mode:'offline_subset_qualification',inputs,production_writes:0});save('plan.json',plan);
    for(const i of inputs)assert.equal(sha(fs.readFileSync(i.file)),i.sha256,'input_changed_during_staging');
    const done={at:new Date().toISOString(),status:'whole109_subset_ingress_staged_not_production_authority',counts:plan.counts,
      plan_fingerprint:plan.fingerprint,plan_sha256:sha(fs.readFileSync(path.join(out,'plan.json'))),
      group_retained_discovery:ingress.group_discovery.length,group_retained_raw:ingress.group_raw.length,
      production_writes:0,relationships_repaired:0,execution_authorized:false};save('complete.json',done);return done;
  } catch(e){save('failure.json',{at:new Date().toISOString(),message:e.message,production_writes:0});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(stageSubsetIngress(process.argv.slice(2))));}
  catch(e){console.error('Subset staging rejected: '+e.message);process.exitCode=1;}
}
