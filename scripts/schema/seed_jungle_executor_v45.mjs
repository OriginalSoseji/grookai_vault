// One-use isolated427 fixture population; never resets or touches production.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';import pg from 'pg';
import {inspectJungleExecutorV45} from './inspect_jungle_executor_v45.mjs';
import {assertJungleExecutorLocalV45 as assertJungleReleaseTarget} from './inspect_jungle_executor_v45.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',out=base+'/executor-qualification-v45/seed',read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),'c:/gv_jungle_edition_20261001');
const runtime=inspectJungleExecutorV45(),freeze=read(base+'/executor-full-427-v45/freeze.json');assert.equal(read(base+'/executor-full-427-v45/replay-result.json').status,'passed');
assert.equal(Object.keys(freeze.sourceHashes).length,427);for(const [n,h]of Object.entries(freeze.sourceHashes))assert.equal(sha(fs.readFileSync('supabase/migrations/'+n)),h,n);
assert.equal(fs.existsSync(out),false,'Never repeat a consumed seed intent');fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});save('intent.json',{at:new Date().toISOString(),runtime,consumed:true,productionWrites:0,sourceSha256:sha(fs.readFileSync(new URL(import.meta.url)))});
const c=new pg.Client({host:'127.0.0.1',port:54800,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:5000});await c.connect();
try{
 await assertJungleReleaseTarget(c,'local_qualification');assert.equal((await c.query('select host(inet_server_addr()) a')).rows[0].a,runtime.address);
 assert.deepEqual((await c.query('select version from supabase_migrations.schema_migrations order by version')).rows, Object.keys(freeze.sourceHashes).sort().map(n=>({version:n.split('_')[0]})));
 for(const t of ['auth.users','card_prints','card_printings','vault_item_instances','vendor_receipt_books','jungle_edition_identity_links_v1','tcgplayer_jungle_edition_bindings_v1','market_price_current_publication'])assert.equal((await c.query('select count(*)::int n from '+t)).rows[0].n,0,t);
 const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json'),ar=base+'/catalog-authority-v2',artifacts=new Map(read(ar+'/artifact-map.portable.json').map(r=>[r.ref,fs.readFileSync(path.resolve(ar,r.path))])),snapshot=JSON.parse(String(artifacts.get('jungle:production-snapshot')));
 await c.query('begin');await c.query("insert into sets(id,code,name,game,identity_model,identity_domain_default) values($1,'base2','Jungle','pokemon','standard','pokemon_eng_standard')",[manifest.authority.set_id]);
 const game=(await c.query("select id from games where code='pokemon'")).rows[0].id;
 for(const [t,rows]of [['pokemon_species',snapshot.species],['card_prints',snapshot.cards.map(p=>({...p,game_id:game}))],['card_printings',snapshot.printings]]){
  const generated=(await c.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 and is_generated<>'NEVER'",[t])).rows.map(r=>r.column_name),fields=Object.keys(rows[0]).filter(k=>!generated.includes(k)).map(k=>'"'+k+'"').join(',');
  // Reproduce production's retained microseconds absent from the old Date capture.
  const preciseRows=rows.map(row=>({...row,...(typeof row.created_at==='string'&&/\.\d{3}Z$/.test(row.created_at)?{created_at:row.created_at.replace(/Z$/,'741Z')}:{})}));
  await c.query(`insert into ${t}(${fields}) select ${fields} from jsonb_populate_recordset(null::${t},$1::jsonb)`,[JSON.stringify(preciseRows)]);
 }
 const owner=randomUUID();await c.query("insert into auth.users(id,aud,role,email) values($1,'authenticated','authenticated',$2)",[owner,owner+'@catalog-fixture.invalid']);
 for(let i=0;i<5;i++)await c.query("select admin_vault_instance_create_v1(p_user_id=>$1::uuid,p_card_print_id=>$2::uuid,p_condition_label=>'NM')",[owner,manifest.parents[0].legacy_card_print_id]);
 const book={version:1,storeName:'Synthetic preservation fixture',receipts:[],customers:[{id:randomUUID(),name:'Fixture customer',email:'fixture@example.invalid',phone:'',wants:'',notes:'Must survive Jungle staging',updatedAt:new Date().toISOString()}]};
 await c.query('select vendor_receipt_book_validate_v1($1::jsonb,$2::uuid)',[JSON.stringify(book),owner]);await c.query('insert into vendor_receipt_books(owner_id,revision,book) values($1,1,$2::jsonb)',[owner,JSON.stringify(book)]);
 for(const table of ['vendor_sales_catalog_adds','vendor_sales_cart_receipts']){
  const request={fixture:'Jungle schema427 preservation only'};
  if(table==='vendor_sales_catalog_adds')await c.query('insert into vendor_sales_catalog_adds(owner_id,request_id,request,result) values($1,$2,$3::jsonb,$3::jsonb)',[owner,randomUUID(),JSON.stringify(request)]);
  else await c.query("insert into vendor_sales_cart_receipts(owner_id,request_id,request,receipt,dispositions) values($1,$2,$3::jsonb,$3::jsonb,'[]'::jsonb)",[owner,randomUUID(),JSON.stringify(request)]);
 }
 await c.query('commit');
 const copies=(await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows,books=(await c.query('select to_jsonb(t) value from vendor_receipt_books t order by owner_id')).rows;assert.equal(copies.length,5);assert.equal(books.length,1);save('copies.private.json',copies);save('books.private.json',books);
 for(const table of ['vendor_sales_catalog_adds','vendor_sales_cart_receipts'])save(table+'.private.json',(await c.query('select to_jsonb(t) value from '+table+' t order by owner_id,request_id')).rows);
 save('receipt.json',{at:new Date().toISOString(),status:'passed',migrations:427,legacyParents:83,legacyChildren:84,syntheticCopies:5,syntheticReceiptBooks:1,syntheticCatalogAddRequests:1,syntheticCartReceipts:1,productionWrites:0,resets:0,reseeds:0});console.log(JSON.stringify({status:'passed',out}));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{message:e.message,stack:e.stack});throw e;}finally{await c.end();}
