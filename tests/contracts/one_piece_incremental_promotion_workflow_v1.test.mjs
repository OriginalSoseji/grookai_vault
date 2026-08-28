import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationWorkflow = fs.readFileSync(
  new URL("../../.github/workflows/catalog-set-release-boundary.yml", import.meta.url),
  "utf8",
);
const promotionWorkflow = fs.readFileSync(
  new URL("../../.github/workflows/one-piece-incremental-promotion.yml", import.meta.url),
  "utf8",
);

test("set release migration workflow is frozen, singular, and rollback-proven", () => {
  assert.match(migrationWorkflow, /ref: \$\{\{ inputs\.expected_sha \}\}/);
  assert.match(migrationWorkflow, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/);
  assert.match(migrationWorkflow, /git merge-base --is-ancestor "\$EXPECTED_SHA" origin\/main/);
  assert.match(migrationWorkflow, /test "\$pending_count" = "1"/);
  assert.match(migrationWorkflow, /\^grants,t,f,f\$/);
  assert.match(migrationWorkflow, /\^op16_before,t\$/);
  assert.match(migrationWorkflow, /\^op16_hidden,f\$/);
  assert.match(migrationWorkflow, /rollback_absence\.txt/);
});

test("One Piece promotion workflow preserves exact hidden staging and artifacts", () => {
  assert.match(promotionWorkflow, /options:[\s\S]*?- plan[\s\S]*?- dry-run[\s\S]*?- apply/);
  assert.match(promotionWorkflow, /ref: \$\{\{ inputs\.expected_sha \}\}/);
  assert.match(promotionWorkflow, /git merge-base --is-ancestor "\$EXPECTED_SHA" origin\/main/);
  assert.match(promotionWorkflow, /--expected-head-sha="\$EXPECTED_SHA"/);
  assert.match(promotionWorkflow, /set_release_control\?\.release_status !== 'hidden'/);
  assert.match(promotionWorkflow, /actions\/upload-artifact@v4/);
  assert.doesNotMatch(promotionWorkflow, /storage|pricing publication|vault write/i);
});
