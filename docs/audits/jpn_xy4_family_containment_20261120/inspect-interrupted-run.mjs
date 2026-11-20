// Read-only containment and interrupted-rehearsal status check.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(`${process.cwd()}/backend/package.json`),cfg=require('dotenv').parse(fs.readFileSync('.env.local'));
const ref='ycdxbpibncqcchqiihfz',url=new URL(cfg.SUPABASE_DB_URL),source='grookai_jpn_xy4_family_containment_v1',pin='6cf22a949a8ef140227801d3317356507766f6d858a9d162b8d9a1d7c6654538';
assert.equal(new URL(cfg.SUPABASE_URL).hostname,`${ref}.supabase.co`);assert.ok(`${url.hostname} ${decodeURIComponent(url.username)}`.includes(ref));
const plan=JSON.parse(fs.readFileSync('docs/audits/jpn_xy4_family_containment_20261120/family-plan.json'));
const {Client}=require('pg'),db=new Client({connectionString:cfg.SUPABASE_DB_URL,connectionTimeoutMillis:10000});await db.connect();
try {
  await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='8s'");assert.equal((await db.query("select current_setting('transaction_read_only') as v")).rows[0].v,'on');
  const ids=plan.rows.map(r=>r.target_queue_before.id),queues=(await db.query('select to_jsonb(q) row from public.card_print_family_review_queue q where id=any($1::uuid[]) order by id',[ids])).rows.map(r=>r.row);
  assert.equal(queues.length,62);const strip=x=>{x=structuredClone(x);delete x.updated_at;return x};
  for(let i=0;i<plan.rows.length;i++){const before=plan.rows[i].target_queue_before,actual=queues.find(q=>q.id===before.id);assert.ok(actual);const expected=i<30?{...before,review_status:'superseded',family_link_promotion_allowed:false}:before;assert.deepEqual(strip(actual),strip(expected));}
  const receipts=(await db.query("select id::text,payload->>'chunk' as chunk from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'_kind'='xy4_family_containment_receipt' order by id",[source,pin])).rows;
  assert.deepEqual(receipts.map(r=>Number(r.chunk)).sort(),[0,1,2]);
  const chunk3=(await db.query("select count(*)::int as n from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'chunk'='3'",[source,pin])).rows[0].n;assert.equal(chunk3,0);
  const actors=(await db.query("select pid,state from pg_stat_activity where application_name='catalog_jpn_xy4_family_containment_v1' and pid<>pg_backend_pid() order by pid")).rows;
  const runs=(await db.query("select id,status,scope->>'mode' as mode from admin.import_runs where kind=$1 order by started_at desc limit 4",['catalog_jpn_xy4_family_containment_v1'])).rows;
  await db.query('rollback');console.log(JSON.stringify({contained:30,unchanged:32,receipt_ids:receipts.map(r=>r.id),chunk3_raw_rows:chunk3,active_writer_sessions:actors,runs}));
}finally{await db.end();}
