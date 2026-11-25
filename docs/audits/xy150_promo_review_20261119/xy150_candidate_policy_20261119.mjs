// Read-only, record-specific candidate review. No canonical writer.
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { tcgplayerFieldV1, tcgplayerPayloadHashV1 } from '../../../backend/pokemon/tcgplayer_catalog_rarity_v1.mjs';

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expectedId = '28b773fa-ed21-47b8-a349-1d03f778c045';
export function evaluateXy150Candidate(snapshot, catalogBytes, productBytes, articleBytes, articleReceipt) {
  const { parents, sets, identities, traits, mappings, raw, products, groups, runs, groupSets } = snapshot;
  const p = parents?.[0], s = sets?.[0], identity = identities?.[0], trait = traits?.[0];
  if (snapshot.project_ref !== 'ycdxbpibncqcchqiihfz' || parents?.length !== 1 ||
      p.id !== expectedId || p.gv_id !== 'GV-PK-PR-XY-XY150' || p.name !== 'Yveltal EX' ||
      p.number !== 'XY150' || p.set_code !== 'xyp' || p.rarity !== 'None' || (p.variant_key ?? '') !== '' ||
      p.identity_domain !== 'pokemon_eng_standard' || p.image_status !== 'exact' ||
      p.image_path !== 'warehouse-derived/self-hosted-images-v1/card_prints/xyp/gv-pk-pr-xy-xy150/8bd7ffcafd7a9efb992ca95b.webp') return { status:'parent_mismatch' };
  if (sets.length !== 1 || s.id !== p.set_id || s.code !== 'xyp' || s.game !== 'pokemon' || s.printed_total !== 211 ||
      identities.length !== 1 || identity.card_print_id !== expectedId || !identity.is_active || identity.printed_number !== 'XY150' ||
      identity.identity_domain !== 'pokemon_eng_standard' || identity.set_code_identity !== 'xyp' ||
      identity.normalized_printed_name !== 'yveltal ex' || identity.identity_payload?.printed_total !== 211 ||
      identity.identity_key_hash !== 'a7bf23ef81b3544088acc29b233bef45079df7a1a55912823a45652f9097cfb3') return { status:'identity_mismatch' };
  if (traits.length !== 1 || trait.card_print_id !== expectedId || trait.id !== 39385 || trait.source !== 'tcgdex' ||
      trait.trait_type !== 'pokemon:stats' || trait.rarity !== 'None') return { status:'trait_mismatch' };
  for (const [source, external] of [['pokemonapi','xyp-XY150'],['tcgdex','xyp-XY150'],['tcgplayer','121953']]) {
    const hits = mappings.filter(m => m.active && m.card_print_id === expectedId && m.source === source);
    if (hits.length !== 1 || hits[0].external_id !== external || hits[0].owners !== 1 || hits[0].parent_mappings !== 1) return { status:'mapping_mismatch' };
  }
  const api = raw.filter(r => r.source === 'pokemonapi'), dex = raw.filter(r => r.source === 'tcgdex');
  if (api.length !== 1 || dex.length !== 1 || api[0].id !== '1736' || dex[0].id !== '14871' ||
      api[0].payload?._external_id !== 'xyp-XY150' || api[0].payload?.id !== 'xyp-XY150' ||
      api[0].payload?.name !== 'Yveltal-EX' || api[0].payload?.number !== 'XY150' || api[0].payload?.set?.id !== 'xyp' || api[0].payload?.rarity !== 'Promo' ||
      dex[0].payload?._external_id !== 'xyp-XY150' || dex[0].payload?.card?.name !== 'Yveltal EX' ||
      dex[0].payload?.card?.localId !== 'XY150' || dex[0].payload?.card?.rarity !== 'None') return { status:'raw_mismatch' };
  const product = products?.[0]?.row, group = groups?.[0]?.row, membership = groupSets?.[0];
  if (products.length !== 1 || groups.length !== 1 || groupSets.length !== 1 || product.product_id !== 121953 ||
      product.name !== 'Yveltal EX - XY150 (Shiny)' || product.group_id !== 1451 || product.category_id !== 3 ||
      !product.source_active || product.catalog_metadata_status !== 'current' || product.payload_hash !== tcgplayerPayloadHashV1(product.raw_payload) ||
      !isDeepStrictEqual(product.extended_data, product.raw_payload?.extendedData) || product.raw_payload?.productId !== 121953 ||
      product.raw_payload?.groupId !== 1451 || product.raw_payload?.name !== product.name || tcgplayerFieldV1(product,'Number') !== 'XY150' ||
      tcgplayerFieldV1(product,'Rarity') !== 'Promo' || group.group_id !== 1451 || group.category_id !== 3 || !group.source_active ||
      group.catalog_metadata_status !== 'current' || group.payload_hash !== tcgplayerPayloadHashV1(group.raw_payload) ||
      membership.group_id !== 1451 || membership.set_count !== 1 || !isDeepStrictEqual(membership.set_codes,['xyp'])) return { status:'product_mismatch' };
  if (![product,group].every(item => runs.some(run => run.id === item.last_seen_run_id && run.status === 'completed' && run.sync_mode === 'current_full_sync' && run.failed_count === 0))) return { status:'source_sync_incomplete' };
  if (sha256(catalogBytes) !== '8bd7ffcafd7a9efb992ca95bf0037275dec68c247bd54efdc5809cfde3bee94f' ||
      sha256(productBytes) !== '8796c6c8b64a721e06cf773665b0e46670258f450e60e64b63d0fa75c27bab93') return { status:'image_mismatch' };
  const articleHash = '2fcff07f10c6f5bdca1b879d107de924847bf8fec307724fff90d6b23e397416';
  if (articleReceipt?.url !== 'https://bulbapedia.bulbagarden.net/wiki/Yveltal-EX_%28XY_Promo_150%29' ||
      articleReceipt.status !== 200 || articleReceipt.sha256 !== articleHash || sha256(articleBytes) !== articleHash ||
      !['XY Black Star Promos','XY150','XY150a','Eske Yoshinob'].every(text => articleBytes.toString('utf8').includes(text))) return { status:'checklist_mismatch' };
  return { status:'review_candidate_only', before:'None', proposed:'Promo', card_print_id:expectedId,
    identity_key_hash:identity.identity_key_hash, tcgdex_trait_id:trait.id, pokemonapi_raw_id:'1736', tcgdex_raw_id:'14871', product_id:121953 };
}
