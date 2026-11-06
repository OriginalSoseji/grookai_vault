// Compare full public schemas/security and all governed intake object fingerprints.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {captureDateObjectsSql as captureObjectsSql} from './reviewed_intake_date_objects_v1.mjs';
const root='C:/gv_intake_release_20261028';assert.equal(process.cwd().replaceAll('\\','/'),root);
const work='C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1';
const out=work+'/date-target-comparison-v1';assert.equal(fs.existsSync(out),false);
const sha=b=>createHash('sha256').update(b).digest('hex');
const rawFrozen=JSON.parse(fs.readFileSync(work+'/candidate-frozen-date-v1.json'));const frozen={migration:rawFrozen.file,sha256:rawFrozen.sha256};assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+frozen.migration)),frozen.sha256);
const expected=JSON.parse(fs.readFileSync(root+'/docs/audits/reviewed_intake_date_release_20261028/object-fingerprints.json'));
const query=fs.readFileSync(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','utf8');
const snapshots=[],objects=[];fs.mkdirSync(out);
for(const project of ['reviewed-intake-date-fresh-479-20261028','reviewed-intake-draft-477-20261028']){
  assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
  const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:120000,maxBuffer:64_000_000});
  const snapshot=JSON.parse(sql(query));assert.equal(snapshot.LEDGER.length,479);assert.equal(snapshot.read_only,'on');
  const current=JSON.parse(sql('begin read only;set local search_path=pg_catalog,public,extensions;'+captureObjectsSql()+'rollback;'));
  assert.ok(isDeepStrictEqual(current,expected),'Governed intake fingerprints differ');
  const bucket=JSON.parse(sql("select to_jsonb(b)-array['created_at','updated_at'] from storage.buckets b where id='vault-intake-private'"));
  assert.equal(bucket.public,false);assert.equal(bucket.file_size_limit,16777216);assert.deepEqual(bucket.allowed_mime_types,['image/jpeg','image/png']);
  fs.writeFileSync(out+'/'+project+'-catalog.json',JSON.stringify(snapshot));
  snapshots.push(snapshot);objects.push(current);
}
const require=createRequire(root+'/package.json');
for(const name of ['schemainspect','migra','client'])assert.equal(require('@pgkit/'+name+'/package.json').version,'0.6.1');
const {PostgreSQL}=require('@pgkit/schemainspect'),{Migration}=require('@pgkit/migra');
const queries=Object.fromEntries(Object.entries(new PostgreSQL({},'17.6')).filter(([k])=>k.endsWith('_QUERY')));assert.equal(Object.keys(queries).length,15);
async function inspect(snapshot){
  const map=new Map(Object.entries(queries).map(([k,q])=>[q,snapshot[k]]));
  const model=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async q=>{assert.equal(q.values.length,0);assert.ok(map.has(q.sql));return map.get(q.sql);}});
  model.one_schema('public');for(const k of ['types','domains','materialized_views','composite_types'])model[k]=Object.fromEntries(Object.entries(model[k]).filter(([,v])=>v.schema==='public'));return model;
}
const left=await inspect(snapshots[0]),right=await inspect(snapshots[1]);
const diff=await Migration.create(left,right,{schema:'public'});diff.set_safety(false);diff.add_all_changes(true);
fs.writeFileSync(out+'/diff-never-executed.sql',diff.sql);assert.equal(diff.sql.trim(),'');
assert.ok(isDeepStrictEqual(snapshots[0].SECURITY,snapshots[1].SECURITY));
const report={at:new Date().toISOString(),pass:true,sourceSha256:frozen.sha256,targetLedger:479,fullPublicSchemaDiffBytes:0,securityObjects:snapshots[0].SECURITY.length,securityExact:true,governedIntakeObjects:objects[0].length,governedFingerprintsExact:true,privateBucketExact:true,functionTextNormalization:false,productionWrites:0};
fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(root+'/docs/audits/reviewed_intake_date_release_20261028/target-comparison.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
