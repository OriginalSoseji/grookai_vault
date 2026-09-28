import test from 'node:test';
import assert from 'node:assert/strict';
import { createImportHandler } from '../../supabase/functions/vault-import-targets-v1/handler.ts';

const row = {cardId:'11111111-1111-4111-8111-111111111111',gvId:'GV-TEST-1',desiredQuantity:3,condition:'LP',acquisitionCost:4.25,createdAt:'2026-01-01T00:00:00Z',notes:'Fixture'};
function fixture({authError, rpcError, response, throws=false}={}) {
  const writes=[];
  const handler=createImportHandler({
    requireUser:async()=>{if(authError)throw {code:authError};return {userId:'verified-owner',sb:{}};},
    createServiceRoleClient:()=>({rpc:async(name,args)=>{writes.push({name,args});if(throws)throw Error('lost response');return {error:rpcError??null,data:{requestId:args.p_request_id,success:true,...(response??{importedCards:3,importedEntries:1,targets:[{cardPrintId:row.cardId,expectedCount:3}]})}};}}),
  });
  return {writes,send:(body={rows:[row]},method='POST')=>handler(new Request('http://127.0.0.1/import',{method,...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify({ownerUserId:'verified-owner',...body})}:{})}))};
}
test('one verified-actor RPC retains totals and copy metadata; ignores supplied owner',async()=>{
  const f=fixture();const r=await f.send({rows:[row],p_user_id:'attacker',userId:'attacker'});
  assert.equal(r.status,200);assert.equal(f.writes.length,1);
  assert.equal(f.writes[0].name,'admin_import_vault_receipted_v1');
  assert.deepEqual(f.writes[0].args.p_rows,[row]);assert.equal(f.writes[0].args.p_user_id,'verified-owner');
  assert.match(f.writes[0].args.p_request_id,/^[0-9a-f-]{36}$/);
  assert.equal(r.clone().headers.get('cache-control'),'no-store');
  assert.equal((await r.json()).targets[0].expectedCount,3);
});
test('account switch between preview and dispatch is rejected by server',async()=>{
  const f=fixture();assert.equal((await f.send({ownerUserId:'previous-owner',rows:[row]})).status,409);assert.equal(f.writes.length,0);
});
for(const code of ['missing_bearer_token','invalid_jwt','server_misconfigured'])test(`rejects ${code} before writes`,async()=>{
  const f=fixture({authError:code});assert.equal((await f.send()).status,code==='server_misconfigured'?503:401);assert.equal(f.writes.length,0);
});
for(const [name,body] of [
  ['invalid JSON','{'],['empty',{rows:[]}],['duplicate',{rows:[row,row]}],['case duplicate',{rows:[row,{...row,cardId:row.cardId.toUpperCase()}]}],
  ['fraction',{rows:[{...row,desiredQuantity:1.5}]}],['negative',{rows:[{...row,desiredQuantity:-1}]}],
  ['over limit',{rows:[{...row,desiredQuantity:50001}]}],['bad identity',{rows:[{...row,cardId:'name'}]}],
  ['bad condition',{rows:[{...row,condition:'MINT'}]}],['negative cost',{rows:[{...row,acquisitionCost:-1}]}],
  ['bad date',{rows:[{...row,createdAt:'tomorrow'}]}],['long note',{rows:[{...row,notes:'a'.repeat(4001)}]}],
  ['large body','a'.repeat(2*1024*1024+1)],['too many rows',{rows:Array(5001).fill(row)}],
])test(`rejects ${name} without calling writer`,async()=>{const f=fixture();assert.equal((await f.send(body)).status,400);assert.equal(f.writes.length,0);});
for(const method of ['GET','OPTIONS'])test(`${method} does not write`,async()=>{const f=fixture();assert.equal((await f.send({},method)).status,method==='GET'?405:200);assert.equal(f.writes.length,0);});
for(const [code,expected] of [['GV001','vault_paused'],['PGRST202','import_outcome_unconfirmed']])test(`RPC ${code} fails closed with no legacy fallback`,async()=>{
  const f=fixture({rpcError:{code}});const r=await f.send();assert.equal(r.status,503);assert.equal((await r.json()).error,expected);assert.equal(f.writes.length,1);
});
test('transport loss is explicitly unconfirmed',async()=>{const f=fixture({throws:true});assert.equal((await (await f.send()).json()).error,'import_outcome_unconfirmed');});
for(const response of [{},{importedCards:-1,importedEntries:1,targets:[]},{importedCards:0,importedEntries:0,targets:[{cardPrintId:row.cardId,expectedCount:2}]},{importedCards:0,importedEntries:0,targets:[{cardPrintId:'wrong',expectedCount:3}]}])test(`malformed outcome ${JSON.stringify(response)}`,async()=>{
  assert.equal((await fixture({response}).send()).status,503);
});

test('terminal failure is correlated; a supplied request ID is ignored',async()=>{
 const f=fixture({response:{success:false,error:'vault_paused'}});const r=await f.send({rows:[row],requestId:'caller-value'});const body=await r.json();
 assert.equal(r.status,503);assert.equal(body.error,'vault_paused');assert.equal(body.requestId,f.writes[0].args.p_request_id);assert.notEqual(body.requestId,'caller-value');
});
test('another attempt receipt cannot be returned as success',async()=>{const f=fixture({response:{requestId:'wrong'}});assert.equal((await f.send()).status,503);});
