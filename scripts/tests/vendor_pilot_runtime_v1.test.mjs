import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {validPilotCode} from '../../apps/web/src/lib/vendorPilot.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
function check(overrides={}){
 const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/(SUPABASE|STRIPE|GROOKAI|NEXT_PUBLIC|VERCEL|BRIDGE)/.test(k)));
 return spawnSync(process.execPath,['--input-type=module','-e',"process.chdir('./apps/web');await import('./apps/web/next.config.mjs')"],{cwd:root,encoding:'utf8',env:{...clean,NEXT_PUBLIC_VENDOR_PILOT:'true',NEXT_PUBLIC_COLLECTOR_STAGING:'true',GROOKAI_DISABLE_TELEMETRY:'1',SUPABASE_URL:'https://hrtbjchobencariqclab.supabase.co',SUPABASE_PUBLISHABLE_KEY:'synthetic-publishable',...overrides}});
}
test('only exact opaque invitation shape is admitted to the cookie boundary',()=>{
 assert.equal(validPilotCode('a'.repeat(64)),true);
 for(const bad of [undefined,null,{},'','A'.repeat(64),'a'.repeat(63),'a'.repeat(65),'a'.repeat(64)+'\n','https://attacker.invalid'])assert.equal(validPilotCode(bad),false);
});
test('isolated pilot configuration loads with no payment credentials',()=>{const r=check();assert.equal(r.status,0,r.stderr);});
for(const [name,env] of [
 ['production database',{SUPABASE_URL:'https://ycdxbpibncqcchqiihfz.supabase.co'}],
 ['collector staging database',{SUPABASE_URL:'https://hcdpcbpnnvtbaezefjkd.supabase.co'}],
 ['disabled staging boundary',{NEXT_PUBLIC_COLLECTOR_STAGING:'false'}],
 ['telemetry enabled',{GROOKAI_DISABLE_TELEMETRY:'0'}],
 ['Stripe credential',{STRIPE_SECRET_KEY:'synthetic-forbidden'}],
 ['payment activation flag',{GROOKAI_VENDOR_CHECKOUT_ENABLED:'true'}],
 ['local fixture mode',{NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB:'true'}],
 ['old hosted staging mode',{NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING:'true'}],
 ['local storefront test mode',{NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true'}],
])test('pilot refuses '+name,()=>{assert.notEqual(check(env).status,0);});
