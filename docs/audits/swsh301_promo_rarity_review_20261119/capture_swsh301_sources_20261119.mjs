// Capture the exact mapped provider image and public card article; no database writes.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root=new URL('./swsh301-source-captures-20261119/',import.meta.url);fs.mkdirSync(root,{recursive:true});
const snapshot=JSON.parse(fs.readFileSync(new URL('./swsh301-frozen-readback-v2-20261119.json',import.meta.url)));
const product=snapshot.products.find(p=>p.row.product_id===505996)?.row;
assert.equal(product?.image_url,'https://tcgplayer-cdn.tcgplayer.com/product/505996_200w.jpg');
for(const [name,url] of [['product.jpg',product.image_url],['article.html','https://bulbapedia.bulbagarden.net/wiki/Lugia_V_%28Silver_Tempest_138%29']]){
 const response=await fetch(url,{headers:{'user-agent':'GrookaiCatalogReview/1.0 (public card verification)'},signal:AbortSignal.timeout(15000)});
 assert.ok(response.ok);const bytes=Buffer.from(await response.arrayBuffer());
 const receipt={filename:name,url,final_url:response.url,status:response.status,captured_at:new Date().toISOString(),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 fs.writeFileSync(new URL(name,root),bytes,{flag:'wx'});fs.writeFileSync(new URL(`${name}-receipt.json`,root),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
}
