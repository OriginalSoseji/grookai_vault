import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260728040000_tcgplayer_market_assignment_correction_precedence_v1.sql",
    import.meta.url,
  ),
  "utf8",
);
const repair = readFileSync(
  new URL(
    "../../scripts/audits/tcgplayer_arceus_charizard_mapping_repair_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("candidate view prefers append-only correction assignments", () => {
  assert.match(
    migration,
    /left join lateral \([\s\S]*MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1_1[\s\S]*MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1[\s\S]*limit 1[\s\S]*\) assignment on true/i,
  );
  assert.match(
    migration,
    /when 'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1_1' then 1/i,
  );
  assert.doesNotMatch(migration, /update\s+public\.market_evidence_variant_assignments/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.market_evidence_variant_assignments/i);
});

test("repair is exact, append-only, and never activates pricing", () => {
  assert.match(repair, /const SOURCE_PRODUCT_ID = 84191/);
  assert.match(repair, /const TCGDEX_EXTERNAL_ID = "pl4-1"/);
  assert.match(repair, /source_product_name !== "Charizard"/);
  assert.match(repair, /source_group_name !== "Arceus"/);
  assert.match(repair, /printedNumber !== "1\/99"/);
  assert.match(
    repair,
    /insert into public\.market_evidence_variant_assignments/i,
  );
  assert.match(
    repair,
    /MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1_1/,
  );
  assert.match(repair, /current_publication_activation: false/);
  assert.doesNotMatch(repair, /update public\.market_price_publication_snapshots/i);
  assert.doesNotMatch(repair, /update public\.market_price_qualification_decisions/i);
});
