import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sourcePath = path.join(process.cwd(), "scripts", "audits",
  "tcgplayer_professor_program_printing_readiness_real_apply_v1.mjs");

test("Professor Program printing-readiness apply is locked to exact approval and production target", async () => {
  const source = await fs.readFile(sourcePath, "utf8");
  assert.match(source, /GROOKAI_APPROVED_PACKAGE_FINGERPRINT/);
  assert.match(source, /GROOKAI_APPROVED_SOURCE_COMMIT/);
  assert.match(source, /GROOKAI_PRODUCTION_APPROVAL/);
  assert.match(source, /git\("rev-parse", "HEAD"\)/);
  assert.match(source, /git\("status", "--porcelain"\)/);
  assert.match(source, /assertPrintingDatabaseTarget\(process\.env\.SUPABASE_DB_URL\)/);
  assert.match(source, /begin isolation level serializable/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /await client\.query\("commit"\)/);
  assert.match(source, /begin isolation level repeatable read read only/);
});

test("Professor Program printing-readiness apply has only the approved durable write shapes", async () => {
  const source = await fs.readFile(sourcePath, "utf8");
  assert.equal((source.match(/update public\.card_printings/g) ?? []).length, 1);
  assert.equal((source.match(/insert into public\.card_printing_truth_reviews/g) ?? []).length, 1);
  assert.doesNotMatch(source, /insert\s+into\s+public\.external_mappings/i);
  assert.doesNotMatch(source, /update\s+public\.external_mappings/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.market_price/i);
  assert.doesNotMatch(source, /update\s+public\.card_prints\b/i);
  assert.doesNotMatch(source, /insert\s+into\s+public\.card_print_identity/i);
  assert.doesNotMatch(source, /\bdelete\s+from\b/i);
  assert.doesNotMatch(source, /\btruncate\b/i);
  assert.match(source, /assert\.equal\(updateCount, 3/);
  assert.match(source, /assert\.equal\(insertCount, 7/);
});
