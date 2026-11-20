// Read-only freeze of the 62 source-verified conflicting family approvals.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const root=process.cwd(), audit='C:/grookai_vault/docs/audits/promo_era_search_review_20261118',dir='docs/audits/jpn_xy4_family_containment_20261120';
const require=createRequire(`${root}/backend/package.json`),cfg=require('dotenv').parse(fs.readFileSync('.env.local')),ref='ycdxbpibncqcchqiihfz',u=new URL(cfg.SUPABASE_DB_URL);
assert.equal(new URL(cfg.SUPABASE_URL).hostname,`${ref}.supabase.co`);assert.ok(`${u.hostname} ${decodeURIComponent(u.username)}`.includes(ref));
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex'), input=JSON.parse(fs.readFileSync(`${audit}/xy4-verified-identity-preimages-20261120.json`)),proof=JSON.parse(fs.readFileSync(`${audit}/xy4-coordinate-source-storage-verification-20261120.json`));
const targets=input.assessed.filter(r=>r.status==='official_image_and_dex_conflict_with_active_primary');assert.equal(targets.length,62);
fs.mkdirSync(`${dir}/official-captures`,{recursive:true});
const {Client}=require('pg'),db=new Client({connectionString:cfg.SUPABASE_DB_URL,connectionTimeoutMillis:10000});await db.connect();
try {
  await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='8s'");
  assert.equal((await db.query("select current_setting('transaction_read_only') as v")).rows[0].v,'on');
  const ids=targets.map(t=>t.parent_id),q=async(sql)=>(await db.query(sql,[ids])).rows.map(r=>r.row);
  const parents=await q('select to_jsonb(p) row from public.card_prints p where id=any($1::uuid[]) order by id');
  const identities=await q('select to_jsonb(i) row from public.card_print_identity i where card_print_id=any($1::uuid[]) order by id');
  const links=await q('select to_jsonb(l) row from public.card_print_species l where card_print_id=any($1::uuid[]) order by id');
  const evidence=await q('select to_jsonb(e) row from public.card_print_identity_source_evidence e where card_print_id=any($1::uuid[]) order by id');
  const queues=await q('select to_jsonb(q) row from public.card_print_family_review_queue q where card_print_id=any($1::uuid[]) order by id');
  const species=(await db.query('select to_jsonb(s) row from public.pokemon_species s where id=any($1::uuid[]) order by id',[[...new Set(links.map(l=>l.species_id))]])).rows.map(r=>r.row);
  assert.equal(parents.length,62);const rows=[];
  for(const target of targets){
    const p=parents.find(p=>p.id===target.parent_id),a=proof.results.find(r=>r.gv_id===target.gv_id),base=input.parents.find(r=>r.id===target.parent_id);
    assert.ok(p&&base&&a&&a.status==='exact_image_candidate_only');
    for(const key of ['id','gv_id','name','number','number_plain','printed_total','printed_set_abbrev','image_status','image_path'])assert.deepEqual(p[key],base[key]);
    const ii=identities.filter(i=>i.card_print_id===p.id),ll=links.filter(l=>l.card_print_id===p.id),ev=evidence.filter(e=>e.card_print_id===p.id),qq=queues.filter(q=>q.card_print_id===p.id);
    const active=ii.filter(i=>i.is_active),primary=ll.filter(l=>l.active&&l.role==='primary'),enabled=qq.filter(q=>q.active&&q.review_status==='approved_for_family_link_promotion'&&q.family_link_promotion_allowed);
    assert.equal(active.length,1);assert.equal(primary.length,1);assert.equal(enabled.length,1);
    const linked=species.find(s=>s.id===primary[0].species_id);assert.ok(linked);assert.equal(Number(a.dex),Number(target.official_dex));assert.notEqual(Number(linked.national_dex_number),Number(a.dex));
    assert.equal(enabled[0].card_print_identity_id,active[0].id);assert.ok(active[0].identity_payload.normalized_family_name_candidates.includes(enabled[0].normalized_family_candidate));
    const officialDir=`${audit}/xy4-coordinate-official-captures-20261120`,receipt=JSON.parse(fs.readFileSync(`${officialDir}/${a.official_id}-receipt.json`));
    assert.equal(receipt.gv_id,p.gv_id);assert.equal(receipt.status,'matching_prefix_candidate_only');assert.equal(receipt.image.sha256,a.official_sha256);assert.equal(receipt.image.storage_path_prefix,a.official_sha256.slice(0,24));
    const page=fs.readFileSync(`${officialDir}/${a.official_id}.html`),image=fs.readFileSync(`${officialDir}/${a.official_id}.image`);
    assert.equal(sha(page),receipt.page.sha256);assert.equal(sha(image),a.official_sha256);assert.equal(a.official_sha256,a.stored_sha256);
    for(const [ext,bytes] of [['html',page],['jpg',image]])fs.writeFileSync(`${dir}/official-captures/${a.official_id}.${ext}`,bytes,{flag:'wx'});
    rows.push({expected:{official_dex:Number(a.dex),official_printed_number:receipt.printed_number,wrong_family:enabled[0].normalized_family_candidate},parent_before:p,identity_before:active[0],identities_before:ii,links_before:ll,evidence_before:ev,queues_before:qq,target_queue_before:enabled[0],species_before:linked,source:{official_id:a.official_id,official_page:receipt.page.url,official_page_sha256:receipt.page.sha256,official_image:receipt.image.url,image_sha256:a.official_sha256,current:{image_path:p.image_path}}});
  }
  await db.query('rollback');
  const out={version:'XY4_FAMILY_CONTAINMENT_PREFLIGHT_V1',project_ref:ref,captured_at:new Date().toISOString(),scope:'Read-only exact preimages. Proposed change only disables and supersedes 62 conflicting family approvals; identity, evidence, links, coordinates and parent records remain unchanged.',rows};
  const bytes=Buffer.from(JSON.stringify(out,null,2)+'\n');fs.writeFileSync(`${dir}/family-plan.json`,bytes,{flag:'wx'});
  console.log(JSON.stringify({rows:rows.length,sha256:sha(bytes)}));
} finally {await db.end();}
