// Fixed new full-source fixture attestation. No service changes or remote target.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
export function inspectJungleUpgradeV35(){
 const project='jungle-edition-upgrade-425-v35-20261001',base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/upgrade-425-v35';
 const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:20000,maxBuffer:4*1024*1024});
 const db=JSON.parse(docker('inspect','supabase_db_'+project))[0],relay=JSON.parse(docker('inspect',project+'-relay'))[0],network=JSON.parse(docker('network','inspect',project))[0];
 for(const c of [db,relay]){assert.equal(c.State.Running,true);assert.equal(c.State.Paused,false);assert.equal(c.State.Restarting,false);}
 assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(network.Internal,true);assert.equal(network.IPAM.Config[0].Subnet,'10.248.28.0/24');
 const address=db.NetworkSettings.Networks[project].IPAddress;assert.match(address,/^10\.248\.28\.\d+$/);assert.equal(db.NetworkSettings.Networks[project].Gateway,'');
 assert.equal(relay.Config.Image,'node:22-bookworm-slim');assert.deepEqual(Object.keys(relay.NetworkSettings.Networks).sort(),['bridge',project].sort());
 assert.deepEqual(Object.keys(relay.NetworkSettings.Ports).sort(),['54020/tcp','54021/tcp','54024/tcp']);
 for(const [port,bindings]of Object.entries(relay.NetworkSettings.Ports)){assert.equal(bindings.length,1);assert.deepEqual(bindings[0],{HostIp:'127.0.0.1',HostPort:port.split('/')[0]});}
 assert.equal(docker('exec',relay.Name,'cat','/relay.mjs'),fs.readFileSync(base+'/relay.mjs','utf8'));
 return {at:new Date().toISOString(),status:'passed',project,address,dbId:db.Id,relayId:relay.Id,internal:true,loopbackOnly:true,relaySha256:createHash('sha256').update(fs.readFileSync(base+'/relay.mjs')).digest('hex'),noServiceChanges:true};
}
