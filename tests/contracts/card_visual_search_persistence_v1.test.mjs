import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/20260729173000_card_visual_search_persistence_v1.sql",
    import.meta.url,
  ),
  "utf8",
);
const contract = readFileSync(
  new URL(
    "../../docs/contracts/CARD_VISUAL_SEARCH_PERSISTENCE_V1.md",
    import.meta.url,
  ),
  "utf8",
);

const tables = [
  "card_visual_search_releases",
  "card_visual_search_artworks",
  "card_visual_search_printings",
  "card_visual_search_documents",
  "card_visual_search_evidence",
  "card_visual_search_index_entries",
  "card_visual_search_active_release",
];

test("persistence migration creates the complete release-scoped projection", () => {
  for (const table of tables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(
      migration,
      new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`),
    );
    assert.match(
      migration,
      new RegExp(`grant all on table public\\.${table} to service_role`),
    );
  }
});

test("migration does not load or activate a release", () => {
  assert.doesNotMatch(
    migration,
    /insert\s+into\s+public\.card_visual_search_/iu,
  );
  assert.doesNotMatch(
    migration,
    /update\s+public\.card_visual_search_/iu,
  );
  assert.match(contract, /migration inserts no pointer row/iu);
});

test("validated projection rows become immutable", () => {
  assert.match(
    migration,
    /guard_card_visual_search_release_rows_v1[\s\S]+status not in \('staged', 'loaded'\)/iu,
  );
  for (const table of [
    "artworks",
    "printings",
    "documents",
    "evidence",
    "index_entries",
  ]) {
    assert.match(
      migration,
      new RegExp(`trg_card_visual_search_${table}_release_guard`, "iu"),
    );
  }
});

test("visual search RPCs remain service-only", () => {
  for (const signature of [
    "get_card_visual_search_candidates_service_v1",
    "get_card_visual_search_groups_service_v1",
  ]) {
    assert.match(migration, new RegExp(`security definer[\\s\\S]+${signature}|${signature}[\\s\\S]+security definer`, "iu"));
    assert.match(
      migration,
      new RegExp(`revoke all on function public\\.${signature}[\\s\\S]+from public, anon, authenticated`, "iu"),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function public\\.${signature}[\\s\\S]+to service_role`, "iu"),
    );
  }
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.get_card_visual_search_[^(]+\([^;]+to (?:anon|authenticated)/iu,
  );
});

test("persistence V1 deliberately excludes vector and embedding storage", () => {
  assert.doesNotMatch(migration, /\bvector\s*\(|\bembedding\b|\bhnsw\b|\bivfflat\b/iu);
  assert.match(contract, /creates no embedding\s+column or vector index/iu);
});

test("candidate RPC is a prefilter and final ranking remains governed JavaScript", () => {
  assert.match(contract, /service-only exact candidate prefilter/iu);
  assert.match(contract, /governed JavaScript ranker/iu);
  assert.match(contract, /does not claim final relevance/iu);
});
