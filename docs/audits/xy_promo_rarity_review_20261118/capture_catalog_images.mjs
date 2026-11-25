// Read existing exact-catalog assets from the user's own storage; no writes remotely.
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const root=process.cwd(),dir=new URL('./',import.meta.url),data=JSON.parse(fs.readFileSync(new URL('xy-pair-postsync-readback.json',dir)));
const require=createRequire(`${root}/backend/package.json`),dotenv=require('dotenv'),{createClient}=require('@supabase/supabase-js');
const config=dotenv.parse(fs.readFileSync(`${root}/.env.local`)),ref='ycdxbpibncqcchqiihfz';
assert.equal(new URL(config.SUPABASE_URL).hostname,`${ref}.supabase.co`);assert.match(fs.readFileSync(`${root}/supabase/config.toml`,'utf8'),new RegExp(`project_id\\s*=\\s*"${ref}"`));
const key=config.SUPABASE_SECRET_KEY;assert.ok(key,'NO_SERVER_CREDENTIAL');
const client=createClient(config.SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const output=new URL('catalog_images/',dir);fs.mkdirSync(output,{recursive:true});
for(const parent of data.parents){
 assert.equal(parent.image_status,'exact');assert.ok(parent.image_path?.startsWith('warehouse-derived/self-hosted-images-v1/card_prints/xyp/'));
 const {data:blob,error}=await client.storage.from('user-card-images').download(parent.image_path);
 if(error||!blob)throw Error(`CATALOG_IMAGE_READ_FAILED:${parent.gv_id}:${error?.status??'unknown'}`);
 const bytes=Buffer.from(await blob.arrayBuffer()),ext=parent.image_path.endsWith('.webp')?'webp':'png',filename=`${parent.number}.${ext}`;
 fs.writeFileSync(new URL(filename,output),bytes,{flag:'wx'});
 const receipt={gv_id:parent.gv_id,number:parent.number,storage_path:parent.image_path,source_status:parent.image_status,
  captured_at:new Date().toISOString(),filename,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 fs.writeFileSync(new URL(`${parent.number}-receipt.json`,output),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({gv_id:parent.gv_id,bytes:bytes.length,sha256:receipt.sha256}));
}
