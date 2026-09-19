import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_RESOLUTION_VERSION } from '../../scripts/audits/japanese_master_index_v4/candidate_resolution_v1.mjs';
import { FINAL_ADMISSION_VERSION } from '../../scripts/audits/japanese_master_index_v4/final_admission_v1.mjs';
import { LIVE_RECONCILIATION_VERSION } from '../../scripts/audits/japanese_master_index_v4/live_reconciliation_v1.mjs';
import { OFFICIAL_JP_CARD_PARSER_VERSION } from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/official_jp_v1.mjs';
import { LIMITLESS_JP_CARD_PARSER_VERSION } from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/limitless_jp_v1.mjs';
import { TCGDEX_JA_CARD_PARSER_VERSION } from '../../scripts/audits/japanese_master_index_v4/card_source_adapters/tcgdex_ja_v1.mjs';

test('repaired derivations are distinguishable from historical V1 artifacts', () => {
  assert.equal(CANDIDATE_RESOLUTION_VERSION, 'JPN-MASTER-INDEX-CANDIDATE-RESOLUTION-V2');
  assert.equal(FINAL_ADMISSION_VERSION, 'JPN-MASTER-INDEX-FINAL-ADMISSION-V2');
  assert.equal(LIVE_RECONCILIATION_VERSION, 'JPN-MASTER-INDEX-LIVE-RECONCILIATION-V2');
  assert.equal(OFFICIAL_JP_CARD_PARSER_VERSION, 'JPN-MASTER-INDEX-OFFICIAL-JP-CARD-PARSER-V3');
  assert.equal(LIMITLESS_JP_CARD_PARSER_VERSION, 'JPN-MASTER-INDEX-LIMITLESS-JP-CARD-PARSER-V3');
  assert.equal(TCGDEX_JA_CARD_PARSER_VERSION, 'JPN-MASTER-INDEX-TCGDEX-JA-CARD-PARSER-V2');
});
