// Record a bounded visual review against immutable captured image bytes.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('xy-pair-postsync-readback.json',dir)));
const pins={XY177:{id:123438,gv_id:'GV-PK-PR-XY-XY177',artist:'You Iribi',product:'ed7f8b9c8425152d0c1cf37975ae3e115c2ec1254318fdb1e24fbda57b622a65',catalog:'bd65a7a0112aa9a1c5bbcd5151279f3b0fb44817bc72f4a6a4156c29666a030a'},
 XY198:{id:129898,gv_id:'GV-PK-PR-XY-XY198',artist:'5ban Graphics',product:'2894766346541e6a359d4a931d31ff1c9f3e539c00366468a77af1a7b7a9634b',catalog:'ec280350908612ede733be5f211acd7357c339be35d97a24f453911eb61643c5'}};
const rows=[];
for(const [number,pin] of Object.entries(pins)){
 const p=data.parents.find(x=>x.gv_id===pin.gv_id),product=data.products.find(x=>x.row.product_id===pin.id)?.row;
 const productReceipt=JSON.parse(fs.readFileSync(new URL(`product_images/${number}-receipt.json`,dir)));
 const catalogReceipt=JSON.parse(fs.readFileSync(new URL(`catalog_images/${number}-receipt.json`,dir)));
 const productBytes=fs.readFileSync(new URL(`product_images/${number}.jpg`,dir));
 const catalogBytes=fs.readFileSync(new URL(`catalog_images/${number}.webp`,dir));
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 assert.equal(p.number,number);assert.equal(p.artist,pin.artist);assert.equal(p.image_status,'exact');
 assert.equal(productReceipt.url,product.image_url);assert.equal(productReceipt.status,200);
 assert.equal(catalogReceipt.gv_id,p.gv_id);assert.equal(catalogReceipt.storage_path,p.image_path);
 assert.equal(sha(productBytes),pin.product);assert.equal(productReceipt.sha256,pin.product);
 assert.equal(sha(catalogBytes),pin.catalog);assert.equal(catalogReceipt.sha256,pin.catalog);
 rows.push({gv_id:p.gv_id,number,name:p.name,artist:p.artist,product_id:pin.id,product_image_url:productReceipt.url,
  product_image_sha256:pin.product,catalog_image_path:p.image_path,catalog_image_sha256:pin.catalog,
  visual_review:'The catalog image and mapped product image show matching artwork and name; the catalog image visibly shows the exact printed number and black PROMO-star symbol.',
  limits:'This reviews images of the card design, not an inspected physical copy, and does not authorize a global rarity synonym or any finish inference.'});
}
const out={version:'XY_PROMO_EXACT_IMAGE_REVIEW_V1',recorded_at:new Date().toISOString(),scope:'two exact records only',rows};
fs.writeFileSync(new URL('xy-exact-image-review.json',dir),JSON.stringify(out,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'image_review_recorded',count:rows.length,gv_ids:rows.map(x=>x.gv_id)}));
