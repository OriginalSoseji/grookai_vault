// Read-only preimage freeze for the interrupted operational run record.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(`${process.cwd()}/backend/package.json`),cfg=require('dotenv').parse(fs.readFileSync('.env.local'));
const ref='ycdxbpibncqcchqiihfz',u=new URL(cfg.SUPABASE_DB_URL),runId='199c0d77-42ff-459d-95d2-819ddd5ff27c',exec='catalog_jpn_xy4_family_containment_v1',source='grookai_jpn_xy4_family_containment_v1',pin='6cf22a949a8ef140227801d3317356507766f6d858a9d162b8d9a1d7c6654538';
assert.equal(new URL(cfg.SUPABASE_URL).hostname,`${ref}.supabase.co`);assert.ok(`${u.hostname} ${decodeURIComponent(u.username)}`.includes(ref));assert.match(fs.readFileSync('supabase/config.toml','utf8'),new RegExp(`project_id\\s*=\\s*"${ref}"`));
const dir='docs/audits/jpn_xy4_family_containment_20261120',planBytes=fs.readFileSync(`${dir}/family-plan.json`),sha=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(sha(planBytes),pin);
const rows=JSON.parse(planBytes).rows.slice(30,40),{Client}=require('pg'),db=new Client({connectionString:cfg.SUPABASE_DB_URL,connectionTimeoutMillis:10000});await db.connect();
try {
  await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='8s'");assert.equal((await db.query("select current_setting('transaction_read_only') as v")).rows[0].v,'on');
  const found=(await db.query('select to_jsonb(r) row from admin.import_runs r where id=$1',[runId])).rows;assert.equal(found.length,1);const before=found[0].row;
  assert.equal(before.kind,exec);assert.equal(before.status,'running');assert.equal(before.scope.mode,'rollback-proof');assert.equal(before.scope.package_fingerprint,pin);
  const archive=JSON.parse((await import('node:zlib')).gunzipSync(fs.readFileSync(`${dir}/executed-writer.json.gz`)));assert.equal(before.scope.writer_fingerprint,archive.fingerprint);
  const active=(await db.query('select pid from pg_stat_activity where application_name=$1 and pid<>pg_backend_pid()',[exec])).rows;assert.equal(active.length,0);
  const raw=(await db.query("select count(*)::int n from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'chunk'='3'",[source,pin])).rows[0].n;assert.equal(raw,0);
  const queues=(await db.query('select to_jsonb(q) row from public.card_print_family_review_queue q where id=any($1::uuid[]) order by id',[rows.map(r=>r.target_queue_before.id)])).rows.map(r=>r.row).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(queues,rows.map(r=>r.target_queue_before).sort((a,b)=>a.id.localeCompare(b.id)));
  const triggers=(await db.query("select tgname,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid='admin.import_runs'::regclass and not tgisinternal order by tgname")).rows;
  await db.query('rollback');
  const out={version:'XY4_INTERRUPTED_LEDGER_RECONCILIATION_V1',project_ref:ref,captured_at:new Date().toISOString(),run_id:runId,writer_fingerprint:archive.fingerprint,family_plan_sha256:pin,before,queue_preimages:queues,triggers};const bytes=Buffer.from(JSON.stringify(out,null,2)+'\n');fs.writeFileSync(`${dir}/interrupted-ledger-preimage.json`,bytes,{flag:'wx'});console.log(JSON.stringify({status:'read_only_preimage_frozen',sha256:sha(bytes),queues:queues.length,triggers:triggers.length}));
}finally{await db.end();}
