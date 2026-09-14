import assert from 'node:assert/strict';
import test from 'node:test';
import {readPublicSetCardOrderIndex, readPublicSetCardPage, comparePublicSetCardOrder, restorePublicSetCardPageOrder, MAX_SET_ORDER_ROWS} from './publicSetCardOrder.ts';

const card = (number, id=number) => ({id, number, number_plain:number});
const ordered = rows => [...rows].sort(comparePublicSetCardOrder).map(r=>r.number);

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('page metadata and finish reads overlap without changing selected IDs or order',async()=>{
  const metadata=deferred(),printings=deferred(),calls=[];
  const ids=['variant-b','variant-a'];
  const pending=readPublicSetCardPage(ids,async selected=>{calls.push(['metadata',selected]);return metadata.promise;},async selected=>{calls.push(['printings',selected]);return printings.promise;});
  await tick();assert.deepEqual(calls,[['metadata',ids],['printings',ids]]);
  const options=[{id:'finish-a',card_print_id:'variant-a'},{id:'finish-b',card_print_id:'variant-b'}];
  printings.resolve(options);metadata.resolve([{id:'variant-a'},{id:'variant-b'}]);
  assert.deepEqual(await pending,{rows:[{id:'variant-b'},{id:'variant-a'}],printingRows:options});
  assert.deepEqual(ids,['variant-b','variant-a']);
});

test('500-row pages keep metadata chunks sequential and at most two reads active',async()=>{
  const ids=Array.from({length:500},(_,i)=>`id-${i}`),printingGate=deferred();let active=0,peak=0,completed=0;const chunks=[];
  const pending=readPublicSetCardPage(ids,async selected=>{active++;peak=Math.max(peak,active);chunks.push(selected.length);await tick();active--;completed++;return [...selected].reverse().map(id=>({id}));},async selected=>{assert.deepEqual(selected,ids);active++;peak=Math.max(peak,active);await printingGate.promise;active--;return [];});
  for(let i=0;i<10&&completed<5;i++)await tick();
  assert.equal(completed,5);assert.deepEqual(chunks,[100,100,100,100,100]);assert.equal(peak,2);
  printingGate.resolve();assert.deepEqual((await pending).rows.map(r=>r.id),ids);assert.equal(active,0);
});

test('page failures wait for the other read and never publish partial results',async()=>{
  for(const failMetadata of [true,false]){
    const gate=deferred(),error=new Error(failMetadata?'metadata failed':'printing failed');let settled=false;
    const pending=readPublicSetCardPage(['id'],async()=>{if(failMetadata)throw error;await gate.promise;return [{id:'id'}];},async()=>{if(!failMetadata)throw error;await gate.promise;return [];});
    const checked=pending.then(()=>assert.fail('Partial page accepted'),e=>{settled=true;assert.equal(e,error);});
    await tick();assert.equal(settled,false);gate.resolve();await checked;assert.equal(settled,true);
  }
  for(const rows of [[],[{id:'other'}],[{id:'id'},{id:'id'}]]){
    await assert.rejects(readPublicSetCardPage(['id'],async()=>rows,async()=>[]),/Set page changed/);
  }
});

test('empty or invalid page identities never launch reads; inputs remain isolated',async()=>{
  const never=async()=>assert.fail('Unexpected read');
  assert.deepEqual(await readPublicSetCardPage([],never,never),{rows:[],printingRows:[]});
  for(const ids of [[''],['id','id'],Array.from({length:501},(_,i)=>`${i}`)])await assert.rejects(readPublicSetCardPage(ids,never,never),/Invalid set page/);
  const input=['one'];
  const pending=readPublicSetCardPage(input,async ids=>{ids[0]='changed';return [{id:'one'}];},async ids=>{assert.deepEqual(ids,['one']);ids.push('changed');return [];});
  assert.deepEqual((await pending).rows,[{id:'one'}]);assert.deepEqual(input,['one']);
});

test('numeric order precedes pagination, including the reported 11/100 boundary', async () => {
  const rows=Array.from({length:113},(_,n)=>card(String(n+1),String(n+1).padStart(6,'0')));
  let requests=0;
  const index=await readPublicSetCardOrderIndex(async cursor=>{
    requests++;
    const remaining=rows.filter(r=>!cursor||r.id>cursor);
    return {rows:remaining.slice(0,17),count:remaining.length};
  });
  assert.equal(requests,7);
  const pages=Array.from({length:5},(_,p)=>index.slice(p*24,(p+1)*24));
  assert.deepEqual(pages.flat().map(r=>r.number),rows.map(r=>r.number));
  assert.equal(new Set(pages.flat().map(r=>r.id)).size,113);
  assert.deepEqual(index.slice(9,12).map(r=>r.number),['10','11','12']);
  assert.deepEqual(index.slice(98,101).map(r=>r.number),['99','100','101']);
});

test('prefixes, suffixes, denominators, leading zeroes and large numbers retain identity',()=>{
  assert.deepEqual(ordered(['TG10','2','TG2','11','100','1a','1','1b','OP17-010','OP17-002'].map(n=>card(n))),
    ['1','1a','1b','2','11','100','OP17-002','OP17-010','TG2','TG10']);
  assert.deepEqual(ordered([card('001/076','a'),card('1/200','b'),card('２','c'),card('9007199254740993','d'),card('9007199254740992','e')]),
    ['001/076','1/200','２','9007199254740992','9007199254740993']);
});

test('duplicate numbers keep all variants with a stable UUID tie breaker; missing numbers last',()=>{
  const rows=[card('10','c'),card(null,'z'),card('010','a'),card('10','b'),card('','x')];
  assert.deepEqual([...rows].sort(comparePublicSetCardOrder).map(r=>r.id),['a','b','c','x','z']);
  assert.equal(rows[0].number,'10');
  assert.deepEqual(ordered([{id:'a',number:null,number_plain:'12'},card('13','b')]),[null,'13']);
});

test('empty and row-cap-limited sets do not require an extra or unbounded query',async()=>{
  let calls=0;assert.deepEqual(await readPublicSetCardOrderIndex(async()=>{calls++;return {rows:[],count:0};}),[]);assert.equal(calls,1);
  const rows=[card('10','a'),card('2','b')];
  assert.deepEqual((await readPublicSetCardOrderIndex(async cursor=>cursor?{rows:[rows[1]],count:1}:{rows:[rows[0]],count:2})).map(r=>r.number),['2','10']);
});

test('incomplete, duplicate, changing and oversized indexes fail instead of dropping cards',async()=>{
  await assert.rejects(readPublicSetCardOrderIndex(async()=>({rows:[],count:null})),/Invalid/);
  await assert.rejects(readPublicSetCardOrderIndex(async()=>({rows:[],count:MAX_SET_ORDER_ROWS+1})),/oversized/);
  await assert.rejects(readPublicSetCardOrderIndex(async()=>({rows:[],count:1})),/Incomplete/);
  await assert.rejects(readPublicSetCardOrderIndex(async()=>({rows:[card('1','a'),card('2','a')],count:2})),/Duplicate/);
  await assert.rejects(readPublicSetCardOrderIndex(async cursor=>cursor?{rows:[card('2','b')],count:2}:{rows:[card('1','a')],count:2}),/changed/);
  await assert.rejects(readPublicSetCardOrderIndex(async()=>{throw Error('RLS read failed');}),/RLS/);
});

test('detail responses are reordered and cannot silently omit or add identities',()=>{
  assert.deepEqual(restorePublicSetCardPageOrder(['b','a'],[card('1','a'),card('2','b')]).map(r=>r.id),['b','a']);
  for(const rows of [[card('1','a')],[card('1','a'),card('1','a')],[card('1','a'),card('2','c')]]) {
    assert.throws(()=>restorePublicSetCardPageOrder(['a','b'],rows),/changed/);
  }
});
