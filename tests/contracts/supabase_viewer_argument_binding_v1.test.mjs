import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260731211500_security_advisor_viewer_argument_binding_v1.sql",
  "utf8",
);
const interactionHelper = fs.readFileSync(
  "apps/web/src/lib/network/insertCardInteraction.ts",
  "utf8",
);

const viewerBoundFunctions = [
  "interest_graph_collectors_visible_to_viewer_v1",
  "interest_graph_card_event_visible_to_viewer_v1",
  "local_community_collector_visible_to_viewer_v1",
  "binder_card_event_visible_to_viewer_v1",
];

test("viewer-aware privacy helpers bind authenticated calls to auth.uid", () => {
  for (const functionName of viewerBoundFunctions) {
    const start = migration.indexOf(`function public.${functionName}(`);
    assert.notEqual(start, -1, `${functionName} must be redefined`);
    const body = migration.slice(start, migration.indexOf("$$;", start));
    assert.match(body, /auth\.uid\(\) is not null/i);
    assert.match(body, /p_viewer_user_id is distinct from auth\.uid\(\)/i);
    assert.match(body, /return false/i);
  }
});

test("event actor and trust-pair mismatches fail closed", () => {
  assert.match(
    migration,
    /p_actor_user_id is distinct from auth\.uid\(\)[\s\S]*?return 'private'/i,
  );
  assert.match(
    migration,
    /auth\.uid\(\) is distinct from p_user_id[\s\S]*?auth\.uid\(\) is distinct from p_other_user_id[\s\S]*?then true/i,
  );
});

test("web trust check prefers the current-viewer wrapper and remains transition-safe", () => {
  const wrapper = interactionHelper.indexOf("trust_block_exists_for_current_viewer_v1");
  const fallback = interactionHelper.indexOf("trust_block_exists_between_v1");
  assert.ok(wrapper >= 0, "current-viewer wrapper must be used");
  assert.ok(fallback > wrapper, "legacy call may exist only as a post-wrapper transition fallback");
  assert.match(interactionHelper, /if \(!currentViewerResult\.error\)/);
  assert.match(interactionHelper, /return error \? true : data !== false/);
});

test("migration preserves service-owned execution and fixed search paths", () => {
  assert.doesNotMatch(migration, /revoke\s+execute[\s\S]*service_role/i);
  assert.equal(
    (migration.match(/security definer/gi) ?? []).length,
    viewerBoundFunctions.length + 2,
  );
  assert.equal(
    (migration.match(/set search_path = public/gi) ?? []).length,
    viewerBoundFunctions.length + 2,
  );
});
