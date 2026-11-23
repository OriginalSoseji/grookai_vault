// Read-only preflight only; never writes to catalog or run ledger.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {isDeepStrictEqual} from 'node:util';
import {captureXyPromoSourceProof} from '../../../backend/catalog/xy_promo_source_proof_v1.mjs';
import {captureXyPromoProtectedState} from '../../../backend/catalog/xy_promo_protected_state_v1.mjs';
const root=process.cwd(),dir=new URL('./',import.meta.url),read=f=>fs.readFileSync(new URL(f,dir));
const dataBytes=read('xy-pair-postsync-readback.json'),snapshot=JSON.parse(dataBytes),env=fs.readFileSync(`${root}/.env.local`,'utf8');
const val=k=>env.match(new RegExp(`^${k}=(.*)$`,'m'))?.[1].trim().replace(/^['"]|['"]$/g,'');
const ref='ycdxbpibncqcchqiihfz',db=val('SUPABASE_DB_URL'),url=new URL(db);
assert.equal(snapshot.project_ref,ref);assert.equal(val('SUPABASE_URL'),`https://${ref}.supabase.co`);
assert.match(fs.readFileSync(`${root}/supabase/config.toml`,'utf8'),new RegExp(`project_id\\s*=\\s*"${ref}"`));
assert.ok(`${url.hostname} ${url.username}`.includes(ref));
const checklists={};for(const [number,slug] of [['XY177','karen'],['XY198','camerupt']])checklists[number]={
 receipt:JSON.parse(read(`checklists/${slug}-receipt.json`)),bytes:read(`checklists/${slug}.html`)};
const {Client}=createRequire(`${root}/backend/package.json`)('pg'),c=new Client({connectionString:db,connectionTimeoutMillis:10000});
console.log(`REMOTE READ ONLY: ${val('SUPABASE_URL')}`);await c.connect();
try{
 await c.query('begin isolation level repeatable read read only');await c.query("set local statement_timeout='60s'");
 const sanity=(await c.query(`select current_setting('transaction_read_only') read_only,(select count(*)::int from card_prints) parents,
 (select count(*)::int from sets) sets,(select count(*)::int from card_print_traits) traits`)).rows[0];
 assert.equal(sanity.read_only,'on');assert.ok(sanity.parents>=40000&&sanity.sets>=150&&sanity.traits>=5000);
 const ids=snapshot.parents.map(p=>p.id),parents=(await c.query('select to_jsonb(p) row from card_prints p where id=any($1::uuid[]) order by gv_id',[ids])).rows.map(x=>x.row);
 assert.ok(isDeepStrictEqual(parents,snapshot.parents),'PARENT_DRIFT');
 const evidence=await captureXyPromoSourceProof(c,snapshot,checklists),protectedState=await captureXyPromoProtectedState(c,ids);
 const report={version:'XY_PROMO_RARITY_READ_ONLY_PREFLIGHT_V1',status:'review_only_preflight_passed',target:ref,sanity,
  at:new Date().toISOString(),snapshot_sha256:crypto.createHash('sha256').update(dataBytes).digest('hex'),
  candidates:parents.map(p=>p.gv_id),reviews:evidence.reviews,protectedState,database_writes:0};
 await c.query('rollback');fs.writeFileSync(new URL('xy-review-preflight.json',dir),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:report.status,candidates:report.candidates,database_writes:0}));
}finally{await c.end();}
