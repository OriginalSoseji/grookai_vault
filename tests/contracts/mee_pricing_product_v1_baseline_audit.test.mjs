import assert from "node:assert/strict";
import test from "node:test";

import {
  parseMigrationList,
  parseWorktreePorcelain,
  summarizeStatus,
} from "../../scripts/audits/mee_pricing_product_v1_baseline_audit.mjs";

test("baseline audit parses aligned and one-sided migration rows", () => {
  const parsed = parseMigrationList(`
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20260723104000 | 20260723104000 | 2026-07-23 10:40:00
   20260727120000 |                | 2026-07-27 12:00:00
                  | 20260728120000 | 2026-07-28 12:00:00
  `);
  assert.deepEqual(parsed.aligned, ["20260723104000"]);
  assert.deepEqual(parsed.local_only, ["20260727120000"]);
  assert.deepEqual(parsed.remote_only, ["20260728120000"]);
});

test("baseline audit parses branch and detached worktrees", () => {
  const parsed = parseWorktreePorcelain(`
worktree C:/grookai_vault
HEAD 1111111111111111111111111111111111111111
branch refs/heads/pricing/full-tcgcsv-warehouse

worktree C:/grookai_vault_detached
HEAD 2222222222222222222222222222222222222222
detached
  `);
  assert.deepEqual(parsed, [
    {
      path: "C:/grookai_vault",
      head: "1111111111111111111111111111111111111111",
      branch: "pricing/full-tcgcsv-warehouse",
    },
    {
      path: "C:/grookai_vault_detached",
      head: "2222222222222222222222222222222222222222",
      detached: true,
    },
  ]);
});

test("baseline audit reports tracked and untracked status separately", () => {
  assert.deepEqual(summarizeStatus(" M tracked.sql\n?? local.txt"), {
    clean: false,
    changed_paths: 2,
    tracked_paths: 1,
    untracked_paths: 1,
    status_lines: [" M tracked.sql", "?? local.txt"],
  });
  assert.deepEqual(summarizeStatus(""), {
    clean: true,
    changed_paths: 0,
    tracked_paths: 0,
    untracked_paths: 0,
    status_lines: [],
  });
});
