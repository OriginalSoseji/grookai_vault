// Freeze a two-record review packet; this script does not write canon or mappings.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {evaluateXySuffixCandidate} from './xy_suffix_rarity_candidate_20261119.mjs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const snapshotBytes=read('./xy-suffix-rarity-frozen-20261119.json'),snapshot=JSON.parse(snapshotBytes),records=[];
for(const number of ['XY200a','XY67a']){
 const catalog=read(`./xy-remaining-image-review-20261119/${number}.webp`),product=read(`./xy-remaining-image-review-20261119/${number}-product.jpg`),
  article=read(`./xy-remaining-checklists-20261119/${number}.html`),articleReceipt=JSON.parse(read(`./xy-remaining-checklists-20261119/${number}-receipt.json`));
 const result=evaluateXySuffixCandidate(snapshot,number,{catalog,product,article,articleReceipt});
 assert.equal(result.status,'review_candidate_only');
 records.push({...result,catalog_image_sha256:hash(catalog),product_image_sha256:hash(product),article_sha256:hash(article),
  visual_observation:'Exact catalog design shows printed suffix, PROMO star and circled A; unmapped provider product image visually matches. Images are not physical-copy inspection.'});
}
const body={version:'XY_SUFFIX_RARITY_REVIEW_PACKET_V1',status:'REVIEW_ONLY_NO_WRITER',target:'ycdxbpibncqcchqiihfz',
 snapshot_sha256:hash(snapshotBytes),records,scope:'Two exact parent rarity leads; no mapping, identity, finish, ownership, or price change authorized by this packet.'};
const packet={...body,fingerprint_sha256:hash(JSON.stringify(body))};
fs.writeFileSync(new URL('./xy-suffix-rarity-review-packet-20261119.json',import.meta.url),JSON.stringify(packet,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:packet.status,records:packet.records.length,fingerprint_sha256:packet.fingerprint_sha256}));
