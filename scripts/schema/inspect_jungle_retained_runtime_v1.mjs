// Read-only process/route attestation when Docker Desktop's control API stalls.
// Fixed existing fixture only; does not restart, reconfigure, or create services.
import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
export function inspectJungleRetainedRuntimeV1(){
 const project='jungle-edition-full-416-v18-20261001',root='/mnt/docker-desktop-disk/data/docker/containers/';
 const wsl=(...args)=>execFileSync('wsl',['-d','docker-desktop','--',...args],{encoding:'utf8',timeout:15000,windowsHide:true,maxBuffer:2*1024*1024});
 const paths=wsl('sh','-c','grep -l '+project+' '+root+'*/config.v2.json').trim().split(/\r?\n/);
 const parent=wsl('cat','/run/linuxkit-parent.pid').trim();assert.match(parent,/^[1-9][0-9]*$/);
 const runtime=(pid,file)=>{assert.ok(Number.isInteger(pid)&&pid>1);return wsl('nsenter','-t',parent,'-m','-p','--','cat','/proc/'+pid+'/'+file);};
 const records=[];
 for(const filename of paths){assert.ok(filename.startsWith(root));assert.match(filename.slice(root.length),/^[a-f0-9]{64}\/config\.v2\.json$/);
  const config=JSON.parse(wsl('cat',filename));if(!['/supabase_db_'+project,'/'+project+'-relay'].includes(config.Name))continue;
  const id=filename.slice(root.length).split('/')[0],host=JSON.parse(wsl('cat',filename.replace('config.v2.json','hostconfig.json')));
  assert.equal(config.State.Running,true);assert.equal(config.State.Paused,false);assert.equal(config.State.Restarting,false);
  assert.equal(runtime(config.State.Pid,'cgroup').trim(),'0::/docker/'+id);
  const route=runtime(config.State.Pid,'net/route'),ipv6=runtime(config.State.Pid,'net/ipv6_route');
  if(config.Name==='/supabase_db_'+project){
   assert.equal(config.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(config.NetworkSettings.Networks),[project]);
   const net=config.NetworkSettings.Networks[project];assert.equal(net.IPAddress,'10.248.6.3');assert.equal(net.IPPrefixLen,24);assert.equal(net.Gateway,'');assert.equal(net.GlobalIPv6Address,'');
   const routes=route.trim().split('\n').slice(1).map(r=>r.trim().split(/\s+/));assert.equal(routes.length,1);assert.equal(routes[0][1],'0006F80A');assert.equal(routes[0][2],'00000000');assert.equal(routes[0][7],'00FFFFFF');
   assert.ok(ipv6.trim().split('\n').filter(Boolean).every(r=>{const f=r.trim().split(/\s+/);return !(f[0]==='0'.repeat(32)&&f[1]==='00'&&f.at(-1)!=='lo');}));
  }else{
   assert.equal(config.Config.Image,'node:22-bookworm-slim');assert.deepEqual(Object.keys(config.NetworkSettings.Networks).sort(),['bridge',project].sort());
   for(const bindings of Object.values(host.PortBindings))for(const binding of bindings){assert.equal(binding.HostIp,'127.0.0.1');assert.ok(['65040','65041','65044'].includes(binding.HostPort));}
   const actual=runtime(config.State.Pid,'root/relay.mjs'),expected=fs.readFileSync('C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/full-416-v18/relay.mjs','utf8');assert.equal(actual,expected);
  }
  records.push({name:config.Name,id,pid:config.State.Pid,image:config.Config.Image,networks:config.NetworkSettings.Networks,portBindings:host.PortBindings,route,ipv6,configSha256:createHash('sha256').update(JSON.stringify(config)).digest('hex')});
 }
 assert.equal(records.length,2);return {at:new Date().toISOString(),status:'passed',method:'live_process_cgroup_route_and_persisted_configuration',project,records,noServiceChanges:true};
}
