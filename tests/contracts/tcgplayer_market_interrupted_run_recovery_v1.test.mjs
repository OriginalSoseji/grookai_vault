import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const SCRIPT = fs.readFileSync(
  new URL(
    "../../scripts/ops/tcgplayer_market_interrupted_run_recovery_v1.mjs",
    import.meta.url,
  ),
  "utf8",
);
const SERVICE = fs.readFileSync(
  new URL(
    "../../deploy/systemd/grookai-tcgplayer-market-pipeline.service",
    import.meta.url,
  ),
  "utf8",
);

test("interrupted pricing recovery is dry-run by default and fingerprint gated", () => {
  assert.match(SCRIPT, /let apply = false/);
  assert.match(SCRIPT, /--apply requires --expected-plan-fingerprint/);
  assert.match(SCRIPT, /recovery plan fingerprint changed/);
  assert.match(SCRIPT, /for update/);
  assert.match(SCRIPT, /pg_advisory_xact_lock/);
});

test("interrupted pricing recovery appends phase evidence without destructive SQL", () => {
  assert.match(SCRIPT, /insert into public\.market_price_pipeline_phase_attempts/);
  assert.match(SCRIPT, /state = 'failed'/);
  assert.doesNotMatch(SCRIPT, /delete\s+from/i);
  assert.doesNotMatch(SCRIPT, /truncate/i);
  assert.doesNotMatch(SCRIPT, /update public\.market_price_pipeline_phase_attempts/i);
});

test("pricing systemd worker uses a durable protected runtime lock", () => {
  assert.match(SERVICE, /ExecStartPre=.*touch \/run\/lock\/grookai-tcgplayer-market-pipeline\.lock/);
  assert.match(SERVICE, /ExecStart=.*flock -n \/run\/lock\/grookai-tcgplayer-market-pipeline\.lock/);
  assert.doesNotMatch(SERVICE, /\/tmp\/grookai-tcgplayer-market-pipeline\.lock/);
});
