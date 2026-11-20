// Independent read-only verification after all seven bounded containments.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';
const dir='docs/audits/jpn_xy4_family_containment_20261120',require=createRequire(`${process.cwd()}/backend/package.json`),cfg=require('dotenv').parse(fs.readFileSync('.env.local'));
const ref='ycdxbpibncqcchqiihfz',url=new URL(cfg.SUPABASE_DB_URL),pin='6cf22a949a8ef140227801d3317356507766f6d858a9d162b8d9a1d7c6654538',source='grookai_jpn_xy4_family_containment_v1';
assert.equal(new URL(cfg.SUPABASE_URL).hostname,`${ref}.supabase.co`);assert.ok(`${url.hostname} ${decodeURIComponent(url.username)}`.includes(ref));assert.match(fs.readFileSync('supabase/config.toml','utf8'),new RegExp(`project_id\\s*=\\s*"${ref}"`));assert.ok(cfg.SUPABASE_SECRET_KEY);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=fs.readFileSync(`${dir}/family-plan.json`);assert.equal(sha(bytes),pin);
const writerFiles=['backend/catalog/jpn_xy4_family_containment_v1.mjs','backend/catalog/jpn_xy4_family_containment_policy_v1.mjs','backend/lib/contracts/contract_scope_v1.mjs','backend/lib/contracts/execute_canon_write_v1.mjs','backend/lib/contracts/run_post_write_proofs_v1.mjs'];
const currentWriter=sha(Buffer.from(JSON.stringify(writerFiles.map(path=>[path,sha(fs.readFileSync(path))]))));
const allRows=JSON.parse(bytes).rows;assert.equal(allRows.length,62);
const args=process.argv.slice(2),chunkIndex=args.indexOf('--chunk'),selected=chunkIndex<0?null:Number(args[chunkIndex+1]);
if(selected!==null&&(!Number.isInteger(selected)||selected<0||selected>6))throw Error('XY4_CHUNK_INVALID');
const chunks=selected===null?[0,1,2,3,4,5,6]:[selected];
const rows=selected===null?allRows:allRows.slice(selected*10,selected*10+10),ids=rows.map(r=>r.parent_before.id);
const {Client}=require('pg'),{createClient}=require('@supabase/supabase-js'),storage=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
const db=new Client({connectionString:cfg.SUPABASE_DB_URL,connectionTimeoutMillis:10000});await db.connect();
try {
  await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='15s'");
  assert.equal((await db.query("select current_setting('transaction_read_only') as v")).rows[0].v,'on');
  const q=async(sql,args)=>(await db.query(sql,args)).rows;
  const parents=(await q('select to_jsonb(p) row from public.card_prints p where id=any($1::uuid[])',[ids])).map(x=>x.row);
  const identities=(await q('select to_jsonb(i) row from public.card_print_identity i where card_print_id=any($1::uuid[])',[ids])).map(x=>x.row);
  const links=(await q('select to_jsonb(l) row from public.card_print_species l where card_print_id=any($1::uuid[])',[ids])).map(x=>x.row);
  const evidence=(await q('select to_jsonb(e) row from public.card_print_identity_source_evidence e where card_print_id=any($1::uuid[])',[ids])).map(x=>x.row);
  const queues=(await q('select to_jsonb(q) row from public.card_print_family_review_queue q where card_print_id=any($1::uuid[])',[ids])).map(x=>x.row);
  const species=(await q('select to_jsonb(s) row from public.pokemon_species s where id=any($1::uuid[])',[rows.map(r=>r.species_before.id)])).map(x=>x.row);
  const hashes=await q('select i.id,i.identity_key_hash,public.card_print_identity_hash_v1(i.identity_domain,i.identity_key_version,i.set_code_identity,i.printed_number,i.normalized_printed_name,i.source_name_raw,i.identity_payload) computed from public.card_print_identity i where i.id=any($1::uuid[])',[rows.map(r=>r.identity_before.id)]);
  assert.equal(hashes.length,rows.length);assert.ok(hashes.every(r=>r.identity_key_hash===r.computed));
  const allReceipts=await q("select id::text,payload from public.raw_imports where source=$1 and payload->>'package_fingerprint'=$2 and payload->>'_kind'='xy4_family_containment_receipt' order by id",[source,pin]);
  const receipts=allReceipts.filter(r=>chunks.includes(r.payload.chunk));assert.equal(receipts.length,chunks.length);
  const sort=a=>a.sort((x,y)=>String(x.id).localeCompare(String(y.id))),drop=x=>{x=structuredClone(x);delete x.updated_at;return x};
  assert.deepEqual(sort(species),sort([...new Map(rows.map(r=>[r.species_before.id,r.species_before])).values()]));
  const sources=new Map(),receiptIds=[];
  for(const chunk of chunks){
    const matches=receipts.filter(r=>r.payload.chunk===chunk);assert.equal(matches.length,1);const receipt=matches[0],subset=allRows.slice(chunk*10,chunk*10+10);receiptIds.push(receipt.id);assert.equal(receipt.payload.writer_fingerprint,currentWriter);
    const raw=(await q('select payload from public.raw_imports where id=$1 and source=$2',[receipt.payload.source_snapshot_raw_import_id,source]))[0]?.payload;
    assert.ok(raw);assert.equal(raw._kind,'xy4_family_containment_source_snapshot');assert.equal(raw.chunk,chunk);assert.equal(raw.run_id,receipt.payload.run_id);assert.equal(raw.writer_fingerprint,receipt.payload.writer_fingerprint);assert.deepEqual(raw.rows,subset);assert.equal(sha(Buffer.from(raw.plan_base64,'base64')),pin);assert.equal(raw.sources.length,subset.length);
    for(const r of subset){const hits=raw.sources.filter(s=>s.official_id===r.source.official_id);assert.equal(hits.length,1);const s=hits[0];assert.equal(s.page_url,r.source.official_page);assert.equal(s.image_url,r.source.official_image);assert.equal(sha(Buffer.from(s.page_base64,'base64')),r.source.official_page_sha256);assert.equal(sha(Buffer.from(s.image_base64,'base64')),r.source.image_sha256);sources.set(r.parent_before.id,s);}
  }
  const prefixes=rows.map(r=>r.source.image_sha256.slice(0,24));
  const owners=await q("select id,substring(image_path from '/([a-f0-9]{24})[^/]*$') prefix from public.card_prints where substring(image_path from '/([a-f0-9]{24})[^/]*$')=any($1::text[]) order by id",[prefixes]);
  assert.deepEqual(sort(owners),sort(rows.map(r=>({id:r.parent_before.id,prefix:r.source.image_sha256.slice(0,24)}))));
  for(const r of rows){
    assert.deepEqual(parents.find(x=>x.id===r.parent_before.id),r.parent_before);
    assert.deepEqual(sort(identities.filter(i=>i.card_print_id===r.parent_before.id)),sort(r.identities_before));
    assert.deepEqual(sort(links.filter(l=>l.card_print_id===r.parent_before.id)),sort(r.links_before));
    assert.deepEqual(sort(evidence.filter(e=>e.card_print_id===r.parent_before.id)),sort(r.evidence_before));
    const expected=r.queues_before.map(x=>x.id===r.target_queue_before.id?{...x,review_status:'superseded',family_link_promotion_allowed:false}:x),norm=x=>x.id===r.target_queue_before.id?drop(x):x;
    assert.deepEqual(sort(queues.filter(x=>x.card_print_id===r.parent_before.id).map(norm)),sort(expected.map(norm)));
    const s=sources.get(r.parent_before.id);assert.ok(s);assert.equal(sha(fs.readFileSync(`${dir}/official-captures/${r.source.official_id}.html`)),r.source.official_page_sha256);assert.equal(sha(fs.readFileSync(`${dir}/official-captures/${r.source.official_id}.jpg`)),r.source.image_sha256);
    await delay(100);const {data,error}=await storage.from('user-card-images').download(r.parent_before.image_path);if(error||!data)throw Error('INDEPENDENT_STORAGE_READ_FAILED');assert.equal(sha(Buffer.from(await data.arrayBuffer())),r.source.image_sha256);
  }
  await db.query('rollback');
  const out={version:'XY4_FAMILY_CONTAINMENT_INDEPENDENT_READBACK_V1',verified_at:new Date().toISOString(),status:'passed',chunk:selected,records:rows.length,receipt_ids:receiptIds,scope:'Read-only queue, parent, identity, link, evidence, source bytes, exact stored images and parent-prefix ownership; not a complete catalog repair.'};
  fs.writeFileSync(`${dir}/independent-readback${selected===null?'':`-chunk-${selected}`}.json`,JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out));
} finally {await db.end();}
