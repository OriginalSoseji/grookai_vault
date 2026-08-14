import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AUDIT_VERSION,
  buildMtgClientSearchReadinessV1,
  validateMtgClientReadinessFixtureV1
} from "../../scripts/audits/mtg_client_search_readiness_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const fixture = JSON.parse(read("tests/fixtures/mtg_client_search_readiness_v1.json"));
const sources = {
  frozen_contract: read("docs/contracts/MTG_CANONICAL_CATALOG_IMPORT_CONTRACT_V1.md"),
  frozen_canary_payload: read("docs/audits/pricing/mtg_canonical_catalog_canary_plan_v1/dsk/writer_payload.json"),
  visibility_boundary: read("supabase/migrations/20260813200000_mtg_catalog_app_visibility_boundary_v1.sql"),
  web_types: read("apps/web/src/types/cards.ts"),
  web_search: read("apps/web/src/lib/publicSearchResolver.ts"),
  web_search_intent: read("apps/web/src/lib/search/smartSearchIntent.ts"),
  web_explore: read("apps/web/src/lib/explore/getExploreRows.ts"),
  web_card_detail: read("apps/web/src/lib/getPublicCardByGvId.ts"),
  web_card_page: read("apps/web/src/app/card/[gv_id]/page.tsx"),
  web_sets: read("apps/web/src/lib/publicSets.ts"),
  web_set_types: read("apps/web/src/lib/publicSets.shared.ts"),
  web_set_grid: read("apps/web/src/components/PublicSetCardGrid.tsx"),
  web_language: read("apps/web/src/lib/publicLanguageScope.ts"),
  web_finish: read("apps/web/src/lib/cards/displayDiscriminator.ts"),
  flutter_model: read("lib/models/card_print.dart"),
  flutter_search_identity: read("lib/services/identity/identity_search.dart"),
  flutter_card_detail: read("lib/card_detail_screen.dart"),
  flutter_sets: read("lib/services/public/public_sets_service.dart"),
  flutter_set_grid: read("lib/screens/sets/public_set_detail_screen.dart"),
  flutter_finish: read("lib/services/identity/display_identity.dart"),
  fixture: JSON.stringify(fixture)
};

test("offline fixture covers MTG identity, finishes, multiface cards, and hidden release", () => {
  const result = validateMtgClientReadinessFixtureV1(fixture);
  assert.deepEqual(result, { ok: true, issues: [] });
});

test("auditor inspects all eight required web and Flutter surfaces", () => {
  const result = buildMtgClientSearchReadinessV1(sources, fixture);
  assert.equal(result.audit_version, AUDIT_VERSION);
  assert.equal(result.summary.surface_count, 8);
  assert.ok(result.summary.capability_check_count >= 60);
  assert.equal(result.boundaries.database_access, false);
  assert.equal(result.boundaries.deployment, false);
});

test("hidden MTG rows remain protected for every client surface", () => {
  const result = buildMtgClientSearchReadinessV1(sources, fixture);
  for (const surface of result.surfaces) {
    assert.equal(surface.capabilities.hidden_release.status, "ready", surface.id);
  }
  assert.equal(
    result.release_blockers.find((gate) => gate.id === "hidden_release_boundary")?.status,
    "ready"
  );
});

test("normal, foil, and etched vocabulary is explicit in both clients", () => {
  for (const source of [sources.web_finish, sources.flutter_finish, sources.flutter_sets]) {
    assert.match(source, /normal/i);
    assert.match(source, /foil/i);
    assert.match(source, /etched/i);
  }
  assert.match(sources.web_search_intent, /key: "foil"/);
  assert.match(sources.web_search_intent, /key: "etched"/);
});

test("auditor fails closed on current game, multiface, collector, and language gaps", () => {
  const result = buildMtgClientSearchReadinessV1(sources, fixture);
  assert.equal(result.status, "blocked_before_mtg_client_release");
  assert.deepEqual(
    result.release_blockers.filter((gate) => gate.status === "blocked").map((gate) => gate.id),
    [
      "game_scoped_client_read_model",
      "multiface_identity_and_image_model",
      "exact_mtg_collector_number_search",
      "explicit_language_contract"
    ]
  );
});

test("frozen payload does not pretend combined multiface names are structured faces", () => {
  const payload = JSON.parse(sources.frozen_canary_payload);
  assert.ok(payload.rows.card_prints.some((row) => row.name.includes(" // ")));
  assert.ok(payload.rows.card_print_identity.some((row) => row.identity_payload.layout !== "normal"));
  assert.ok(payload.rows.card_print_identity.every((row) => row.identity_payload.card_faces === undefined));
});
