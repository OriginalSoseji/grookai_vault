import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SOURCE = fs.readFileSync(
  new URL(
    "../../scripts/audits/release_security_advisor_views_readback_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("security advisor verifier targets all five live error views", () => {
  for (const view of [
    "v_card_stream_v1",
    "v_wall_cards_v1",
    "v_section_cards_v1",
    "v_card_contact_targets_v1",
    "v_vault_mobile_pricing_targets_v1",
  ]) {
    assert.match(SOURCE, new RegExp(`"${view}"`));
  }
});

test("security advisor verifier is metadata-only and transactionally read-only", () => {
  assert.match(SOURCE, /begin read only/);
  assert.match(SOURCE, /collector_rows_selected:\s*false/);
  assert.match(SOURCE, /database_writes:\s*false/);
  assert.doesNotMatch(SOURCE, /\b(insert|update|delete|truncate)\s+public\./i);
});

test("security advisor verifier checks view mode and definer function search paths", () => {
  assert.match(SOURCE, /security_invoker=true/);
  assert.match(SOURCE, /p\.prosecdef = true/);
  assert.match(SOURCE, /search_path=%/);
  assert.match(SOURCE, /security_definer_function_without_fixed_path_count/);
});
