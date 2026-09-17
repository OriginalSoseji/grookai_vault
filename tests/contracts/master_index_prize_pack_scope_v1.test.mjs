import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { classifyEvidence } from '../../scripts/audits/verified_master_set_index_v1/agreement_engine/classifier.mjs';
import { isPrizePackSourceEvidenceV1, retainPrintingForScopeReviewV1 } from '../../scripts/audits/verified_master_set_index_v1/printing_evidence_scope_v1.mjs';
import { enforceStrictGuardrails, buildStrictGuardrailOptions } from '../../scripts/audits/verified_master_set_index_v1/guardrails/strict_guardrails.mjs';
import { preserveUnobservedPrintingAuthorityV1, MASTER_INDEX_AUTHORITY_FILES } from '../../scripts/workers/english_pokemon_master_index_refresh_v1.mjs';

const source = {
  source_key: 'justinbasil_prize_pack_finish', source_kind: 'collector_reference',
  source_url: 'https://www.justinbasil.com/set-lists/pps4',
  set_key: 'sv02', set_name: 'Paldea Evolved', card_number: '71', card_name: 'Luxray',
  finish_key: 'normal', evidence_type: 'finish_presence', language: 'en',
  evidence_label: 'S (non-holo) Luxray PAL 71', notes: 'All listed cards are stamped.',
  raw_snapshot_ref: 'fixture:pps4:71',
};
const otherPrize = { ...source, source_key: 'bulbapedia_prize_pack_current_gap_finish',
  source_url: 'https://bulbapedia.bulbagarden.net/wiki/Play!_Pok%C3%A9mon_Prize_Pack_Series_Four_(TCG)' };
const base = { ...source, source_key: 'independent_base_checklist',
  source_url: 'https://base-checklist.test/paldea-evolved', notes: 'Base set exact finish.' };
const cached = {
  key: 'paldea evolved|71|luxray|normal', set_key: 'sv02', set_name: 'Paldea Evolved',
  card_number: '71', card_name: 'Luxray', finish_key: 'normal', status: 'master_verified',
  source_count: 2, source_evidence: [source, otherPrize], evidence_urls: [source.source_url, otherPrize.source_url],
};

test('Prize Pack context is detected from known source keys or exact source paths', () => {
  assert.equal(isPrizePackSourceEvidenceV1(source), true);
  assert.equal(isPrizePackSourceEvidenceV1({ ...otherPrize, source_key: 'generic' }), true);
  assert.equal(isPrizePackSourceEvidenceV1({ source_url: 'https://www.pokemon.com/checklist/prize_pack_series_4_web_cardlist_en.pdf' }), true);
  assert.equal(isPrizePackSourceEvidenceV1({ source_url: 'https://justinbasil.com.example.test/set-lists/pps4' }), false);
  assert.equal(isPrizePackSourceEvidenceV1({ source_url: 'https://base.test/cards?query=prize_pack' }), false);
  assert.equal(isPrizePackSourceEvidenceV1({ source_url: 'not a URL' }), false);
});

test('two Prize Pack sources cannot assert an unstamped Normal and preserve both records for review', () => {
  const records = [source, otherPrize];
  const before = structuredClone(records);
  const result = classifyEvidence(records);
  assert.deepEqual(result.printings, []);
  assert.equal(result.manual_review.length, 1);
  assert.equal(result.manual_review[0].status, 'needs_manual_review');
  assert.equal(result.manual_review[0].finish_key, 'normal');
  assert.equal(result.manual_review[0].evidence.length, 2);
  assert.deepEqual(result.manual_review[0].evidence.map(x => x.source_url).sort(), records.map(x => x.source_url).sort());
  assert.deepEqual(result.manual_review[0].evidence.map(x => x.notes), records.map(x => x.notes));
  assert.deepEqual(records, before);
  assert.deepEqual(result, classifyEvidence([...records].reverse()));
});

test('Prize Pack evidence does not strengthen an independent but single-source base finish', () => {
  const result = classifyEvidence([source, otherPrize, base]);
  assert.equal(result.printings.length, 1);
  assert.equal(result.printings[0].status, 'human_source_verified');
  assert.equal(result.printings[0].source_count, 1);
  assert.deepEqual(result.printings[0].evidence.map(x => x.source_url), [base.source_url]);
  assert.equal(result.manual_review[0].evidence.length, 2);
});

test('independently supported base finish remains verified without merging Prize Pack evidence', () => {
  const result = classifyEvidence([source, base, { ...base, source_key: 'base_b', source_url: 'https://base-b.test/list' }]);
  assert.equal(result.printings[0].status, 'master_verified');
  assert.equal(result.printings[0].source_count, 2);
  assert.equal(result.manual_review.length, 1);
});

test('Cosmos, Holo and absence claims retain Prize Pack scope instead of changing base truth', () => {
  for (const finish_key of ['normal', 'holo', 'cosmos']) {
    for (const evidence_type of ['finish_presence', 'finish_absence']) {
      const result = classifyEvidence([{ ...source, finish_key, evidence_type }]);
      assert.deepEqual(result.printings, []);
      assert.deepEqual(result.finish_absences, []);
      assert.equal(result.manual_review[0].finish_key, finish_key);
      assert.equal(result.manual_review[0].evidence[0].evidence_type, evidence_type);
    }
  }
});

test('explicit stamp claims retain the existing stamp lane, not a guessed Normal child', () => {
  const result = classifyEvidence([source, otherPrize].map(row => ({ ...row, finish_key: 'stamped' })));
  assert.equal(result.printings.length, 1);
  assert.equal(result.printings[0].finish_key, 'stamped');
  assert.equal(result.printings[0].status, 'master_verified');
  assert.deepEqual(result.manual_review, []);
});

test('historical continuity keeps all bytes but cannot restore unbound verified status', () => {
  const before = structuredClone(cached);
  const result = preserveUnobservedPrintingAuthorityV1({ baselinePrintings: [cached] });
  assert.equal(result.printings.length, 1);
  assert.equal(result.printings[0].status, 'needs_manual_review');
  assert.equal(result.printings[0].authority_status_before_scope_review, 'master_verified');
  assert.deepEqual(result.printings[0].source_evidence, cached.source_evidence);
  assert.deepEqual(result.printings[0].evidence_urls, cached.evidence_urls);
  assert.equal(result.scope_review_rows.length, 1);
  assert.deepEqual(cached, before);
  assert.deepEqual(retainPrintingForScopeReviewV1(result.printings[0]), result.printings[0]);
});

test('source-outage candidate copy cannot bypass scope review and compact legacy fields are checked', () => {
  const result = preserveUnobservedPrintingAuthorityV1({ baselinePrintings: [cached], candidatePrintings: [cached] });
  assert.equal(result.printings[0].status, 'needs_manual_review');
  assert.equal(result.preserved.length, 0);
  assert.equal(result.scope_review_rows.length, 1);
  assert.equal(retainPrintingForScopeReviewV1({ ...cached, source_evidence: [], evidence_urls: [], sources: [source.source_key] }).status, 'needs_manual_review');
  assert.equal(retainPrintingForScopeReviewV1({ ...cached, source_evidence: [] }).status, 'needs_manual_review');
  assert.equal(retainPrintingForScopeReviewV1({ ...cached, status: 'conflicting' }).status, 'conflicting');
});

test('fresh independently bound base evidence supersedes the old mixed claim without losing identity', () => {
  const fresh = { ...cached, source_evidence: [base], evidence_urls: [base.source_url], status: 'human_source_verified', source_count: 1 };
  const result = preserveUnobservedPrintingAuthorityV1({ baselinePrintings: [cached], candidatePrintings: [fresh] });
  assert.deepEqual(result.printings, [fresh]);
  assert.equal(result.scope_review_rows.length, 0);
});

test('strict guard rejects an old classified master_verified object with Prize Pack scope', () => {
  assert.throws(() => enforceStrictGuardrails({ records: [],
    classified: { printings: [{ ...cached, evidence: [source, otherPrize] }], conflicts: [] },
    setConfigs: [], options: buildStrictGuardrailOptions({}),
  }), /unbound Prize Pack variant scope/);
});

test('real Luxray and Tyranitar preserved source fixtures remain review evidence, not base Normal', async () => {
  for (const [file, name] of [
    ['generated_justinbasil_prize_pack_finish_v1/sv02.json', 'Luxray'],
    ['generated_bulbapedia_prize_pack_normal_v1/sv09.json', 'Tyranitar'],
  ]) {
    const fixture = JSON.parse(await fs.readFile(new URL(
      `../../docs/audits/verified_master_set_index_v1/source_fixtures/${file}`, import.meta.url,
    ), 'utf8'));
    const rows = fixture.records.filter(row => row.card_name === name);
    assert.equal(rows.length, 1);
    const result = classifyEvidence(rows);
    assert.equal(result.printings.length, 0);
    assert.equal(result.manual_review[0].card_name, name);
    assert.equal(result.manual_review[0].evidence[0].evidence_label, rows[0].evidence_label);
  }
});

test('real offline refresh CLI keeps the printing, publishes review status and reconciles summaries', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grookai-prize-scope-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const baseline = path.join(root, 'baseline');
  const candidate = path.join(root, 'candidate');
  const card = { set_key: 'sv02', set_name: 'Paldea Evolved', card_number: '71', card_name: 'Luxray' };
  const payloads = {
    'english_master_index_sets_v1.json': { sets: [{ key: 'sv02', set_name: 'Paldea Evolved' }] },
    'english_master_index_cards_v1.json': { cards: [card] },
    'english_master_index_printings_v1.json': { printings: [cached], finish_absences: [] },
    'english_master_index_conflicts_v1.json': { conflicts: [] },
    'english_master_index_set_alias_normalization_v1.json': { remaps: [] },
    'english_master_index_manual_review_v1.json': { manual_review: [] },
    'english_master_index_v1.json': { summary: { printings_by_status: { master_verified: 1 }, manual_review: 0 } },
  };
  for (const dir of [baseline, candidate]) {
    await fs.mkdir(dir);
    for (const file of MASTER_INDEX_AUTHORITY_FILES) {
      const body = file.endsWith('.json') ? JSON.stringify(payloads[file] ?? {})
        : '| manual review | 0 |\n\n## Printings By Status\n\n| status | count |\n| --- | --- |\n| master_verified | 1 |\n\n## Source Evidence Rows\n';
      await fs.writeFile(path.join(dir, file), body);
    }
  }
  const script = fileURLToPath(new URL('../../scripts/workers/english_pokemon_master_index_refresh_v1.mjs', import.meta.url));
  const run = out => JSON.parse(execFileSync(process.execPath, [script, '--mode=apply-to-worktree',
    `--baseline-dir=${baseline}`, `--candidate-dir=${candidate}`, `--out-dir=${path.join(root, out)}`,
  ], { encoding: 'utf8', timeout: 15000 }));
  const plan = run('first');
  assert.equal(plan.counts.variant_scope_review_printings, 1);
  assert.equal(plan.counts.candidate_printings, 1);
  assert.equal(plan.boundaries.database_writes, false);
  const read = async file => JSON.parse(await fs.readFile(path.join(baseline, file), 'utf8'));
  const saved = await read('english_master_index_printings_v1.json');
  assert.equal(saved.printings[0].status, 'needs_manual_review');
  assert.equal(saved.printings[0].key, cached.key);
  assert.deepEqual(saved.printings[0].source_evidence, cached.source_evidence);
  assert.deepEqual((await read('english_master_index_v1.json')).summary.printings_by_status, { needs_manual_review: 1 });
  const review = await read('english_master_index_manual_review_v1.json');
  assert.equal(review.manual_review.length, 1);
  assert.equal(review.manual_review[0].evidence_urls.length, 2);
  assert.match(await fs.readFile(path.join(baseline, 'english_master_index_v1.md'), 'utf8'), /needs_manual_review \| 1/);
  assert.equal(run('second').changed, false);
});
