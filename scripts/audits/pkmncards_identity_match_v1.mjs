import { normalizeText, normalizeNumber } from './verified_master_set_index_v1/shared.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

function comparable(value) {
  const text=String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/♀/g,' female ').replace(/♂/g,' male ').replace(/[‘’]/g,"'");
  // Unknown non-ASCII symbols may distinguish card identities; do not silently
  // discard them. Stars are explicitly handled by the shared normalizer.
  if (/[^\x00-\x7f★☆]/u.test(text)) return '';
  return normalizeText(text);
}

// ex and EX denote different mechanics. Do not erase that distinction while
// allowing ordinary capitalization and punctuation differences elsewhere.
function exTokens(value) {
  return [...String(value ?? '').normalize('NFKC').matchAll(/(?<![\p{L}\p{N}])(ex|EX)(?![\p{L}\p{N}])/gu)]
    .map(match => match[1]);
}

export function exactSourceCardName(expected, actual) {
  const left=comparable(expected), right=comparable(actual);
  if (!left || left!==right) return false;
  const expectedEx=exTokens(expected), actualEx=exTokens(actual);
  return expectedEx.length===actualEx.length && expectedEx.every((token,index)=>token===actualEx[index]);
}

export function exactSourceSetName(expected, actual) {
  const left=comparable(expected),right=comparable(actual);
  return Boolean(left && left===right);
}

export function createSourceIdentityEvidence(fact, accepted, setAliases) {
  assert.equal(accepted?.validation?.ok,true,'SOURCE_NOT_VALIDATED');
  const source=accepted.parsed;
  assert.ok(exactSourceCardName(fact.card_name,source?.card_name),'SOURCE_NAME_MISMATCH');
  assert.ok(setAliases.some(alias=>exactSourceSetName(alias,source?.set_name)),'SOURCE_SET_MISMATCH');
  assert.ok(normalizeNumber(fact.card_number) && normalizeNumber(fact.card_number)===normalizeNumber(source?.card_number),'SOURCE_NUMBER_MISMATCH');
  return {source_key:'pkmncards_identity_gap',source_kind:'collector_reference',source_url:accepted.url,
    set_key:fact.set_key,set_name:fact.set_name,card_number:fact.card_number,
    card_name:source.card_name,requested_card_name:fact.card_name,source_set_name:source.set_name,
    finish_key:null,evidence_type:'card_identity',evidence_label:`PKMNCards card page: ${accepted.title}`,
    notes:`PKMNCards source name: ${source.card_name}; requested name: ${fact.card_name}; source set label: ${source.set_name}. Accepted after exact normalized card/set label and number checks.`};
}

export async function writeEvidenceRun(fixtureDir, recordsBySet, generatedAt, runId=randomUUID()) {
  if (recordsBySet.size===0) return [];
  assert.match(runId,/^[a-zA-Z0-9-]+$/,'INVALID_RUN_ID');
  for(const setKey of recordsBySet.keys()) assert.match(setKey,/^[a-z0-9][a-z0-9._-]*$/,'INVALID_SET_KEY');
  const runs=path.join(fixtureDir,'runs');
  await fs.mkdir(runs,{recursive:true});
  const records=[];
  for(const [setKey,records] of recordsBySet) {
    for(const record of records) {
      assert.equal(record.set_key,setKey,'RECORD_SET_DRIFT');
    }
  }
  for(const [setKey,group] of recordsBySet) for(const record of group) records.push({...record,
    retrieved_at:generatedAt,raw_snapshot_ref:`pkmncards_identity_gap:${setKey}:${generatedAt}`});
  const temporary=path.join(runs,`${runId}.json.tmp`),file=path.join(runs,`${runId}.json`);
  await fs.writeFile(temporary,`${JSON.stringify({source_key:'pkmncards_identity_gap',
    source_kind:'collector_reference',source_url:'https://pkmncards.com/',retrieved_at:generatedAt,records},null,2)}\n`,{flag:'wx'});
  // Link is exclusive, and readers only scan .json files. A failed write or
  // name collision cannot replace previous evidence or expose partial JSON.
  await fs.link(temporary,file);
  await fs.unlink(temporary);
  return [file];
}
