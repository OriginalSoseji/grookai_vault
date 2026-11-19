// Retain unmodified product-image bytes for visual source review.
import fs from 'node:fs';import crypto from 'node:crypto';
const dir=new URL('./product_images/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
for(const [number,id] of [['XY177',123438],['XY198',129898]]){
 const url=`https://tcgplayer-cdn.tcgplayer.com/product/${id}_200w.jpg`;let result;
 try{const response=await fetch(url,{headers:{'user-agent':'GrookaiCatalogReview/1.0'},signal:AbortSignal.timeout(15000)});
  const bytes=Buffer.from(await response.arrayBuffer());
  if(response.ok)fs.writeFileSync(new URL(`${number}.jpg`,dir),bytes,{flag:'wx'});
  result={number,product_id:id,url,status:response.status,final_url:response.url,captured_at:new Date().toISOString(),
   ...(response.ok?{filename:`${number}.jpg`,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}:{body_retained:false})};
 }catch(e){result={number,product_id:id,url,captured_at:new Date().toISOString(),error:String(e.message??e),body_retained:false};}
 fs.writeFileSync(new URL(`${number}-receipt.json`,dir),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
}
