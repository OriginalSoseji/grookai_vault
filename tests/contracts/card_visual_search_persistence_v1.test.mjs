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
  "card_visual_external_sources",
  "card_visual_evidence_candidates",
  "card_visual_evidence_reviews",
  "card_visual_evidence_assertions",
  "card_visual_search_corrections",
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
    /insert\s+into\s+public\.card_visual_search_active_release/iu,
  );
  assert.doesNotMatch(
    migration,
    /insert\s+into\s+public\.card_visual_search_releases/iu,
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
  assert.match(
    migration,
    /trg_card_visual_evidence_assertions_release_guard/iu,
  );
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

test("candidate, review, and assertion authority boundaries remain explicit", () => {
  assert.match(
    migration,
    /card_visual_external_sources_network_guard[\s\S]+written_permission[\s\S]+terms_snapshot_sha256/iu,
  );
  assert.match(
    migration,
    /source_registry_id uuid not null references public\.card_visual_external_sources/iu,
  );
  assert.match(migration, /external_exact_candidate/iu);
  assert.match(migration, /curated_association_unresolved/iu);
  assert.match(migration, /visual_resemblance_reference/iu);
  assert.match(migration, /representation_cameo/iu);
  assert.match(
    migration,
    /card_visual_evidence_assertions_authority_check[\s\S]+observation_backed[\s\S]+human_image_confirmed[\s\S]+external_role_confirmed/iu,
  );
  assert.doesNotMatch(
    migration.match(/card_visual_evidence_assertions_authority_check[\s\S]+?\)\),/iu)?.[0] ?? "",
    /external_exact_candidate/iu,
  );
  assert.match(contract, /exact candidate is not search authority/iu);
  assert.match(contract, /Draft decisions do not change active search/iu);
  assert.match(
    migration,
    /supporting_external_evidence_ids text\[\] not null default '\{\}'::text\[\]/iu,
  );
  assert.match(
    migration,
    /get_card_visual_search_groups_service_v1[\s\S]+evidence_assertions jsonb[\s\S]+from public\.card_visual_evidence_assertions/iu,
  );
});

test("authenticated corrections only write review staging", () => {
  assert.match(
    migration,
    /create or replace function public\.submit_card_visual_search_correction_v2[\s\S]+auth\.uid\(\)[\s\S]+insert into public\.card_visual_search_corrections/iu,
  );
  assert.match(
    migration,
    /grant execute on function public\.submit_card_visual_search_correction_v2[\s\S]+to authenticated, service_role/iu,
  );
  assert.doesNotMatch(
    migration.match(/create or replace function public\.submit_card_visual_search_correction_v2[\s\S]+?\$\$;/iu)?.[0] ?? "",
    /card_visual_search_(?:active_release|documents|evidence|index_entries)|card_visual_evidence_assertions/iu,
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
