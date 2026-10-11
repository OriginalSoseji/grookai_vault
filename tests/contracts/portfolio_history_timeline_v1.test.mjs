import test from 'node:test';
import assert from 'node:assert/strict';
import {portfolioTimeline} from '../../apps/web/src/lib/vault/portfolioHistoryTimeline.mjs';
const id=n=>`00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
const point=(sequence,day,amount)=>({snapshotId:id(sequence),sequence:String(sequence),capturedAt:`2026-10-${day.toString().padStart(2,'0')}T12:00:00.000Z`,state:amount===null?'unpriced':'priced',coverage:{owned:1,priced:amount===null?0:1,unpriced:amount===null?1:0,byKind:{raw:{owned:1,priced:amount===null?0:1,unpriced:amount===null?1:0},slab:{owned:0,priced:0,unpriced:0},sealed:{owned:0,priced:0,unpriced:0}},byReason:amount===null?{no_qualified_price:1}:{},byCurrency:amount===null?{}:{USD:1}},totals:amount===null?{}:{USD:{exact:amount,display:amount+'.00'}}});
test('timeline uses actual capture spacing and preserves an unpriced gap',()=>{
 const plot=portfolioTimeline([point(3,11,'30'),point(2,2,null),point(1,1,'10')],'USD');assert.deepEqual(plot.map(p=>[p.x,p.y]),[[0,1000],[100,null],[1000,0]]);assert.equal(plot[1].label,null);
});
test('no first-point gain and no foreign currency zero',()=>{assert.deepEqual(portfolioTimeline([point(1,1,'10')],'USD').map(p=>[p.x,p.y]),[[500,500]]);assert.equal(portfolioTimeline([point(1,1,'10')],'CAD')[0].y,null);});
test('huge exact decimals never overflow to infinity during plotting',()=>{const huge='1'+'0'.repeat(900),more='2'+'0'.repeat(900);const plot=portfolioTimeline([point(1,1,huge),point(2,2,more)],'USD');assert.deepEqual(plot.map(p=>p.y),[1000,0]);assert.equal(plot[1].label,more+'.00');});
test('duplicate sequence or backward time is rejected',()=>{assert.throws(()=>portfolioTimeline([point(1,1,'1'),point(1,2,'2')],'USD'));assert.throws(()=>portfolioTimeline([point(1,2,'1'),point(2,1,'2')],'USD'));});
