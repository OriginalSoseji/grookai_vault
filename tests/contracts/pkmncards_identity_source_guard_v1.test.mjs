import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {exactSourceCardName,exactSourceSetName,createSourceIdentityEvidence,writeEvidenceRun}
  from '../../scripts/audits/pkmncards_identity_match_v1.mjs';
import {validateCandidate} from '../../scripts/audits/english_master_index_pkmncards_identity_gap_acquisition_v1.mjs';
import {collectHumanFixtureEvidence} from '../../scripts/audits/verified_master_set_index_v1/source_adapters/human_fixtures.mjs';
import {selectedSources} from '../../scripts/audits/english_master_index_source_batch_acquisition_v1.mjs';
import {classifyEvidence} from '../../scripts/audits/verified_master_set_index_v1/agreement_engine/classifier.mjs';

test('card and set labels must match completely without collapsing ex into EX',()=>{
  assert.equal(exactSourceCardName('Zacian','Zacian LV.X'),false);
  assert.equal(exactSourceCardName('Zacian LV.X','Zacian LV. X'),true);
  assert.equal(exactSourceCardName('Charizard ex','Charizard EX'),false);
  assert.equal(exactSourceCardName('Nidoran ♀','Nidoran ♂'),false);
  assert.equal(exactSourceCardName('Nidoran ♀','Nidoran'),false);
  assert.equal(exactSourceCardName('Zacian Ω','Zacian'),false);
  assert.equal(exactSourceCardName('Charizard (Delta Species)','Charizard'),false);
  assert.equal(exactSourceCardName('Gallade 4 LV. X','Gallade E4 LV.X'),false);
  assert.equal(exactSourceCardName('',''),false);
  assert.equal(exactSourceSetName('Base Set','Base Set 2'),false);
  assert.equal(exactSourceSetName('Sword Shield Promos','Sword & Shield Promos'),true);
});

test('emitted evidence retains actual source label and rejects a requested-name substitution',()=>{
  const fact={set_key:'swshp',set_name:'SWSH Black Star Promos',card_number:'SWSH135',card_name:'Zacian LV.X'};
  const accepted={url:'https://pkmncards.com/card/example/',title:'Zacian LV. X · Sword & Shield Promos #SWSH135',
    parsed:{card_name:'Zacian LV. X',set_name:'Sword & Shield Promos',card_number:'SWSH135'},validation:{ok:true}};
  const record=createSourceIdentityEvidence(fact,accepted,['Sword Shield Promos']);
  assert.equal(record.card_name,'Zacian LV. X');
  assert.equal(record.requested_card_name,'Zacian LV.X');
  assert.equal(record.source_set_name,'Sword & Shield Promos');
  assert.match(record.notes,/source name: Zacian LV\. X/);
  assert.throws(()=>createSourceIdentityEvidence({...fact,card_name:'Zacian'},accepted,['Sword Shield Promos']),/SOURCE_NAME_MISMATCH/);
  assert.throws(()=>createSourceIdentityEvidence(fact,{...accepted,parsed:{...accepted.parsed,card_number:'SWSH136'}},['Sword Shield Promos']),/SOURCE_NUMBER_MISMATCH/);
  assert.throws(()=>createSourceIdentityEvidence(fact,accepted,['Sword Shield']),/SOURCE_SET_MISMATCH/);
});

test('acquisition validator cannot turn a partial source name into exact corroboration',()=>{
  const fact={set_key:'swshp',set_name:'SWSH Black Star Promos',card_number:'SWSH135',card_name:'Zacian'};
  const parsed={card_name:'Zacian LV.X',set_name:'Sword & Shield Promos',card_number:'SWSH135'};
  const mismatch=validateCandidate(fact,parsed);
  assert.equal(mismatch.ok,false);
  assert.equal(mismatch.checks.card_name,false);
  assert.equal(mismatch.checks.card_number,true);
  assert.equal(validateCandidate({...fact,card_name:'Zacian LV.X'},parsed).ok,true);
  assert.equal(validateCandidate({...fact,card_name:'Zacian LV.X'},{...parsed,set_name:'Sword & Shield Promos 2'}).ok,false);
});

test('append-only acquisition remains opt-in while reset sources retain their gate',()=>{
  const normal=selectedSources({sources:null,includeResettingSources:false});
  assert.equal(normal.selected.some(x=>x.id==='pkmncards_identity_gap'),false);
  assert.ok(normal.excluded.some(x=>x.id==='pkmncards_identity_gap'&&x.fixture_mode==='append_only_opt_in'));
  const explicit=selectedSources({sources:['pkmncards identity gap'],includeResettingSources:false});
  assert.equal(explicit.selected[0].fixture_mode,'append_only_opt_in');
  const reset=selectedSources({sources:['binderbuilder'],includeResettingSources:false});
  assert.equal(reset.selected.length,0);
  assert.equal(reset.excluded[0].fixture_mode,'reset');
});

test('additive fixture output preserves prior bytes and never exposes partial or duplicate runs',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'gv-pkmncards-'));
  const old=path.join(root,'old.json'),runs=path.join(root,'runs'),final=path.join(runs,'case-1.json'),tmp=path.join(runs,'case-1.json.tmp');
  try {
    await fs.writeFile(old,'original evidence bytes');
    assert.deepEqual(await writeEvidenceRun(root,new Map(),'2026-01-01','empty'),[]);
    const records=new Map([['swshp',[{set_key:'swshp',set_name:'Promo',card_name:'Zacian LV.X'}]],['base1',[{set_key:'base1',set_name:'Base',card_name:'Pikachu'}]]]);
    assert.deepEqual(await writeEvidenceRun(root,records,'2026-01-01','case-1'),[final]);
    assert.equal(await fs.readFile(old,'utf8'),'original evidence bytes');
    const bytes=await fs.readFile(final,'utf8'),fixture=JSON.parse(bytes);
    assert.deepEqual(fixture.records.map(x=>x.set_key),['swshp','base1']);
    assert.ok(fixture.records.every(x=>x.raw_snapshot_ref && x.retrieved_at));
    await assert.rejects(()=>writeEvidenceRun(root,records,'2026-01-01','case-1'));
    assert.equal(await fs.readFile(final,'utf8'),bytes);
    assert.equal(await fs.readFile(old,'utf8'),'original evidence bytes');
  } finally {
    for(const file of [tmp,final,old]) await fs.unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(runs).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(root);
  }
});

test('existing Master Index fixture reader consumes additive mixed-set records with source labels',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'gv-pkmncards-reader-'));
  const runs=path.join(root,'runs'),file=path.join(runs,'reader-case.json'),second=path.join(runs,'reader-case-2.json');
  try {
    const records=new Map([
      ['swshp',[{source_key:'pkmncards_identity_gap',source_kind:'collector_reference',source_url:'https://pkmncards.com/card/zacian/',set_key:'swshp',set_name:'Promos',card_number:'SWSH135',card_name:'Zacian LV.X',evidence_type:'card_identity'}]],
      ['base1',[{source_key:'pkmncards_identity_gap',source_kind:'collector_reference',source_url:'https://pkmncards.com/card/pikachu/',set_key:'base1',set_name:'Base',card_number:'58',card_name:'Pikachu',evidence_type:'card_identity'}]],
    ]);
    await writeEvidenceRun(root,records,'2026-01-01','reader-case');
    await writeEvidenceRun(root,records,'2026-01-02','reader-case-2');
    const output=await collectHumanFixtureEvidence([{key:'swshp'},{key:'base1'}],{fixtureDir:root,retrievedAt:'2026-01-01'});
    assert.deepEqual(output.map(row=>[row.set_key,row.card_number,row.card_name]),[['swshp','SWSH135','Zacian LV.X'],['base1','58','Pikachu'],['swshp','SWSH135','Zacian LV.X'],['base1','58','Pikachu']]);
    assert.ok(output.every(row=>row.raw_snapshot_ref && row.source_key==='pkmncards_identity_gap'));
    const cards=classifyEvidence(output).cards;
    assert.equal(cards.length,2);
    assert.ok(cards.every(row=>row.source_count===1 && row.status==='human_source_verified'));
  } finally {
    for(const target of [file,second]) await fs.unlink(target).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(runs).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(root);
  }
});
