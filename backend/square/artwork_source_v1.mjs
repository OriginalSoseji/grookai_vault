import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {SquareApiError} from './client_v1.mjs';
import {squareArtworkPixels} from './artwork_pixels_v1.mjs';
const fail=code=>{throw new SquareApiError(code);};
const origin='https://grookaivault.com';
function bundledFont(){
 const relative='assets/fonts/Roboto/Roboto-Regular.ttf';
 const found=[relative,'../'+relative,'../../'+relative].map(value=>path.resolve(process.cwd(),value)).find(value=>existsSync(value));
 if(!found)fail('square_artwork_font_unavailable');return found;
}
const hosts=new Set(['assets.tcgdex.net','images.pokemontcg.io','cards.scryfall.io','images.ygoprodeck.com',
  'static.tcgcollector.com','limitlesstcg.nyc3.digitaloceanspaces.com','www.pokemon.com','images.pokemon.com',
  'assets.pokemon.com','en.onepiece-cardgame.com','www.onepiece-cardgame.com','ycdxbpibncqcchqiihfz.supabase.co']);
const scopedHosts={
 'cdn.malie.io':/^\/file\/malie-io\/art\/cards\/jpg\/[A-Za-z0-9_/-]+\.jpg$/,
 'product-images.tcgplayer.com':/^\/fit-in\/1000x1000\/[1-9]\d*\.jpg$/,
 'www.pokemon-card.com':/^\/assets\/images\/card_images\/large\/[A-Za-z0-9_/-]+\.jpe?g$/,
 'raw.githubusercontent.com':/^\/PokeAPI\/sprites\/master\/sprites\/pokemon\/[A-Za-z0-9_/-]+\.png$/,
};
export function squareArtworkSourceUrl(value){
 let url;try{url=new URL(value,origin);}catch{fail('square_artwork_source_blocked');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)fail('square_artwork_source_blocked');
 if(url.origin===origin){if(!/^\/api\/canon\/cards\/GV-[A-Za-z0-9-]+\/image$/.test(url.pathname)&&url.pathname!=='/api/canon/image')fail('square_artwork_source_blocked');}
 else if(!(hosts.has(url.hostname)||Object.hasOwn(scopedHosts,url.hostname)&&scopedHosts[url.hostname].test(url.pathname))||url.search||url.hostname.endsWith('.supabase.co')&&!url.pathname.startsWith('/storage/v1/object/public/external-card-images/'))fail('square_artwork_source_blocked');
 return url.toString();
}
async function bounded(response,max){
 const chunks=[];let length=0;const reader=response.body?.getReader();if(!reader)fail('square_artwork_unavailable');
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();fail('square_artwork_too_large');}chunks.push(value);}
 return Buffer.concat(chunks);
}
export async function renderSquareArtwork(bytes,kind){
 if(!['exact','representative','missing_variant_visual'].includes(kind))fail('square_invalid_artwork');
 const options={limitInputPixels:24000000,animated:false};
 try{
  const image=sharp(bytes,options),meta=await image.metadata();
  if(!['jpeg','png','webp','avif','gif'].includes(meta.format)||!meta.width||!meta.height)fail('square_artwork_invalid_image');
  let result=image.rotate().resize({width:720,height:1000,fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'});
  if(kind!=='exact'){
   const normalized=await result.png().toBuffer(),size=await sharp(normalized).metadata(),height=100;
   // The confidence label is part of the image, so POS thumbnails cannot silently claim exact variant artwork.
   const label=await sharp({text:{text:'<span foreground="#202020">Representative artwork\nExact variant image pending</span>',font:`Roboto ${Math.max(12,Math.floor(size.width/29))}`,fontfile:bundledFont(),width:size.width-20,align:'center',rgba:true}}).png().toBuffer();
   const labelSize=await sharp(label).metadata();
   result=sharp(normalized).extend({bottom:height,background:'#ffffff'}).composite([{input:label,
    left:Math.floor((size.width-labelSize.width)/2),top:size.height+Math.floor((height-labelSize.height)/2)}]);
  }
  // POS uses square center-cropped thumbnails. Pad the complete card and label,
  // rather than letting Square discard the portrait card's top/bottom edges.
  const framed=await result.png().toBuffer(),size=await sharp(framed).metadata(),side=Math.max(size.width,size.height);
  const horizontal=side-size.width,vertical=side-size.height;
  result=sharp(framed).extend({left:Math.floor(horizontal/2),right:Math.ceil(horizontal/2),
   top:Math.floor(vertical/2),bottom:Math.ceil(vertical/2),background:'#ffffff'});
  // Identity is based on immutable source bytes and policy, not platform-specific JPEG/font encoding.
  const sourceSha256=createHash('sha256').update(bytes).digest('hex');
  const sha256=createHash('sha256').update(JSON.stringify({version:'SQUARE_ARTWORK_RENDER_V2',sourceSha256,kind})).digest('hex');
  // Preserve the stable source identity in the retained JPEG metadata as well.
  const data=await result.withExif({IFD0:{ImageDescription:`grookai canonical artwork v1; identity:${sha256}`}}).jpeg({quality:88,mozjpeg:true}).toBuffer();
  if(data.length>524288)fail('square_artwork_too_large');
  const fileSha256=createHash('sha256').update(data).digest('hex');
  return {sha256,sourceSha256,fileSha256,pixelSha256:await squareArtworkPixels(data),fileBase64:data.toString('base64'),name:`grookai-artwork-v1-${sha256}.jpg`,kind};
 }catch(e){if(e instanceof SquareApiError)throw e;fail('square_artwork_invalid_image');}
}
export async function loadSquareArtwork(gvvi,{fetchImpl=globalThis.fetch}={}){
 if(!/^GVVI-[A-Z0-9]+-[0-9]{6}$/.test(gvvi))fail('square_invalid_artwork');
 let response;try{response=await fetchImpl(`${origin}/api/square/artwork/${gvvi}`,{redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store'});}catch{fail('square_artwork_unavailable');}
 if(response.status===404)return null;if(!response.ok)fail('square_artwork_unavailable');
 let descriptor;try{descriptor=JSON.parse((await bounded(response,8192)).toString('utf8'));}catch{fail('square_artwork_invalid_source');}
 if(descriptor.version!=='SQUARE_CANONICAL_ARTWORK_V1'||descriptor.gvvi!==gvvi||!['exact','representative','missing_variant_visual'].includes(descriptor.kind))fail('square_artwork_invalid_source');
 const url=squareArtworkSourceUrl(descriptor.url);
 try{response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store'});}catch{fail('square_artwork_unavailable');}
 if(!response.ok)fail('square_artwork_unavailable');
 if(!/^image\/(?:jpeg|png|webp|avif|gif)(?:;|$)/i.test(response.headers.get('content-type')??''))fail('square_artwork_invalid_image');
 const artwork=await renderSquareArtwork(await bounded(response,8*1024*1024),descriptor.kind);
 return {...artwork,source:{version:descriptor.version,cardPrintId:descriptor.cardPrintId,printingId:descriptor.printingId,kind:descriptor.kind,url}};
}
