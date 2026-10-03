import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionReviewCounts, collectionReviewCsv, filterCollectionRows} from '../../apps/web/src/lib/import/collectionReviewWorkspace.ts';
import {chooseCollectionReviewCandidate} from '../../apps/web/src/lib/import/collectionPreviewChoices.ts';
import {parseCsv} from '../../supabase/functions/vault-import-collection-v2/source.ts';

const source = Array.from({length: 63}, (_, i) => ({'Product Name': `Synthetic ${i}`, Set: 'Étoile, "test"', 'Card Number': String(i), Grade: i < 2 ? 'PSA 10' : 'Ungraded', Notes: i === 0 ? 'First\nSecond, "quoted"' : '=original text'}));
source[62] = {...source[0]};
const csv = [Object.keys(source[0]), ...source.map(Object.values)].map(row => row.map(value => '"'+value.replaceAll('"','""')+'"').join(',')).join('\r\n');
function fixture() {
  const rows = source.map((record,index) => ({sourceIndices:[index],source:record,sourceRecords:[record],quantity:1,reason:'Review',selection:null,matchedName:null,finish:null}));
  rows[2].selection = {sourceIndices:[2],cardId:'ready',gvId:'ready',cardPrintingId:null};
  rows[3].review = {reason:'Review',selectedCardId:null,candidates:[{cardId:'choice',gvId:'choice',name:'Chosen',finish:'holo',selection:{sourceIndices:[3],cardId:'choice',gvId:'choice',cardPrintingId:'holo'}}]};
  // Group nonadjacent source rows; export must restore original order.
  rows[0].sourceIndices.push(62); rows[0].sourceRecords.push(source[62]); rows[0].quantity=2; rows.pop();
  return {ownerId:'synthetic',rows,sourceRows:63,readyRows:1,readyCopies:1,reviewRows:62};
}
test('review counts include all grouped source rows; search combines original fields without mutation', () => {
  const p=fixture(), before=structuredClone(p), counts=collectionReviewCounts(p);
  assert.equal(counts.graded,3); // Two grouped source rows plus one separate graded row.
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),62);
  assert.equal(filterCollectionRows(p,'review','all','  ÉTOILE PSA 10 ').length,2);
  assert.equal(filterCollectionRows(p,'review','choices','').length,1);
  assert.equal(filterCollectionRows(p,'ready','graded','').length,1);
  assert.equal(filterCollectionRows(p,'all','all','not found').length,0);
  assert.deepEqual(p,before);
});
test('download retains all unresolved source fields/order beyond pagination, independent of filters', () => {
  const p=fixture(); filterCollectionRows(p,'review','graded','PSA');
  assert.deepEqual(parseCsv(collectionReviewCsv(p,csv)),source.filter((_,i)=>i!==2));
});
test('manual selection and undo update counts and export without losing source', () => {
  const p=fixture(), chosen=chooseCollectionReviewCandidate(p,[3],'choice');
  assert.equal(collectionReviewCounts(chosen).choices,0);
  assert.deepEqual(parseCsv(collectionReviewCsv(chosen,csv)),source.filter((_,i)=>i!==2&&i!==3));
  const undone=chooseCollectionReviewCandidate(chosen,[3],null);
  assert.equal(collectionReviewCsv(undone,csv),collectionReviewCsv(p,csv));
});
test('download rejects missing, duplicate, changed and out-of-range source evidence', () => {
  for (const mutate of [p=>p.rows.pop(),p=>p.rows[1].sourceIndices[0]=0,p=>p.rows[1].sourceIndices[0]=999,p=>p.rows[1].sourceRecords=[{...source[1],Grade:'changed'}],p=>p.reviewRows--]) {
    const p=fixture();mutate(p);assert.throws(()=>collectionReviewCsv(p,csv));
  }
});
