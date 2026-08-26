import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (...segments) => readFileSync(path.join(ROOT, ...segments), "utf8");
const stripComments = (sql) => sql.replace(/--.*$/gm, "");

const migration = stripComments(read(
  "supabase",
  "migrations",
  "20260826053000_retire_mee_public_pricing_compatibility_v1.sql",
));
const canonicalSql = stripComments(read(
  "docs",
  "sql",
  "retire_mee_public_pricing_compatibility_v1.sql",
));
const readback = stripComments(read(
  "docs",
  "sql",
  "retire_mee_public_pricing_compatibility_v1_readback.sql",
));
const contract = read(
  "docs",
  "contracts",
  "MEE_PUBLIC_PRICING_COMPATIBILITY_RETIREMENT_V1.md",
);
const contractIndex = read("docs", "contracts", "PRICING_CONTRACT_INDEX.md");
const writer = read(
  "scripts",
  "audits",
  "mee_public_pricing_compatibility_retirement_v1.mjs",
);

test("obsolete public pricing compatibility surface is an empty typed view", () => {
  for (const sql of [migration, canonicalSql]) {
    assert.match(sql, /create\s+or\s+replace\s+view\s+public\.v_card_pricing_ui_v1/i);
    assert.match(sql, /with\s*\(security_invoker\s*=\s*true\)/i);
    assert.match(sql, /null::uuid\s+as\s+card_print_id/i);
    assert.match(sql, /null::numeric\(12,2\)\s+as\s+primary_price/i);
    assert.match(sql, /null::numeric\s+as\s+grookai_value/i);
    assert.match(sql, /where\s+false/i);
    assert.doesNotMatch(sql, /from\s+public\./i);
  }
});

test("obsolete compatibility surface is denied to app roles", () => {
  assert.match(
    migration,
    /revoke\s+all\s+on\s+public\.v_card_pricing_ui_v1\s+from\s+public,\s*anon,\s*authenticated,\s*service_role/i,
  );
  assert.match(
    migration,
    /grant\s+select\s+on\s+public\.v_card_pricing_ui_v1\s+to\s+service_role/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+select\s+on\s+public\.v_card_pricing_ui_v1\s+to\s+(?:anon|authenticated)/i,
  );
});

test("retirement cannot mutate governed data", () => {
  for (const sql of [migration, canonicalSql]) {
    assert.doesNotMatch(sql, /\binsert\s+into\b/i);
    assert.doesNotMatch(sql, /\bupdate\s+public\./i);
    assert.doesNotMatch(sql, /\bdelete\s+from\b/i);
    assert.doesNotMatch(sql, /\btruncate\b/i);
    assert.doesNotMatch(sql, /\bmerge\s+into\b/i);
    assert.doesNotMatch(sql, /market_evidence/i);
    assert.doesNotMatch(sql, /ebay_active_prices/i);
    assert.doesNotMatch(sql, /market_price_publication/i);
  }
});

test("readback proves zero rows, no legacy sources, and governed RPC access", () => {
  assert.match(readback, /row_count/);
  assert.match(readback, /no_market_evidence_reference/);
  assert.match(readback, /no_ebay_active_price_reference/);
  assert.match(readback, /no_market_publication_reference/);
  assert.match(readback, /app_roles_denied/);
  assert.match(readback, /authenticated_market_rpc_execute/);
  assert.match(readback, /service_market_rpc_execute/);
});

test("retirement contract freezes TCGPlayer authority and no-write boundaries", () => {
  assert.match(contract, /\*\*Status: ACTIVE\*\*/);
  assert.match(contract, /get_market_pricing_read_model_v1/);
  assert.match(contract, /returns zero rows/);
  assert.match(contract, /No canonical identity, Vault, pricing observation, publication, or MEE row/i);
  assert.match(contractIndex, /MEE_PUBLIC_PRICING_COMPATIBILITY_RETIREMENT_V1\.md/);
});

test("guarded writer freezes order, atomicity, protected counts, and readback", () => {
  assert.match(writer, /EXPECTED_PREVIOUS_VERSION\s*=\s*"20260824174500"/);
  assert.match(writer, /pg_advisory_xact_lock/);
  assert.match(writer, /insert into supabase_migrations\.schema_migrations/i);
  assert.match(writer, /market_evidence_observations/);
  assert.match(writer, /market_price_publication_snapshots/);
  assert.match(writer, /protected_row_counts_changed/);
  assert.match(writer, /mode === "apply" \? "commit" : "rollback"/);
  assert.match(writer, /expected-migration-sha256/);
});
