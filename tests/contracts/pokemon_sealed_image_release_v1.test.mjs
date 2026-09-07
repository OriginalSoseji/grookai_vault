import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPokemonSealedWorldPlanV1} from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import {buildPokemonSealedImageReleaseV1} from '../../backend/pricing/pokemon_sealed_image_release_v1.mjs';
import {pokemonSealedObjectV1} from '../../backend/pricing/pokemon_sealed_storage_v1.mjs';
function fixture(){
  const sourceRows=[123,124].map(id=>({name:`Booster Box ${id}`,category_id:3,product_id:id,group_id:7,
    group_name:'Example',category_display_name:'Pokemon',source_active:true,catalog_metadata_status:'current',
    payload_hash:'a'.repeat(64),extended_data:[]}));
  const catalog=buildPokemonSealedWorldPlanV1({sourceRows,latestPriceRows:sourceRows.map(r=>({product_id:r.product_id,
    subtype_name_normalized:'normal',currency:'USD',market_price:50,source_price_row_identity:`tcgplayer:${r.product_id}:normal`,
    observed_on:'2026-09-07',payload_hash:'b'.repeat(64)})),
    latestSync:{id:'sync',status:'completed',observed_on:'2026-09-07'},producerCommit:'c'.repeat(40)});
  const acquisition=catalog.payload.members.map(m=>{
    const mapping=catalog.payload.mappings.find(r=>r.id===m.source_mapping_id);
    return{member_id:m.id,variant_id:m.variant_id,source_mapping_id:mapping.id,source_product_id:mapping.source_product_id,
      source_payload_hash:mapping.source_payload_hash,source_image_url:`https://tcgplayer-cdn.tcgplayer.com/product/${mapping.source_product_id}_in_1000x1000.jpg`,
      status:'verified',local_filename:`${'d'.repeat(64)}.jpg`,image:{valid_image:true,sha256:'d'.repeat(64),content_type:'image/jpeg',width:500,height:500,size_bytes:5000}};
  });
  const storage=[{event:'verified',path:pokemonSealedObjectV1(acquisition[0]).path,sha256:'d'.repeat(64),bytes:5000,verified_at:'2026-09-07T01:00:00.000Z'}];
  return{catalog,acquisition,acquisitionSummary:{finished_at:'2026-09-07T00:00:00.000Z'},storage,
    storageSummary:{passed:true,expected:1,fingerprint:'e'.repeat(64)},producerCommit:'f'.repeat(40)};
}
test('two exact variants can share bytes without losing identity',()=>{
  const input=fixture(),plan=buildPokemonSealedImageReleaseV1(input);
  assert.deepEqual(plan.counts,{evidence:2,objects:1,assertions:2,releases:1,release_members:2});
  assert.deepEqual(plan,buildPokemonSealedImageReleaseV1(input));
  for(const rows of Object.values(plan.payload))assert.ok(rows.every(r=>r.game_key==='pokemon'));
});
test('wrong mapping, source hash, variant, or image host fails',()=>{
  for(const [field,value] of [['source_mapping_id','bad'],['source_payload_hash','bad'],['variant_id','bad'],['source_image_url','https://example.org/image.jpg']]){
    const input=fixture();input.acquisition[0][field]=value;assert.throws(()=>buildPokemonSealedImageReleaseV1(input));
  }
});
test('missing or duplicate storage proof fails',()=>{
  for(const patch of [{storage:[]},{storageSummary:{passed:false,expected:1}},{storage:[...fixture().storage,...fixture().storage]}])
    assert.throws(()=>buildPokemonSealedImageReleaseV1({...fixture(),...patch}));
});
test('excluded image preserves evidence without a guessed object assertion',()=>{
  const input=fixture();input.acquisition[0].status='excluded';
  const plan=buildPokemonSealedImageReleaseV1(input);
  assert.equal(plan.payload.evidence.length,2);assert.equal(plan.payload.assertions.length,1);
  const excluded=plan.payload.evidence.find(r=>r.classification==='missing_source_image');
  assert.equal(excluded.content_sha256,null);assert.equal(excluded.image_width,null);
});
