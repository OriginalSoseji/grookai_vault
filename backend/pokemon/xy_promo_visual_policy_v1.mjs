import crypto from 'node:crypto';
import {reviewXyPromoFamily} from './xy_promo_family_review_v1.mjs';
const PINS=Object.freeze({
 XY177:{productId:123438,artist:'You Iribi',product:'ed7f8b9c8425152d0c1cf37975ae3e115c2ec1254318fdb1e24fbda57b622a65',catalog:'bd65a7a0112aa9a1c5bbcd5151279f3b0fb44817bc72f4a6a4156c29666a030a'},
 XY198:{productId:129898,artist:'5ban Graphics',product:'2894766346541e6a359d4a931d31ff1c9f3e539c00366468a77af1a7b7a9634b',catalog:'ec280350908612ede733be5f211acd7357c339be35d97a24f453911eb61643c5'},
});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function evaluateReviewedXyPromo(input,article,images,visualReview){
 const family=reviewXyPromoFamily(input,article?.receipt,article?.bytes);
 if(family.status!=='family_corroborated_review_only')return family;
 const p=input.parent,pin=PINS[p.number],review=(visualReview?.rows??[]).filter(r=>r.gv_id===p.gv_id);
 if(!pin||review.length!==1||!Buffer.isBuffer(images?.productBytes)||!Buffer.isBuffer(images?.catalogBytes)||
  images.productReceipt?.status!==200||images.productReceipt.product_id!==pin.productId||images.productReceipt.url!==input.product.image_url||
  images.productReceipt.sha256!==pin.product||images.productReceipt.bytes!==images.productBytes.length||sha(images.productBytes)!==pin.product||
  images.catalogReceipt?.gv_id!==p.gv_id||images.catalogReceipt.storage_path!==p.image_path||images.catalogReceipt.source_status!=='exact'||
  p.image_status!=='exact'||p.artist!==pin.artist||images.catalogReceipt.sha256!==pin.catalog||
  images.catalogReceipt.bytes!==images.catalogBytes.length||sha(images.catalogBytes)!==pin.catalog||
  review[0].number!==p.number||review[0].artist!==pin.artist||review[0].product_id!==pin.productId||
  review[0].product_image_sha256!==pin.product||review[0].catalog_image_sha256!==pin.catalog||
  !review[0].visual_review?.includes('black PROMO-star symbol'))return {status:'visual_review_mismatch'};
 return {status:'record_scoped_review_candidate',before:'Common',proposed:'Promo',identity_key_hash:family.number===p.number?input.identities[0].identity_key_hash:null,
  product_image_sha256:pin.product,catalog_image_sha256:pin.catalog,checklist_sha256:family.source_sha256,
  tcgdex_trait_preserved:true,semantic_scope:'Promo catalog classification for this exact image-backed identity; no physical copy or finish claim'};
}
