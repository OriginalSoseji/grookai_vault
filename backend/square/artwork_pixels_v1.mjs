import sharp from 'sharp';import {createHash} from 'node:crypto';
export async function squareArtworkPixels(bytes){
 const {data,info}=await sharp(bytes,{limitInputPixels:24000000,animated:false}).rotate().toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 return createHash('sha256').update(JSON.stringify({width:info.width,height:info.height,channels:info.channels})).update(data).digest('hex');
}
