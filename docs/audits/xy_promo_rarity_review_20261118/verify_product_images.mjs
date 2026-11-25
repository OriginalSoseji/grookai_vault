// Verify the captured image bytes are tied to the exact stored product URL.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const dir=new URL('./',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('xy-pair-postsync-readback.json',dir)));
for(const [number,id] of [['XY177',123438],['XY198',129898]]){
 const receipt=JSON.parse(fs.readFileSync(new URL(`product_images/${number}-receipt.json`,dir)));
 const bytes=fs.readFileSync(new URL(`product_images/${number}.jpg`,dir));
 const product=data.products.find(p=>p.row.product_id===id)?.row;
 assert.equal(receipt.status,200);assert.equal(receipt.product_id,id);assert.equal(receipt.url,product?.image_url);
 assert.equal(bytes.length,receipt.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),receipt.sha256);
 console.log(JSON.stringify({number,product_id:id,sha256:receipt.sha256,status:'source_image_bytes_verified',physical_card_or_rarity_adjudicated:false}));
}
