// Fixed local replay transport while Docker Desktop port publication is stalled.
// Never publishes Docker's API on TCP or connects to a remote database.
import fs from 'node:fs';import net from 'node:net';import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
assert.equal(process.argv.length,3);const mode=process.argv[2];assert.ok(['full','upgrade'].includes(mode));
const project=`jungle-edition-${mode}-421-v21-20261001`,port=mode==='full'?65180:65480;
const dir=`C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/${mode}-421-v21`;
assert.equal(process.env.DOCKER_HOST,'npipe:////./pipe/grookai-jungle-replay-v20');
const relay=JSON.parse(execFileSync('docker',['inspect',project+'-relay'],{encoding:'utf8',timeout:10000}))[0];
assert.equal(relay.State.Running,true);assert.equal(relay.Config.Image,'node:22-bookworm-slim');
assert.deepEqual(Object.keys(relay.NetworkSettings.Networks).sort(),['bridge',project].sort());
for(const entries of Object.values(relay.HostConfig.PortBindings))for(const entry of entries)assert.equal(entry.HostIp,'127.0.0.1');
const address=relay.NetworkSettings.Networks.bridge.IPAddress;assert.match(address,/^172\.17\.\d{1,3}\.\d{1,3}$/);
const prefix=['-d','docker-desktop','--'];const parent=execFileSync('wsl',[...prefix,'cat','/run/linuxkit-parent.pid'],{encoding:'utf8',timeout:5000}).trim();assert.match(parent,/^[1-9][0-9]*$/);
const servers=[],children=new Set();
for(const p of [port,port+1,port+4]){
 const server=net.createServer(socket=>{
  const child=spawn('wsl',[...prefix,'nsenter','-t',parent,'-m','-n','--','socat','-','TCP:'+address+':'+p],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  children.add(child);socket.pipe(child.stdin);child.stdout.pipe(socket);child.stderr.resume();
  socket.on('error',()=>child.kill());socket.on('close',()=>child.kill());child.stdin.on('error',()=>socket.destroy());
  child.on('error',()=>socket.destroy());child.on('close',()=>{children.delete(child);socket.destroy();});
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(p,'127.0.0.1',resolve);});servers.push(server);
}
fs.writeFileSync(dir+'/windows-gateway.json',JSON.stringify({at:new Date().toISOString(),pid:process.pid,project,relayId:relay.Id,address,ports:[port,port+1,port+4],bind:'127.0.0.1',parent,remoteTargets:0},null,2),{flag:'wx'});
function stop(){for(const server of servers)server.close();for(const child of children)child.kill();setTimeout(()=>process.exit(),500).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
