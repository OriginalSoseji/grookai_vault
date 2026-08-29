import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

const migration = source(
  "supabase/migrations/20260829173500_anonymous_search_price_redaction_v1.sql",
);
const probe = source(".github/workflows/prod-probe.yml");

test("anonymous catalog search redacts both legacy price fields", () => {
  assert.match(migration, /auth\.role\(\) in \('authenticated', 'service_role'\)/i);
  assert.match(migration, /else null::integer\s+end as latest_price_cents/i);
  assert.match(migration, /else null::numeric\s+end as latest_price/i);
});

test("catalog search remains available without widening pricing authority", () => {
  assert.match(migration, /security_invoker\s*=\s*true/i);
  assert.match(
    migration,
    /grant select on table public\.v_card_search to anon, authenticated/i,
  );
  assert.doesNotMatch(migration, /grant\s+select[\s\S]*latest_card_prices_v[\s\S]*to\s+anon/i);
  assert.doesNotMatch(migration, /grant\s+execute[\s\S]*get_market_pricing[\s\S]*to\s+anon/i);
});

test("production probe fails if anonymous search pricing regresses", () => {
  assert.match(
    probe,
    /all\(\.\[\]; \.latest_price_cents == null and \.latest_price == null\)/,
  );
  assert.match(probe, /exposed legacy pricing to an anonymous caller/);
});
