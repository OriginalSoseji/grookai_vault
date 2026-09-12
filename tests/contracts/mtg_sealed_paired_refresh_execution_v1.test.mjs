import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const runner=read('scripts/audits/mtg_sealed_paired_refresh_v1.mjs');
const workflow=read('.github/workflows/mtg-sealed-paired-refresh-v1.yml');
test('production execution binds frozen committed producer, fingerprint and separate activation',()=>{
  for(const text of ["args['expected-head'],head",'Producer must be committed',"if(args.mode!=='plan')",'assert.equal(fingerprint,args.fingerprint)',"process.env.MTG_SEALED_REFRESH_ACTIVE,'true'",'Unknown option'])assert.ok(runner.includes(text),text);
  assert.match(workflow,/schedule:/);assert.match(workflow,/MTG_SEALED_REFRESH_ACTIVE \|\| 'false'/);
  assert.match(workflow,/default: true/);assert.match(workflow,/idempotency\.json/);
  assert.doesNotMatch(workflow,/continue-on-error: true/);
});
test('paired reader uses verified four-argument contract and fresh partition-bounded source query',()=>{
  assert.ok(runner.includes("get_active_sealed_product_pricing_v3('mtg',null,100,$1)"));
  assert.ok(runner.includes('observed_on>=current_date-7'));
  assert.ok(runner.includes('assert.equal(baseline.length,2149'));
  assert.ok(runner.includes("await execute(plan,true,'idempotency')"));
});

// Exercise actual runner orchestration with transactional fault injection, not a live DB.
function harness(failAt){
  const price={id:'new-price'},image={id:'new-image',manifest_fingerprint:'manifest'};
  const before=[{game_key:'mtg',release_id:'old-price',image_release_id:'old-image'}];
  const target=[{game_key:'mtg',release_id:price.id,image_release_id:image.id}];
  const plan={fingerprint:'fingerprint',expected_pointers:before,prices:{qualifications:[],releases:[price],members:[]},images:{evidence:[],assertions:[],releases:[image],release_members:[]},exclusions:[]};
  let current=structuredClone(before),committed=false,rolledBack=false,connections=0;
  const receipts={},events=[];
  const client={end:async()=>{},query:async(sql)=>{
    events.push(sql);
    if(sql==='rollback'){if(!committed)current=structuredClone(before);rolledBack=true;}
    if(sql==='commit')committed=true;
    if(sql.includes('select id from'))return{rowCount:0};
    if(sql.includes('select id::text'))return{rows:[]};
    if(sql.includes('release_manifest_fingerprint'))return{rows:[{fp:'manifest'}]};
    if(sql.includes('sealed_product_set_active_release_v1'))current[0].release_id='new-price';
    if(sql.includes('sealed_product_set_active_image_release_v1')){
      if(failAt==='image-pointer')throw Error('injected image-pointer failure');
      current[0].image_release_id='new-image';
    }
    return{rows:[]};
  }};
  const deps={assert,connect:async()=>{connections++;return client;},pointers:async(c,other)=>other?[{game_key:'pokemon',release_id:'preserve'}]:structuredClone(current),
    load:async()=>failAt==='source-drift'?{fingerprint:'drift'}:plan,assertPriceRows:async()=>{},
    insertSealedWorldPlanV1:async()=>{events.push('insert-prices');},insertDataset:async()=>{},
    verify:async()=>{if(failAt==='readback'&&connections===1)throw Error('injected readback failure');assert.deepEqual(current,target);},
    writeAttribution:async()=>failAt==='unexpected-write'?[{table_name:'vault_items',deleted:0}]:[],
    priceTables:{qualifications:'sealed_product_pricing_lane_qualifications',releases:'sealed_product_releases',members:'sealed_product_release_members'},
    imageTables:{evidence:'sealed_product_image_evidence',assertions:'sealed_product_variant_image_assertions',releases:'sealed_product_image_releases',release_members:'sealed_product_image_release_members'},
    MTG_SEALED_REVIEWER_ID:'actor',fs:{writeFile:async(file,body)=>{receipts[file]=JSON.parse(body);}},path:{join:(...s)=>s.join('/')},args:{out:'audit'},head:'producer',console:{log:()=>{}}};
  const source=runner.slice(runner.indexOf('async function execute('),runner.indexOf('await fs.mkdir(args.out'));
  const execute=new Function('deps',`const {${Object.keys(deps).join(',')}}=deps;${source};return execute;`)(deps);
  return{run:()=>execute(plan,true),state:()=>({current,committed,rolledBack,events,receipts,connections}),before,target};
}
for(const fault of ['source-drift','image-pointer','readback','unexpected-write'])test(`fault ${fault} leaves both old pointers and no commit`,async()=>{
  const h=harness(fault);await assert.rejects(h.run());const s=h.state();
  assert.equal(s.committed,false);assert.equal(s.rolledBack,true);assert.deepEqual(s.current,h.before);
  assert.equal(s.receipts['audit/failure.json'].committed,false);
});
test('successful pair is read back on an independent connection after commit',async()=>{
  const h=harness();await h.run();const s=h.state();assert.equal(s.committed,true);assert.equal(s.connections,2);
  assert.deepEqual(s.current,h.target);assert.equal(s.receipts['audit/apply.json'].independent_readback,true);
  assert.ok(s.events.indexOf('commit')>s.events.findIndex(e=>e.includes('set_active_image_release')));
});
