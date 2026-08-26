import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("immutable release retention is plan-only and path allowlisted", () => {
  const script = read("scripts/ops/grookai_immutable_release_retention_v1.sh");
  assert.match(script, /GROOKAI_IMMUTABLE_RELEASE_RETENTION_V1/);
  assert.match(script, /apply=0/);
  assert.match(script, /--apply\) apply=1/);
  assert.match(script, /apply mode must run as root/);
  assert.match(script, /\/opt\/grookai\/releases\/backend/);
  assert.match(script, /\/opt\/grookai\/releases\/mee/);
  assert.match(script, /\/opt\/grookai\/releases\/control-plane/);
  assert.match(script, /\/opt\/grookai\/releases\/market-intelligence/);
  assert.match(script, /candidate escaped the allowlisted roots/);
  assert.match(script, /rm -rf --one-file-system -- "\$source_real"/);
});

test("immutable release retention protects live and rollback releases", () => {
  const script = read("scripts/ops/grookai_immutable_release_retention_v1.sh");
  assert.match(script, /GROOKAI_RELEASE_RETENTION_ACTIVE_FAMILY_KEEP:-2/);
  assert.match(script, /GROOKAI_RELEASE_RETENTION_INACTIVE_FAMILY_KEEP:-1/);
  assert.match(script, /\/opt\/grookai_\*_current/);
  assert.match(script, /\/proc\/\[0-9\]\*\/cwd/);
  assert.match(script, /release_name="\$\{relative%%\/\*\}"/);
  assert.match(script, /newest_family_release/);
  assert.match(script, /candidate became protected before removal/);
  assert.match(script, /git -C "\$source_real" status --porcelain/);
  assert.match(script, /candidate has tracked or untracked changes/);
  assert.match(script, /\.release-sha/);
  assert.match(script, /RELEASE_COMMIT_SHA/);
  assert.match(script, /candidate has no governed release identity/);
  assert.match(script, /candidate release SHA is invalid/);
  assert.match(script, /release directory does not match Git SHA/);
});

test("immutable release retention restores the frozen capacity floor", () => {
  const script = read("scripts/ops/grookai_immutable_release_retention_v1.sh");
  const contract = read("docs/contracts/GROOKAI_IMMUTABLE_RELEASE_RETENTION_V1.md");
  assert.match(script, /GROOKAI_RELEASE_RETENTION_TARGET_FREE_BYTES:-21474836480/);
  assert.match(script, /GROOKAI_RELEASE_RETENTION_MINIMUM_AGE_HOURS:-24/);
  assert.match(script, /eligible releases cannot restore the target free-space floor/);
  assert.match(script, /target free-space floor was not reached/);
  assert.match(script, /status=capacity_restored/);
  assert.match(contract, /No runtime evidence is archived or deleted/);
});
