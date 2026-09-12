import {api,exec,out,verifyTarget,privateFile} from './collector_hosted_ops.mjs';
import {vercel,project} from './collector_vercel_staging.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const p=project(), db=await verifyTarget();
const list=await vercel(`/v6/deployments?projectId=${p.id}&limit=1`);const d=list.deployments[0];assert.equal(d.state,'READY');
const details=await vercel(`/v13/deployments/${d.uid}`);assert.equal(details.projectId,p.id);
const aliases=await vercel(`/v2/deployments/${d.uid}/aliases`);
assert.ok(aliases.aliases.some(a=>a.alias==='grookai-collector-staging.vercel.app'),'Separate stable alias not active');
await api(`/v1/projects/${db.id}/config/auth`,{method:'PATCH',body:{site_url:'https://grookai-collector-staging.vercel.app',uri_allow_list:'https://grookai-collector-staging.vercel.app/auth/callback',disable_signup:true}});
const bypass=randomBytes(16).toString('hex');
await vercel(`/v1/projects/${p.id}/protection-bypass`,{method:'PATCH',body:{generate:{secret:bypass,note:'Temporary collector staging browser verification'}}});
const keys=JSON.parse(readFileSync(`${out}/private/keys.json`));
privateFile('browser-config.json',{API_URL:`https://${db.id}.supabase.co`,ANON_KEY:keys.find(k=>k.name==='anon').api_key,SERVICE_ROLE_KEY:keys.find(k=>k.name==='service_role').api_key,BYPASS:bypass});
let code;
try{
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(SUPABASE|PSA|UPSTASH|VERCEL|RESEND|SENTRY|BRIDGE|POSTHOG)/.test(k)));
 env.COLLECTOR_HOSTED_TEST_CONFIG=`${out}/private/browser-config.json`;
 const commands=process.argv[2]==='extras'
   ? [['apps/web/scripts/collector-media-memory-smoke.mjs',process.argv[3]],['apps/web/scripts/collector-intake-smoke.mjs',process.argv[3]]]
   : [['apps/web/scripts/collector-authenticated-smoke.mjs']];
 for(const command of commands){code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['--use-system-ca',...command],{env,cwd:'C:/grookai_vault_collector_authenticated',windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('exit',resolve);});if(code!==0)break;}
}finally{
 await vercel(`/v1/projects/${p.id}/protection-bypass`,{method:'PATCH',body:{revoke:{secret:bypass,regenerate:false}}});
 const fresh=await vercel(`/v9/projects/${p.id}`);assert.ok(!fresh.protectionBypass?.[bypass]);
 writeFileSync(`${out}/${process.argv[2]==='extras'?'extras':'browser'}-deployment-receipt.json`,JSON.stringify({checkedAt:new Date().toISOString(),project:p.id,deployment:d.uid,url:'https://grookai-collector-staging.vercel.app',database:db.id,exitCode:code,temporaryBypassRevoked:true,protection:fresh.ssoProtection},null,2));
}
assert.equal(code,0,'Hosted browser verification failed; inspect retained report');
