// Bounded operational-ledger reconciliation; no catalog or queue writes.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const dir='docs/audits/jpn_xy4_family_containment_20261120',require=createRequire(`${process.cwd()}/backend/package.json`),cfg=require('dotenv').parse(fs.readFileSync('.env.local'));
const ref='ycdxbpibncqcchqiihfz',u=new URL(cfg.SUPABASE_DB_URL),exec='catalog_jpn_xy4_family_containment_v1',source='grookai_jpn_xy4_family_containment_v1',pin='f180201cee39be2352f3caa8171ec5690fbde94aff57cc6d513ffe14ee0828e3';
assert.equal(new URL(cfg.SUPABASE_URL).hostname,`${ref}.supabase.co`);assert.ok(`${u.hostname} ${decodeURIComponent(u.username)}`.includes(ref));assert.match(fs.readFileSync('supabase/config.toml','utf8'),new RegExp(`project_id\\s*=\\s*"${ref}"`));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync(`${dir}/interrupted-ledger-preimage.json`);assert.equal(sha(bytes),pin);const plan=JSON.parse(bytes);assert.equal(plan.project_ref,ref);assert.equal(plan.triggers.length,0);
const writer=sha(fs.readFileSync(fileURLToPath(import.meta.url))),args=process.argv.slice(2),i=args.indexOf('--mode'),mode=i<0?'inspect':args[i+1];assert.ok(['inspect','rollback-proof','apply','verify'].includes(mode));
const proofFile=`${dir}/ledger-rollback-proof-${pin}-${writer}.json`,resultFile=`${dir}/ledger-reconciliation-${mode}.json`,msg='Rollback rehearsal interrupted by critically low local disk; read-only verification found no committed queue or raw changes.';
if(mode==='apply'){const p=JSON.parse(fs.readFileSync(proofFile));assert.equal(p.status,'rollback_proof_passed');assert.equal(p.plan_sha256,pin);assert.equal(p.writer_sha256,writer);}
const {Client}=require('pg'),db=new Client({connectionString:cfg.SUPABASE_DB_URL,connectionTimeoutMillis:10000,application_name:'xy4_interrupted_ledger_reconcile'});await db.connect();let tx=false,committed=false;
const unchanged=(row)=>{const x=structuredClone(row);delete x.status;delete x.finished_at;delete x.error;return x;};
async function observed(lock){
  const active=(await db.query('select pid from pg_stat_activity where application_name=$1 and pid<>pg_backend_pid()',[exec])).rows;assert.equal(active.length,0);
  const raw=(await db.query("select count(*)::int n from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'chunk'='3'",[source,plan.family_plan_sha256])).rows[0].n;assert.equal(raw,0);
  const qs=(await db.query(`select to_jsonb(q) row from public.card_print_family_review_queue q where id=any($1::uuid[]) order by id ${lock?'for share':''}`,[plan.queue_preimages.map(q=>q.id)])).rows.map(x=>x.row);assert.deepEqual(qs,plan.queue_preimages);
  const triggers=(await db.query("select tgname,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid='admin.import_runs'::regclass and not tgisinternal order by tgname")).rows;assert.deepEqual(triggers,plan.triggers);
  const result=(await db.query(`select to_jsonb(r) row from admin.import_runs r where id=$1 ${lock?'for update':''}`,[plan.run_id])).rows;assert.equal(result.length,1);return result[0].row;
}
try {
  await db.query(`begin isolation level serializable ${['rollback-proof','apply'].includes(mode)?'read write':'read only'}`);tx=true;await db.query("set local statement_timeout='15s'");await db.query("set local lock_timeout='3s'");
  if(['rollback-proof','apply'].includes(mode))await db.query('select pg_advisory_xact_lock(hashtext($1))',[exec]);
  const before=await observed(['rollback-proof','apply'].includes(mode));
  if(mode==='verify'){
    assert.equal(before.status,'error');assert.equal(before.error,msg);assert.ok(before.finished_at);assert.deepEqual(unchanged(before),unchanged(plan.before));
    await db.query('rollback');tx=false;fs.writeFileSync(resultFile,JSON.stringify({status:'independent_readback_passed',run_id:plan.run_id,plan_sha256:pin,writer_sha256:writer,after:before},null,2)+'\n',{flag:'wx'});console.log('independent_readback_passed');
  }else{
    assert.deepEqual(before,plan.before);
    if(mode==='inspect'){await db.query('rollback');tx=false;console.log('preflight_passed');}
    else{
      const changed=await db.query("update admin.import_runs r set status='error',finished_at=now(),error=$3 where r.id=$1 and to_jsonb(r)=$2::jsonb returning to_jsonb(r) row",[plan.run_id,JSON.stringify(plan.before),msg]);assert.equal(changed.rowCount,1);
      const after=changed.rows[0].row;assert.equal(after.status,'error');assert.equal(after.error,msg);assert.ok(after.finished_at);assert.deepEqual(unchanged(after),unchanged(plan.before));
      if(mode==='rollback-proof'){
        await db.query('rollback');tx=false;await db.query('begin isolation level repeatable read read only');tx=true;assert.deepEqual(await observed(false),plan.before);await db.query('rollback');tx=false;
        fs.writeFileSync(proofFile,JSON.stringify({status:'rollback_proof_passed',plan_sha256:pin,writer_sha256:writer,run_id:plan.run_id},null,2)+'\n',{flag:'wx'});console.log('rollback_proof_passed');
      }else{await db.query('commit');tx=false;committed=true;console.log('ledger_reconciled_verify_required');}
    }
  }
}catch(error){if(tx)await db.query('rollback').catch(()=>{});console.error(committed?'committed_verify_required':`not_confirmed: ${error.message}`);process.exitCode=1;}finally{await db.end();}
