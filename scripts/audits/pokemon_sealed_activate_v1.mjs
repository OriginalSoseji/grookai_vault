import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import {pokemonSealedHashV1 as hash,POKEMON_SEALED_REVIEWER_ID} from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import {pgSslConfig} from './japanese_master_index_v4/read_only_guard_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(['plan','canary','apply','readback'].includes(args.mode)&&args.images&&args.out);
const imagePlan=JSON.parse(gunzipSync(await fs.readFile(args.images)));
const {fingerprint,...imageBody}=imagePlan;assert.equal(fingerprint,hash(imageBody));
const image=imagePlan.payload.releases[0],priceId=image.source_price_release_id;
assert.equal(image.game_key,'pokemon');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'');
dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'ycdxbpibncqcchqiihfz.supabase.co');
const options={connectionString:process.env.SUPABASE_DB_URL,ssl:pgSslConfig(process.env.SUPABASE_DB_URL),statement_timeout:120000,connectionTimeoutMillis:30000};
async function state(c,others=false){
  const rows={};for(const table of ['sealed_product_release_pointer','sealed_product_image_release_pointer','sealed_product_game_release_controls'])
    rows[table]=(await c.query(`select to_jsonb(r) value from public.${table} r where game_key ${others?'<>':'='} 'pokemon' order by game_key`)).rows;
  return rows;
}
async function verify(c){
  await c.query("select set_config('request.jwt.claims','{\"role\":\"authenticated\"}',true)");
  const expected=imagePlan.payload.release_members.map(r=>r.variant_id).sort(),rows=[];
  for(let offset=0;offset<expected.length+100;offset+=100){
    const page=(await c.query("select * from public.get_active_pokemon_sealed_catalog_v1('pokemon',null,100,$1,null,null)",[offset])).rows;
    rows.push(...page);if(page.length<100)break;
  }
  assert.deepEqual(rows.map(r=>r.variant_id).sort(),expected,'Published variant set mismatch');
  assert.ok(rows.every(r=>r.game_key==='pokemon'&&r.price_release_id===priceId&&r.image_release_id===image.id&&Number(r.market_price)>0));
  for(const r of rows.slice(0,5))assert.equal((await c.query('select public.pokemon_sealed_image_object_signing_authorized_v1($1,$2) allowed',[r.image_storage_bucket,r.image_object_path])).rows[0].allowed,true);
  assert.equal((await c.query("select public.pokemon_sealed_image_object_signing_authorized_v1('user-card-images','sealed/mtg/sha256/00/'||repeat('0',64)||'.jpg') allowed")).rows[0].allowed,false);
  for(const language of ['en','ja']){
    const filtered=(await c.query("select * from public.get_active_pokemon_sealed_catalog_v1('pokemon',null,100,0,null,$1)",[language])).rows;
    assert.ok(filtered.length>0);assert.ok(filtered.every(r=>r.language_code===language));
  }
  const boxes=(await c.query("select * from public.get_active_pokemon_sealed_catalog_v1('pokemon',null,100,0,'booster_box',null)")).rows;
  assert.ok(boxes.length>0&&boxes.every(r=>r.package_form==='booster_box'));
  await c.query("select set_config('request.jwt.claims','{\"role\":\"anon\"}',true)");
  assert.equal((await c.query("select * from public.get_active_pokemon_sealed_catalog_v1('pokemon',null,1,0,null,null)")).rowCount,0);
  assert.equal((await c.query("select has_function_privilege('anon','public.get_active_pokemon_sealed_catalog_v1(text,text,integer,integer,text,text)','EXECUTE') allowed")).rows[0].allowed,false);
  return {count:rows.length,rows:rows.map(r=>({variant_id:r.variant_id,name:r.canonical_name,language:r.language_code,form:r.package_form,market_price:r.market_price}))};
}
let c=new pg.Client(options);await c.connect();let committed=false;
try{
  await c.query(['plan','readback'].includes(args.mode)?'begin isolation level repeatable read read only':'begin isolation level serializable');
  const before=await state(c),others=await state(c,true);
  assert.equal((await c.query('select manifest_fingerprint from sealed_product_image_releases where id=$1 and game_key=$2 and release_state=$3',[image.id,'pokemon','frozen'])).rows[0]?.manifest_fingerprint,image.manifest_fingerprint);
  const body={version:'POKEMON_SEALED_ACTIVATION_V1',producer_commit:head,price_release_id:priceId,image_release_id:image.id,
    image_plan_fingerprint:fingerprint,image_manifest:image.manifest_fingerprint,expected_member_count:image.expected_member_count,
    expected_before:before,protected_pointers:others,visibility:'signed_in'};
  const plan={...body,fingerprint:hash(body)};
  if(args.mode==='plan'){
    assert.equal(before.sealed_product_release_pointer.length,0);assert.equal(before.sealed_product_image_release_pointer.length,0);
    assert.equal(before.sealed_product_game_release_controls[0]?.value.release_status,'hidden');
    await c.query('rollback');await fs.mkdir(args.out,{recursive:true});await fs.writeFile(path.join(args.out,'run_plan.json'),JSON.stringify(plan,null,2));
    console.log(JSON.stringify({fingerprint:plan.fingerprint,expected:image.expected_member_count}));
  }else{
    const frozen=JSON.parse(await fs.readFile(path.join(args.out,'run_plan.json'),'utf8'));
    assert.equal(frozen.fingerprint,args.fingerprint);assert.equal(frozen.producer_commit,head);assert.equal(frozen.image_plan_fingerprint,fingerprint);
    assert.deepEqual(others,frozen.protected_pointers);
    const already=before.sealed_product_release_pointer[0]?.value.release_id===priceId&&
      before.sealed_product_image_release_pointer[0]?.value.image_release_id===image.id&&before.sealed_product_game_release_controls[0]?.value.release_status==='signed_in';
    if(!already){
      assert.notEqual(args.mode,'readback','Activation not applied');assert.deepEqual(before,frozen.expected_before,'Activation CAS drift');
      await c.query("set local lock_timeout='5s'");
      await c.query('select * from sealed_product_set_active_release_v1($1,null,$2)',[priceId,POKEMON_SEALED_REVIEWER_ID]);
      await c.query('select * from sealed_product_set_active_image_release_v1($1,null,$2)',[image.id,POKEMON_SEALED_REVIEWER_ID]);
      const updated=await c.query(`update sealed_product_game_release_controls set release_status='signed_in',activated_at=now(),updated_at=now(),
        activated_by='POKEMON_SEALED_PRODUCTION_V1',evidence=evidence||$1::jsonb where game_key='pokemon' and release_status='hidden'`,
        [JSON.stringify({activation_fingerprint:frozen.fingerprint,image_release_id:image.id,price_release_id:priceId})]);
      assert.equal(updated.rowCount,1);
    }
    const proof=await verify(c);assert.deepEqual(await state(c,true),others);
    if(args.mode==='apply'){await c.query('commit');committed=true;}else await c.query('rollback');
    await c.end();c=new pg.Client(options);await c.connect();
    if(args.mode==='canary')assert.deepEqual(await state(c),before,'Rollback did not restore controls');
    else {await c.query('begin read only');await verify(c);await c.query('rollback');}
    const summary={mode:args.mode,status:'passed',committed,rows_written:committed&&!already?3:0,fingerprint:frozen.fingerprint,
      producer_commit:head,published_rows:proof.count,anonymous_rows:0,protected_games:'unchanged',timestamp:new Date().toISOString()};
    await fs.writeFile(path.join(args.out,`${args.mode}.json`),JSON.stringify(summary,null,2));
    await fs.writeFile(path.join(args.out,`${args.mode}_published_rows.json`),JSON.stringify(proof.rows));console.log(JSON.stringify(summary));
  }
}catch(error){if(!committed)await c.query('rollback').catch(()=>{});throw error;}finally{await c.end();}
