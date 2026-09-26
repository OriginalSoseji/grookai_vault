// Offline enrichment of an already frozen, printing-qualified reference index.
import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {printedCoordinates} from '../../apps/web/src/lib/stores/scanPrintedIdentityV8.mjs';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function loadCatalogV8() {
  const raw=fs.readFileSync('.local/integration/vendor-scan-expansion-v3/local-build-2026-09-23T22-52-10-191Z.jsonl');
  assert.equal(sha256(raw),'709045ad12c75924b08bf4a40a846e578cec4f3fb0262c4c841640e899c926aa');
  const metadataBytes=fs.readFileSync('.local/integration/vendor-scan-expansion-v8/metadata.private.json');
  const metadata=JSON.parse(metadataBytes), byId=new Map(metadata.cards.map(c=>[c.id,c])),sets=new Map(metadata.sets.map(s=>[s.id,s]));
  assert.equal(metadata.target,'ycdxbpibncqcchqiihfz');
  const catalog=raw.toString().trim().split('\n').map(JSON.parse).sort((a,b)=>a.id.localeCompare(b.id)).map(card=>{
    const record=byId.get(card.id);
    if(record){assert.equal(record.gv_id,card.gv_id);assert.equal(record.number,card.number);}
    return {...card,printedCoordinates:printedCoordinates(record,sets.get(record?.set_id))};
  });
  return {catalog,indexSha256:sha256(raw),metadataSha256:sha256(metadataBytes),coverage:{references:catalog.length,knownTotal:catalog.filter(c=>c.printedCoordinates.total).length,knownSet:catalog.filter(c=>c.printedCoordinates.setCode).length}};
}
