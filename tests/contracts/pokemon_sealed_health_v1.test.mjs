import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePokemonSealedHealthV1 as evaluate,classifyPokemonSealedSourceChangesV1 as classify} from '../../backend/pricing/pokemon_sealed_health_v1.mjs';
const valid={published:1721,expected:1721,oldestAgeDays:1,sourceAgeDays:1,imageServingVerified:true};
test('healthy sealed release remains read-only',()=>{const r=evaluate(valid);assert.equal(r.status,'healthy');assert.equal(r.database_writes,0);assert.equal(r.automatic_price_publication,false);});
test('aging prices alert before endpoint expires',()=>assert.ok(evaluate({...valid,oldestAgeDays:4}).findings.includes('price_refresh_due_before_seven_day_expiry')));
test('missing prices, image mismatch, anonymous grants and source drift cannot look healthy',()=>{
  for(const delta of [{published:0},{published:1700},{oldestAgeDays:NaN},{sourceAgeDays:3},{newProducts:1},{changedMappings:1},{anonymousPrivilege:true},{pointersAligned:false},{imageServingVerified:false}])assert.equal(evaluate({...valid,...delta}).status,'attention_required');
});

test('contained drift remains operator attention, while any active drift fails closed',()=>{
  assert.deepEqual(evaluate({...valid,changedMappings:1,containedMappings:1}).findings,['source_identity_drift_quarantined']);
  assert.equal(evaluate({...valid,changedMappings:1,containedMappings:1}).status,'attention_required');
  assert.ok(evaluate({...valid,changedMappings:2,containedMappings:1}).findings.includes('source_identity_drift'));
  assert.ok(evaluate({...valid,changedMappings:1,containedMappings:2}).findings.includes('source_containment_evidence_invalid'));
});

test('source containment requires exact mapped identity and current publication membership',()=>{
  const mappings=[{variant_id:'a',source_category_id:3,source_product_id:1,source_payload_hash:'old'}];
  const source=[{category_id:3,product_id:1,payload_hash:'new',source_active:true}];
  let rows=classify({mappings,source,publishedVariantIds:['a']});
  assert.equal(rows[0].disposition,'active_source_identity_drift');
  rows=classify({mappings,source,publishedVariantIds:['b']});
  assert.equal(rows[0].disposition,'excluded_pending_identity_review');
  assert.equal(rows[0].expected_payload_hash,'old');assert.equal(rows[0].payload_hash,'new');
  assert.equal(classify({mappings,source:[],publishedVariantIds:['a']})[0].active_publication,true);
  assert.equal(classify({mappings,source:[{...source[0],payload_hash:'old',source_active:false}],publishedVariantIds:['a']}).length,1);
  assert.deepEqual(classify({mappings,source:[{...source[0],payload_hash:'old'}],publishedVariantIds:['a']}),[]);
  assert.throws(()=>classify({mappings,source,publishedVariantIds:[undefined]}),/Missing published/);
  assert.throws(()=>classify({mappings:[{...mappings[0],variant_id:null}],source,publishedVariantIds:[]}),/Missing mapped/);
  assert.throws(()=>classify({mappings,source:[...source,...source],publishedVariantIds:[]}),/Duplicate/);
});

test('category moves preserve evidence without accepting a product-ID-only identity',()=>{
  const mappings=[{variant_id:'a',source_category_id:3,source_product_id:1,source_payload_hash:'same'}];
  const moved={category_id:85,product_id:1,name:'Observed product',payload_hash:'same',source_active:true};
  const [row]=classify({mappings,source:[moved],publishedVariantIds:['a']});
  assert.equal(row.disposition,'active_source_identity_drift');
  assert.equal(row.category_id,3);assert.equal(row.observed_category_id,85);
  assert.equal(row.name,'Observed product');assert.equal(row.payload_hash,'same');
  assert.equal(row.source_active,true);assert.deepEqual(row.observed_sources,[moved]);
  const [ambiguous]=classify({mappings,source:[moved,{...moved,category_id:86}],publishedVariantIds:[]});
  assert.equal(ambiguous.observed_sources.length,2);assert.equal(ambiguous.observed_category_id,null);
  assert.equal(ambiguous.disposition,'excluded_pending_identity_review');
});
