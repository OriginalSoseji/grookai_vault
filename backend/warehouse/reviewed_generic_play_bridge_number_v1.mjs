import assert from 'node:assert/strict';
import {
  GENERIC_PLAY_STAMP_IDENTITY_RULE_V2,
  genericPlayStampEvidenceRegistryV2,
  verifyGenericPlayStampSourceBytesV2,
} from '../identity/generic_play_stamp_identity_evidence_v2.mjs';

const registry = genericPlayStampEvidenceRegistryV2();
const targets = new Map(registry.targets.map(target => [String(target.product_id), target]));

// Number correction for review-only warehouse intake, not identity admission.
// Preserve the original external row and its contradictory source snapshot.
export function reviewedGenericPlayBridgeNumberV1(row, entry) {
  if (entry?.governing_rule_source !== GENERIC_PLAY_STAMP_IDENTITY_RULE_V2) return null;
  verifyGenericPlayStampSourceBytesV2();
  const target = targets.get(String(row?.tcgplayer_id ?? '').trim());
  assert.ok(target, 'generic_play_reviewed_number_product_out_of_scope');
  assert.equal(entry.proposed_variant_key, 'play_pokemon_stamp', 'generic_play_reviewed_number_variant_changed');
  assert.equal(entry.name, target.base.name, 'generic_play_reviewed_number_name_changed');
  assert.equal(entry.effective_routed_set_code, target.base.set_code, 'generic_play_reviewed_number_set_changed');
  assert.equal(entry.printed_number, target.printed_number, 'generic_play_reviewed_printed_number_changed');
  const [numberLeft, printedTotal] = target.printed_number.split('/');
  const numberPlain = String(Number(numberLeft));
  assert.equal(String(entry.number_plain), numberPlain, 'generic_play_reviewed_number_plain_changed');
  return { printedNumber: target.printed_number, numberPlain, numberLeft, printedTotal };
}
