import './vendor_storefront_network_guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {storeCatalogPageIds,STORE_CATALOG_GAMES} from '../../apps/web/src/lib/stores/storeCatalogSearch.mjs';
test('multi-game pages retain all visible windows without skipped or repeated rows',async()=>{
 const rows=Object.fromEntries(STORE_CATALOG_GAMES.map((g,i)=>[g,Array.from({length:25+i},(_,n)=>({id:g+'-'+n}))]));
 const client={rpc:async(name,args)=>{assert.equal(name,'search_game_card_prints_v4');assert.equal(args.q,'Mew');return{error:null,data:rows[args.game_code_in].slice(args.offset_in,args.offset_in+args.limit_in)};}};
 const first=await storeCatalogPageIds(client,'Mew',0),second=await storeCatalogPageIds(client,'Mew',20);
 assert.equal(first.ids.length,60);assert.equal(first.more,true);assert.equal(second.more,false);
 assert.equal(new Set([...first.ids,...second.ids]).size,Object.values(rows).flat().length);
 assert.equal(first.ids.filter(id=>second.ids.includes(id)).length,0);
});
test('one unavailable game fails the search instead of presenting partial coverage',async()=>{
 await assert.rejects(storeCatalogPageIds({rpc:async(_name,args)=>({data:[],error:args.game_code_in==='mtg'?{code:'57014'}:null})},'Mew',0),/unavailable/);
});
