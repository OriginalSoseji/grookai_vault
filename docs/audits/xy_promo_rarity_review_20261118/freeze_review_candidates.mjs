// Freeze review candidates only. This script cannot access or write a database.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {evaluateXyPromoCandidate} from '../../../backend/pokemon/xy_promo_rarity_candidate_v1.mjs';
const dir=new URL('./',import.meta.url),bytes=fs.readFileSync(new URL('xy-pair-postsync-readback.json',dir));
const source=JSON.parse(bytes);assert.equal(source.project_ref,'ycdxbpibncqcchqiihfz');assert.equal(source.parents.length,2);
const rows=source.parents.map(parent=>{
 const mappings=source.mappings.filter(m=>m.card_print_id===parent.id),id=mappings.find(m=>m.source==='tcgplayer')?.external_id;
 const product=source.products.find(p=>String(p.row.product_id)===id),group=source.groups.find(g=>g.row.group_id===product?.row.group_id);
 const input={parent,set:source.sets.find(s=>s.id===parent.set_id),identities:source.identities.filter(i=>i.card_print_id===parent.id),
  traits:source.traits.filter(t=>t.card_print_id===parent.id),mappings,raw:source.raw,product:product?.row,group:group?.row,
  groupSets:source.groupSets.find(g=>g.group_id===group?.row.group_id),runs:source.runs};
 const decision=evaluateXyPromoCandidate(input);assert.equal(decision.status,'candidate_only',parent.gv_id);
 return {input,decision,source_product_raw_md5:product.raw_md5,source_group_raw_md5:group.raw_md5};
});
const report={version:'XY_PROMO_RARITY_REVIEW_CANDIDATES_V1',status:'REVIEW_REQUIRED_NO_WRITER',
 project_ref:source.project_ref,captured_at:source.captured_at,source_readback_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
 count:rows.length,reason:'Populated catalog and TCGdex traits say Common; two source records say Promo. Source precedence is not adjudicated.',rows};
fs.writeFileSync(new URL('xy-rarity-review-candidates.json',dir),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,count:report.count,source_readback_sha256:report.source_readback_sha256}));
