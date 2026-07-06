import assert from "node:assert/strict";
import test from "node:test";

import {
  ROLLUP_VERSION,
} from "../../scripts/audits/market_reference_signal_rollup_refresh_plan_v1.mjs";

test("MEE-09M uses a distinct versioned rollup lane for post-second-source refresh", () => {
  assert.equal(
    ROLLUP_VERSION,
    "MEE_09M_INTERNAL_REFERENCE_SIGNAL_ROLLUPS_AFTER_POKEMONTCG_SECOND_SOURCE_V1",
  );
  assert.match(ROLLUP_VERSION, /AFTER_POKEMONTCG_SECOND_SOURCE/);
});
