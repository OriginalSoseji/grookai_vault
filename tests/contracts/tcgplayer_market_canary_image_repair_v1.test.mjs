import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const REPAIR = fs.readFileSync(
  new URL(
    "../../scripts/audits/tcgplayer_market_canary_image_repair_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);

test("canary image repair is exact, pointer-only, and activation-safe", () => {
  assert.match(REPAIR, /GV-PK-CEL-15CC-HERE-COMES-TEAM-ROCKET/);
  assert.match(REPAIR, /product\/250323_in_1000x1000\.jpg/);
  assert.match(REPAIR, /upsert: false/);
  assert.match(REPAIR, /const IMAGE_SOURCE = "identity"/);
  assert.match(REPAIR, /image_source = \$8/);
  assert.match(REPAIR, /where id = \$1[\s\S]*and gv_id = \$2/);
  assert.match(REPAIR, /current_publication_refs/);
  assert.match(REPAIR, /canonical_identity_fields_changed: false/);
  assert.match(REPAIR, /pricing_mapping_writes: false/);
  assert.match(REPAIR, /publication_activation: false/);
  assert.doesNotMatch(REPAIR, /update public\.external_mappings/i);
  assert.doesNotMatch(
    REPAIR,
    /update public\.market_price_publication_snapshots/i,
  );
});
