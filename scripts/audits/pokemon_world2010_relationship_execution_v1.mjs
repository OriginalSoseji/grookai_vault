import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildWorld2010RelationshipExecution} from '../../backend/catalog/pokemon_world2010_relationship_execution_v1.mjs';
import {loadSubsetOriginals} from './pokemon_world2010_subset_ingress_v1.mjs';

export function stageWorld2010Relationships(args) {
  const opts=new Map();for(const a of args){const m=a.match(/^--(projection-dir|baseline-dir|ingress-dir|sql-dir|master-dir|review-dir|out-dir)=(.+)$/);assert.ok(m&&!opts.has(m[1]),'unique_offline_relationship_arguments_required');opts.set(m[1],path.resolve(m[2]));}
  assert.equal(opts.size,7,'seven_explicit_paths_required');const out=opts.get('out-dir');fs.mkdirSync(out);
  const sha=b=>createHash('sha256').update(b).digest('hex'),bindings=[];
  const read=(dir,file)=>{const p=path.join(opts.get(dir),file),b=fs.readFileSync(p);bindings.push({file:p,sha256:sha(b)});return JSON.parse(b);};
  const save=(f,v)=>fs.writeFileSync(path.join(out,f),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
  try{
    const projection=read('projection-dir','projection.json'),review=read('review-dir','review.json');
    const ingress=read('ingress-dir','plan.json');
    const first=read('sql-dir','first.json'),second=read('sql-dir','second.json'),receipt=read('sql-dir','complete.json');
    assert.deepEqual(first,second,'independent_sql_observation_drift');assert.equal(receipt.status,'next92_executor_inputs_observed_not_execution_authority');
    assert.equal(receipt.independent_connections,2);assert.equal(receipt.read_only,true);assert.equal(receipt.verified_tls,true);assert.equal(receipt.production_writes,0);
    assert.deepEqual(receipt.sanity,first.sanity);assert.ok(first.sanity.cards>=40000&&first.sanity.sets>=150&&first.sanity.traits>=5000);
    for(const key of ['evidenceCollisions','mappingCollisions','candidateCollisions','ledgerCollisions'])assert.deepEqual(first[key],[],'live_collision:'+key);
    assert.equal(first.identities.projection_fingerprint,projection.fingerprint);
    const baseline=Object.fromEntries(['cards','sets','printings'].map(k=>[k+'Artifact',read('baseline-dir','english_master_index_'+k+'_v1.json')]));
    const active=read('master-dir','english_master_index_cards_v1.json').cards;
    const codes=new Set(projection.sets.map(s=>s.key));
    const input={intent_id:randomUUID(),projection,projection_inputs:{snapshot:ingress.input.relationship_snapshot,review,baseline},ingress,
      active_cards:active.filter(c=>codes.has(c.set_key)),sql_hashes:first.identities.hashes};
    save('start.json',{at:new Date().toISOString(),bindings,mode:'offline_relationship_package',production_writes:0});
    const plan=buildWorld2010RelationshipExecution(input,loadSubsetOriginals());save('plan.json',plan);
    for(const b of bindings)assert.equal(sha(fs.readFileSync(b.file)),b.sha256,'input_changed_during_staging');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'plan.json'))),plan);
    const done={at:new Date().toISOString(),status:'whole92_relationship_package_staged_local_qualification_only',fingerprint:plan.fingerprint,
      plan_sha256:sha(fs.readFileSync(path.join(out,'plan.json'))),counts:plan.counts,production_writes:0,relationships_repaired:0,production_execution_authorized:false};save('complete.json',done);return done;
  }catch(e){save('failure.json',{at:new Date().toISOString(),message:e.message,production_writes:0});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(stageWorld2010Relationships(process.argv.slice(2))));}catch(e){console.error('Relationship staging rejected: '+e.message);process.exitCode=1;}
}
