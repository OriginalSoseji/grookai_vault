// Full, unchanged repository shipcheck against the dedicated local release DB.
// No production credentials, reset, deployment or arbitrary command/target options.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {root} from '../schema/storefront_release_schema_v1.mjs';
import {guard} from '../schema/storefront_release_guard_v1.mjs';

assert.equal(process.argv.length,2,'No arguments accepted');
guard({full:true});
const cfg=JSON.parse(fs.readFileSync(path.join(root,'.local/integration/shipcheck-supabase-private.json'),'utf8').replace(/^\uFEFF/,''));
assert.equal(cfg.API_URL,'http://127.0.0.1:16821');
assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'16822');
assert.ok(cfg.PUBLISHABLE_KEY&&cfg.SECRET_KEY,'Local API credentials required');
// Keep the existing storefront staging URL fixed, forwarding only to this project.
const sockets=new Set();
const relay=net.createServer(socket=>{
  const upstream=net.connect(16821,'127.0.0.1');sockets.add(socket);sockets.add(upstream);
  socket.pipe(upstream).pipe(socket);
  socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());
  socket.on('close',()=>{sockets.delete(socket);upstream.destroy();});
  upstream.on('close',()=>{sockets.delete(upstream);socket.destroy();});
});
await new Promise((resolve,reject)=>{relay.once('error',reject);relay.listen(15439,'127.0.0.1',resolve);});
const env={};
for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PROGRAMFILES','ProgramFiles','JAVA_HOME','ANDROID_HOME','ANDROID_SDK_ROOT','PUB_CACHE','FLUTTER_ROOT']){
  if(process.env[key])env[key]=process.env[key];
}
const emptyEnv=path.join(root,'.local/integration/shipcheck-empty.env');
fs.writeFileSync(emptyEnv,'');
Object.assign(env,{
  DOTENV_CONFIG_PATH:emptyEnv,
  SUPABASE_DB_URL:'postgresql://postgres:postgres@127.0.0.1:16822/postgres?options=-c%20default_transaction_read_only%3Don',
  SUPABASE_URL:'http://127.0.0.1:15439',
  SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY:cfg.SECRET_KEY,
  NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',
  GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',
  GVVI_REFERRAL_COOKIE_SECRET:'isolated-storefront-referral-test-key-at-least-32',
  SITE_URL:'http://127.0.0.1:15440',NEXT_PUBLIC_SITE_URL:'http://127.0.0.1:15440',
  NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`,
});
const child=spawn('npm.cmd',['run','shipcheck'],{cwd:root,env,shell:true,windowsHide:true,stdio:'inherit'});
function closeRelay(){for(const socket of sockets)socket.destroy();relay.close();}
child.on('error',error=>{console.error(error.message);process.exitCode=1;closeRelay();});
child.on('exit',code=>{process.exitCode=code??1;closeRelay();});
