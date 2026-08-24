import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const archiveScript = readFileSync(
  new URL("../../scripts/ops/mee_legacy_artifact_archive_v1.sh", import.meta.url),
  "utf8",
);
const restoreScript = readFileSync(
  new URL("../../scripts/ops/mee_legacy_artifact_restore_v1.sh", import.meta.url),
  "utf8",
);

test("legacy artifact archive is plan-only unless apply is explicit", () => {
  assert.match(archiveScript, /apply=0/);
  assert.match(archiveScript, /--apply\) apply=1/);
  assert.match(archiveScript, /\[\[ "\$apply" -eq 1 \]\] \|\| exit 0/);
});

test("archive source is restricted to inactive direct-child fetch and backfill artifacts", () => {
  assert.match(archiveScript, /source must be a direct child of the governed legacy root/);
  assert.match(archiveScript, /mee_11l_market_listing_acquisition_daily_batch_fetch_/);
  assert.match(archiveScript, /mee_11m_market_listing_acquisition_daily_batch_backfill_plan_/);
  assert.match(archiveScript, /source may not be a symlink/);
  assert.match(archiveScript, /minimum inactivity window/);
});

test("archive refuses active MEE automation and the active immutable release", () => {
  assert.match(archiveScript, /MEE timer must be disabled/);
  assert.match(archiveScript, /MEE timer must be inactive/);
  assert.match(archiveScript, /MEE service must be inactive/);
  assert.match(archiveScript, /a manual MEE worker is active/);
  assert.match(archiveScript, /source is inside the active immutable release/);
});

test("source removal occurs only after file hashing, compression test, and archive comparison", () => {
  const manifest = archiveScript.indexOf("find . -xdev -type f -print0");
  const zstdTest = archiveScript.indexOf("zstd --test --quiet");
  const tarCompare = archiveScript.indexOf("tar --zstd --compare");
  const finalHashCheck = archiveScript.indexOf("sha256sum --check --status");
  const remove = archiveScript.indexOf("rm -rf --one-file-system");

  assert.ok(manifest >= 0);
  assert.ok(zstdTest > manifest);
  assert.ok(tarCompare > zstdTest);
  assert.ok(finalHashCheck > tarCompare);
  assert.ok(remove > finalHashCheck);
  assert.match(archiveScript, /final source deletion guard rejected path/);
});

test("archive metadata preserves integrity and restore provenance", () => {
  assert.match(archiveScript, /source_manifest_sha256/);
  assert.match(archiveScript, /archive_sha256/);
  assert.match(archiveScript, /zstd_test/);
  assert.match(archiveScript, /tar_compare/);
  assert.match(archiveScript, /source_removal_status.*authorized_pending/);
  assert.match(archiveScript, /source_removal_status.*completed_verified/);
  assert.match(archiveScript, /restore_command/);
});

test("restore is plan-only, path-safe, and verifies restored file hashes", () => {
  assert.match(restoreScript, /apply=0/);
  assert.match(restoreScript, /archive contains an unsafe path/);
  assert.match(restoreScript, /restore target already exists/);
  assert.match(restoreScript, /zstd --test --quiet/);
  assert.match(restoreScript, /archive_entries="\$\(tar --zstd --list/);
  assert.doesNotMatch(restoreScript, /tar --zstd --list[^\n]*\|\s*head/);
  assert.match(restoreScript, /sha256sum --check --status/);
  assert.match(restoreScript, /status=restored_and_manifest_verified/);
});
