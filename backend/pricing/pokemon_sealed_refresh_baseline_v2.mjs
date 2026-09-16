import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pokemonSealedHashV1 as hash} from './pokemon_sealed_world_v1.mjs';

export const POKEMON_SEALED_ANNIVERSARY_BASELINE_HASH='b9ed0241889fb882cc9b191c29d43b018eaa934577e4d4c5ed80bd68bec6aea5';
export function loadPokemonSealedBaselineV2(key='original') {
  if(key==='original')return null;
  assert.equal(key,'anniversary-20260916','Unknown sealed baseline');
  const policy=JSON.parse(readFileSync(new URL('../../docs/contracts/pokemon_sealed_anniversary_baseline_v1.json',import.meta.url)));
  validatePokemonSealedBaselineV2(policy);
  return policy;
}
export function validatePokemonSealedBaselineV2(policy,baseline,releases) {
  assert.equal(hash(policy),POKEMON_SEALED_ANNIVERSARY_BASELINE_HASH,'Unreviewed baseline policy drift');
  if(releases){
    assert.equal(releases.length,policy.image_releases.length);
    for(const expected of policy.image_releases){
      const actual=releases.find(r=>r.id===expected.id);assert.ok(actual,'Missing frozen image baseline');
      assert.equal(actual.game_key,'pokemon');assert.equal(actual.release_state,'frozen');
      assert.equal(actual.manifest_fingerprint,expected.manifest);assert.equal(Number(actual.expected_member_count),expected.count);
    }
  }
  if(baseline){
    assert.equal(baseline.length,policy.expected_variants,'Expanded baseline population changed');
    assert.equal(new Set(baseline.map(r=>r.variant_id)).size,baseline.length,'Duplicate baseline variant');
    assert.equal(new Set(baseline.map(r=>String(r.source_product_id))).size,baseline.length,'Duplicate baseline source');
    for(const release of policy.image_releases)
      assert.equal(baseline.filter(r=>r.baseline_image_release_id===release.id).length,release.count,'Baseline partition changed');
    for(const receipt of policy.source_reconciliations){
      const row=baseline.find(r=>r.variant_id===receipt.variant_id);assert.ok(row,'Reviewed source missing from baseline');
      assert.equal(row.source_mapping_id,receipt.source_mapping_id);
      assert.equal(String(row.source_product_id),String(receipt.source_product_id));
      assert.equal(row.source_payload_hash,receipt.mapped_payload_hash);
    }
  }
}

export function reviewedPokemonSourceChangeV2(policy,row,current) {
  if(!policy||!current?.source_active)return null;
  const receipt=policy.source_reconciliations.find(r=>r.variant_id===row.variant_id);
  if(!receipt)return null;
  const {fingerprint,...body}=receipt;assert.equal(hash(body),fingerprint,'Source receipt hash mismatch');
  if(receipt.source_mapping_id!==row.source_mapping_id||receipt.mapped_payload_hash!==row.source_payload_hash||
    receipt.current_payload_hash!==current.payload_hash)return null;
  for(const [receiptKey,rowKey,sourceKey]of [['source_product_id','source_product_id','product_id'],
    ['source_category_id','source_category_id','category_id'],['source_group_id','source_group_id','group_id']]){
    if(Number(receipt[receiptKey])!==Number(row[rowKey])||Number(receipt[receiptKey])!==Number(current[sourceKey]))return null;
  }
  return receipt;
}
