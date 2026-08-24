import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const installer = readFileSync(
  new URL("../../deploy/scripts/install-tcgplayer-market-pipeline-release-v2.sh", import.meta.url),
  "utf8",
);

test("pricing release installer deploys an immutable clean commit with timer disabled by default", () => {
  assert.match(installer, /RELEASE_DIR=.*immutable checked-out release/);
  assert.match(installer, /status --porcelain --untracked-files=no/);
  assert.match(installer, /CURRENT_LINK:-\/opt\/grookai_pricing_current/);
  assert.match(installer, /ENABLE_TIMER:-0/);
  assert.match(installer, /node --check .*tcgplayer_market_publication_worker_v1\.mjs/);
  assert.match(installer, /ln -sfn/);
  assert.match(installer, /systemctl disable --now/);
  assert.match(installer, /if \[\[ "\$\{ENABLE_TIMER\}" == "1" \]\]/);
});
