import test from 'node:test';
import assert from 'node:assert/strict';
import {combineSealedPreview,mixedImportCounts} from '../../apps/web/src/lib/import/collectionPreviewV3.ts';
import {collectionReviewCsv,collectionReviewCounts,filterCollectionRows} from '../../apps/web/src/lib/import/collectionReviewWorkspace.ts';
import {chooseCollectionReviewCandidate} from '../../apps/web/src/lib/import/collectionPreviewChoices.ts';
import {parseCsv} from '../../supabase/functions/vault-import-collection-v2/source.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const variant={variantId:id(1),familyId:id(2),name:'Example Booster Box',game:'pokemon',packageForm:'booster_box',language:'en',region:null,edition:null,wave:null,identityFingerprint:'a'.repeat(64),releaseId:id(3),releaseState:'frozen',memberMappingId:id(4),mappingId:id(4),mappingVariantId:id(1),mappingStatus:'exact_reviewed',reviewDecision:'confirmed_sealed',promotionAuthorized:true,sourceName:'Example Booster Box',sourceSet:'Example'};
const catalog={releases:[{game:'pokemon',releaseId:id(3),state:'frozen',expectedMembers:1}],variants:[variant]};
function fixture(){
 const source=[{'Product Name':'Synthetic card',Category:'Pokemon',Set:'Example','Card Number':'1',Quantity:'1','Average Cost Paid':'2'},
 {'Product Name':'Example Booster Box',Category:'Pokemon',Set:'Example','Card Number':'',Quantity:'2','Average Cost Paid':'0'},
 {'Product Name':'Review',Category:'Pokemon',Set:'Example','Card Number':'2',Quantity:'1','Average Cost Paid':'3'}];
 const csv=[Object.keys(source[0]),...source.map(Object.values)].map(r=>r.map(v=>'"'+v.replaceAll('"','""')+'"').join(',')).join('\r\n');
 const rows=source.map((r,i)=>({sourceIndices:[i],source:r,sourceRecords:[r],quantity:i===1?null:1,reason:'Review',selection:null,matchedName:null,finish:null}));
 rows[0].selection={sourceIndices:[0],cardId:id(10),gvId:'GV-10',cardPrintingId:id(11)};rows[0].reason=null;
 rows[2].review={reason:'Review',selectedCardId:null,candidates:[{cardId:id(12),name:'Review',finish:'normal',selection:{sourceIndices:[2],cardId:id(12),gvId:'GV-12',cardPrintingId:id(13)}}]};
 return{source,csv,preview:{ownerId:id(50),rows,sourceRows:3,readyRows:1,readyCopies:1,reviewRows:2}};
}
test('explicit currency adds only the exact eligible sealed row and preserves card/source data',()=>{
 const f=fixture(),before=structuredClone(f.preview),p=combineSealedPreview(f.preview,f.csv,catalog,true,'USD');
 assert.deepEqual(mixedImportCounts(p),{cards:1,sealed:2});assert.equal(p.readyRows,2);assert.equal(p.readyCopies,3);assert.equal(p.reviewRows,1);assert.deepEqual(p.rows[0],f.preview.rows[0]);assert.deepEqual(f.preview,before);
 assert.equal(filterCollectionRows(p,'ready','all','').length,2);assert.equal(filterCollectionRows(p,'review','all','').length,1);
 assert.deepEqual(parseCsv(collectionReviewCsv(p,f.csv)),[f.source[2]]);
});
test('currency is never inferred and disabled ownership never produces a save selection',()=>{
 const f=fixture();for(const [enabled,currency,reason]of [[true,null,/purchase currency/],[false,'USD',/not available/]]){
  const p=combineSealedPreview(f.preview,f.csv,catalog,enabled,currency);assert.equal(p.rows[1].sealedSelection,null);assert.match(p.rows[1].reason,reason);assert.equal(p.readyCopies,1);assert.equal(collectionReviewCounts(p).sealed,1);
 }
});
test('card review choice and undo retain sealed selections and mixed counts',()=>{
 const f=fixture(),p=combineSealedPreview(f.preview,f.csv,catalog,true,'USD'),chosen=chooseCollectionReviewCandidate(p,[2],id(12));
 assert.equal(chosen.version,3);assert.equal(chosen.readyCopies,4);assert.equal(chosen.reviewRows,0);assert.equal(chosen.sealedAcquisitionCurrency,'USD');
 assert.deepEqual(chooseCollectionReviewCandidate(chosen,[2],null),p);
});
test('incomplete catalog fails instead of presenting incomplete eligible matches',()=>{
 const f=fixture();assert.throws(()=>combineSealedPreview(f.preview,f.csv,{...catalog,variants:[]},true,'USD'),/incomplete/);
});
