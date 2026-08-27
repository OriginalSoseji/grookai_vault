import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { collectHumanFixtureEvidence } from '../../scripts/audits/verified_master_set_index_v1/source_adapters/human_fixtures.mjs';

const SETS = [{ key: 'pl3', tcgdex: null, pokemontcg: null }];

async function withFixtures(fixtures, callback) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'grookai-human-fixtures-'));
  try {
    for (const [name, payload] of Object.entries(fixtures)) {
      await fs.writeFile(path.join(dir, name), `${JSON.stringify(payload, null, 2)}\n`);
    }
    return await callback(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function evidence(overrides = {}) {
  return {
    source_key: 'fixture_source',
    source_kind: 'collector_reference',
    source_url: 'https://example.invalid/card/1',
    set_key: 'pl3',
    card_number: '1',
    card_name: 'Card One',
    evidence_type: 'card_identity',
    evidence_label: 'Card One #1',
    ...overrides,
  };
}

test('human fixture loader accepts wrapped records, wrapped rows, and bare evidence arrays', async () => {
  await withFixtures({
    'records.json': { source_key: 'records', source_kind: 'collector_reference', records: [evidence({ card_number: '1' })] },
    'rows.json': { source_key: 'rows', source_kind: 'collector_reference', rows: [evidence({ card_number: '2' })] },
    'array.json': [evidence({ card_number: '3' })],
  }, async (fixtureDir) => {
    const rows = await collectHumanFixtureEvidence(SETS, { fixtureDir, retrievedAt: '2026-08-27T00:00:00.000Z' });
    assert.deepEqual(rows.map((row) => row.card_number), ['3', '1', '2']);
    assert.equal(rows.every((row) => row.source_url === 'https://example.invalid/card/1'), true);
  });
});

test('empty candidate arrays and review-required records do not become Master Index evidence', async () => {
  await withFixtures({
    'empty-candidates.json': [],
    'review-candidates.json': [evidence({ observation_status: 'crosshatch_alias_review_required' })],
  }, async (fixtureDir) => {
    const rows = await collectHumanFixtureEvidence(SETS, { fixtureDir, retrievedAt: '2026-08-27T00:00:00.000Z' });
    assert.deepEqual(rows, []);
  });
});

test('every accepted fixture row still requires supported source provenance', async () => {
  await withFixtures({
    'missing-url.json': { rows: [evidence({ source_url: null })] },
  }, async (fixtureDir) => {
    await assert.rejects(
      collectHumanFixtureEvidence(SETS, { fixtureDir, retrievedAt: '2026-08-27T00:00:00.000Z' }),
      /evidence row missing source_url/,
    );
  });

  await withFixtures({
    'unsupported-source.json': [evidence({ source_kind: 'model_guess' })],
  }, async (fixtureDir) => {
    await assert.rejects(
      collectHumanFixtureEvidence(SETS, { fixtureDir, retrievedAt: '2026-08-27T00:00:00.000Z' }),
      /unsupported source_kind=model_guess/,
    );
  });
});
