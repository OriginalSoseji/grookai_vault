import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  new URL(
    "../../.github/workflows/tcgplayer-market-full-rollout-observation.yml",
    import.meta.url,
  ),
  "utf8",
);

test("full rollout observer uses immutable read-only evidence", () => {
  assert.match(workflow, /permissions:\s+contents: read/);
  assert.doesNotMatch(workflow, /contents: write|id-token: write/);
  assert.match(
    workflow,
    /OBSERVER_SOURCE_SHA: "364a4ba968548f0c4535bb5ca4370f78b828b2a5"/,
  );
  assert.match(workflow, /Verify frozen evidence hashes/);
  assert.match(workflow, /--expected-coverage-commit-sha=/);
  assert.match(workflow, /--expected-performance-commit-sha=/);
  assert.match(workflow, /--required-cycles=7/);
  assert.doesNotMatch(
    workflow,
    /pricing:market:(?:pipeline|publication)|--apply|publication_activation/,
  );
});

test("full rollout observer requires the final pass only after the frozen window", () => {
  assert.match(workflow, /FULL_REQUIRED_END: "2026-09-02T09:45:00\.000Z"/);
  assert.match(workflow, /if \(\( now_epoch >= required_end_epoch \)\)/);
  assert.match(workflow, /require_pass=\(--require-pass\)/);
  assert.match(workflow, /FINAL_OBSERVATION_DEADLINE/);
});
