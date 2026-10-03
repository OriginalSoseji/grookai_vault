// Retained local413 rehearsal only; the entire experiment rolls back.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';import pg from 'pg';
import {assertJungleLocalTarget,readJungleExecutionSchema,readJungleExecutionState} from '../../backend/catalog/jungle_edition_catalog_execution_v1.mjs';
import {printingManifestHash as hash} from '../../backend/catalog/printing_completeness_gate_v1.mjs';
assert.equal(process.argv.length,2);
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001',input=base+'/production-reconciliation-v1';
const read=p=>JSON.parse(fs.readFileSync(p)),snapshot=read(input+'/production-snapshot.json'),review=read(input+'/source-review.json');
assert.equal(review.snapshot_sha256,createHash('sha256').update(fs.readFileSync(input+'/production-snapshot.json')).digest('hex'));
assert.equal(review.summary.parents,128);assert.equal(review.summary.compatible,126);assert.equal(review.summary.held,2);
assert.ok(review.rows.filter(r=>!r.compatible).every(r=>r.number==='64'&&r.name==='Poké Ball'));
const manifest=read('docs/catalog/master_printing_authority_v1/jungle_editions/manifest.json');assert.equal(review.manifest_fingerprint,manifest.fingerprint);
const plan=read(base+'/catalog-executor-v1/exercise-1790878371476/plan.private.json');
const out=input+'/binding-rehearsal-'+Date.now();fs.mkdirSync(out);const save=(n,x)=>fs.writeFileSync(out+'/'+n,JSON.stringify(x,null,2),{flag:'wx'});
const c=new pg.Client({host:'127.0.0.1',port:64740,user:'postgres',password:'postgres',database:'postgres'});await c.connect();let initial;
try{
 await assertJungleLocalTarget(c);assert.equal(hash(await readJungleExecutionSchema(c)),plan.schema_sha256);
 initial=await readJungleExecutionState(c,plan.rows,plan.schema);
 save('intent.json',{at:new Date().toISOString(),productionWrites:0,mode:'rollback_only',snapshotSha256:review.snapshot_sha256});
 await c.query('begin');await c.query("set local statement_timeout='45s'");
 assert.equal((await c.query('select count(*)::int n from tcgcsv_source_products')).rows[0].n,0);
 const columns='product_id,category_id,group_id,name,extended_data,raw_payload,payload_hash,source_active,catalog_metadata_status';
 await c.query(`insert into tcgcsv_source_products(${columns}) select ${columns} from jsonb_populate_recordset(null::tcgcsv_source_products,$1::jsonb)`,[JSON.stringify(snapshot.sourceProducts)]);
 const links=(await c.query('select * from jungle_edition_identity_links_v1 order by card_print_id')).rows;assert.equal(links.length,128);assert.ok(links.every(l=>l.state==='staged'));
 const bindings=links.map(l=>{const p=manifest.parents.find(p=>p.id===l.card_print_id);assert.ok(p);const products=snapshot.sourceProducts.filter(product=>product.extended_data?.filter(x=>x.name==='Number'&&[p.printed_coordinate+'/64',p.printed_coordinate.padStart(2,'0')+'/64'].includes(x.value)).length===1);assert.equal(products.length,1);return {id:randomUUID(),identity_link_id:l.id,product_id:products[0].product_id,source_subtype:(l.edition==='first_edition'?'1st Edition':'Unlimited')+(l.finish_key==='holo'?' Holofoil':''),source_product_payload_hash:products[0].payload_hash,manifest_sha256:manifest.fingerprint,review_ref:'local-source-review:'+review.snapshot_sha256,state:'staged',number:p.printed_coordinate};});
 const insert=async b=>c.query('insert into tcgplayer_jungle_edition_bindings_v1(id,identity_link_id,product_id,source_subtype,source_product_payload_hash,manifest_sha256,review_ref,state) values($1,$2,$3,$4,$5,$6,$7,$8)',[b.id,b.identity_link_id,b.product_id,b.source_subtype,b.source_product_payload_hash,b.manifest_sha256,b.review_ref,b.state]);
 await c.query('savepoint imported_products');const before=[];
 for(const b of bindings){await c.query('savepoint binding_attempt');try{await insert(b);before.push({number:b.number,status:'accepted'});await c.query('release savepoint binding_attempt');}catch(e){await c.query('rollback to savepoint binding_attempt');assert.equal(b.number,'64');assert.match(e.message,/invalid_jungle_edition_source_binding/);before.push({number:b.number,status:'rejected',reason:e.message});}}
 assert.equal(before.filter(r=>r.status==='accepted').length,126);await c.query('rollback to savepoint imported_products');
 const original=(await c.query("select pg_get_functiondef('public.tcgplayer_jungle_binding_valid_v1(uuid,boolean)'::regprocedure) body")).rows[0].body;
 const needle="case when card.number_plain = '57' and card.name = 'Nidoran ♀' then 'Nidoran F' else card.name end";
 assert.equal(original.split(needle).length,2);
 const patched=original.replace(needle,"case when card.number_plain = '57' and card.name = 'Nidoran ♀' then 'Nidoran F' when card.number_plain = '64' and card.name = 'Poké Ball' then 'Poke Ball' else card.name end");
 fs.writeFileSync(out+'/original-function.sql',original,{flag:'wx'});fs.writeFileSync(out+'/experimental-function.sql',patched,{flag:'wx'});
 await c.query(patched);for(const b of bindings)await insert(b);
 assert.equal((await c.query('select count(*)::int n from tcgplayer_jungle_edition_bindings_v1 where state=\'staged\' and tcgplayer_jungle_binding_valid_v1(id,false)')).rows[0].n,128);
 const trainer=bindings.filter(b=>b.number==='64');
 for(const productName of ['Pokeball','Poke Ball (Error)','Poké Ball [1st Edition]']){await c.query('savepoint wrong_name');await c.query('update tcgcsv_source_products set name=$1 where product_id=$2',[productName,trainer[0].product_id]);assert.equal((await c.query('select count(*)::int n from tcgplayer_jungle_edition_bindings_v1 where product_id=$1 and tcgplayer_jungle_binding_valid_v1(id,false)',[trainer[0].product_id])).rows[0].n,0);await c.query('rollback to savepoint wrong_name');}
 await c.query('rollback');assert.deepEqual(await readJungleExecutionState(c,plan.rows,plan.schema),initial);assert.equal(hash(await readJungleExecutionSchema(c)),plan.schema_sha256);
 save('receipt.json',{at:new Date().toISOString(),status:'passed',before:{accepted:126,held:2},experimentalExactAlias:{accepted:128,wrongNameRejections:3},rollback:true,protectedTables:initial.footprints.length,productionWrites:0,localDurableMutationRows:0,migrationChanged:false,limitation:'Experimental function rolled back; additive reviewed migration and full replay/upgrade remain required.'});
 console.log(JSON.stringify({out,status:'passed',before:126,afterExperimentalAlias:128,rollback:true}));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{at:new Date().toISOString(),message:e.message});throw e;}finally{await c.end();}
