// Fresh read-only artist presence count for the fixed original 30,924-parent baseline.
import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const root='C:/grookai_vault',require=createRequire(`${root}/backend/package.json`),config=require('dotenv').parse(fs.readFileSync(`${root}/.env.local`));
const ref='ycdxbpibncqcchqiihfz',url=new URL(config.SUPABASE_DB_URL);
assert.equal(new URL(config.SUPABASE_URL).hostname,`${ref}.supabase.co`);assert.ok(`${url.hostname} ${decodeURIComponent(url.username)}`.includes(ref));
assert.match(fs.readFileSync(`${root}/supabase/config.toml`,'utf8'),new RegExp(`project_id\\s*=\\s*"${ref}"`));
const baseline=JSON.parse(gunzipSync(fs.readFileSync(`${root}/docs/audits/catalog_jpn_artist_completion_v1_20261109/baseline.json.gz`)));
const ids=baseline.parents.map(p=>p.id);assert.equal(ids.length,30924);assert.equal(new Set(ids).size,30924);
const {Client}=require('pg'),db=new Client({connectionString:config.SUPABASE_DB_URL,connectionTimeoutMillis:10000});await db.connect();
try {await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='60s'");
 const sanity=(await db.query(`select current_setting('transaction_read_only') read_only,(select count(*)::int from public.card_prints) parents,(select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`)).rows[0];
 assert.equal(sanity.read_only,'on');assert.ok(sanity.parents>=40000&&sanity.sets>=150&&sanity.traits>=5000);
 const counts=(await db.query(`select count(*)::int baseline, count(p.id)::int found, count(*) filter(where p.id is null)::int missing,
 count(*) filter(where p.id is not null and nullif(trim(p.artist),'') is not null)::int artist_nonblank,
 count(*) filter(where p.id is not null and nullif(trim(p.artist),'') is null)::int artist_null_or_blank
 from unnest($1::uuid[]) b(id) left join public.card_prints p on p.id=b.id`,[ids])).rows[0];
 assert.equal(counts.baseline,30924);await db.query('rollback');
 const out={captured_at:new Date().toISOString(),project_ref:ref,sanity,scope:'Presence only for original 30,924 IDs; does not verify artist correctness, approvals, or disposition of retired/suppressed records.',counts};
 fs.writeFileSync(new URL('./original-artist-baseline-presence-post104-20261120.json',import.meta.url),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(out));
}finally{await db.end();}
