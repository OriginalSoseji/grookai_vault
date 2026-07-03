import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(repoRoot, ...parts), "utf8");
}

test("trade completion can expose active trade copies beyond the original card conversation", () => {
  const source = readRepoFile("apps", "web", "src", "lib", "network", "getUserCardInteractions.ts");

  assert.match(source, /pendingTradeGroups/);
  assert.match(source, /\.eq\("intent", "trade"\)/);
  assert.match(source, /trade source instance lookup failed/);
  assert.match(source, /buildTradeSourceInstanceLabel/);
  assert.match(source, /group\.ownedSourceInstances = \[\.\.\.group\.ownedSourceInstances, \.\.\.mergedTradeSources\]/);
});

test("trade execution second leg accepts a separate trade-marked source copy", () => {
  const migration = readRepoFile(
    "supabase",
    "migrations",
    "20260703090000_trade_execution_second_leg_any_trade_copy_v1.sql",
  );

  assert.match(migration, /v_is_second_trade_leg boolean := false;/);
  assert.match(migration, /v_is_second_trade_leg := v_execution_type = 'trade' and p_execution_event_id is not null;/);
  assert.match(migration, /if not v_is_second_trade_leg and v_source_instance\.card_print_id <> v_interaction\.card_print_id then/);
  assert.match(migration, /if not v_is_second_trade_leg and v_source_instance\.legacy_vault_item_id <> v_interaction\.vault_item_id then/);
  assert.match(migration, /if v_execution_type = 'trade' and v_source_instance\.intent <> 'trade' then/);
  assert.match(migration, /p_card_printing_id => v_source_instance\.card_printing_id/);
});
