import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/20260811170000_collector_memory_public_pulse_v1.sql";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("collector Memories remain private until their owner explicitly publishes", () => {
  const sql = read(migrationPath);

  assert.match(sql, /add column if not exists is_public boolean not null default false/i);
  assert.match(sql, /collector_memories_publication_state_check/i);
  assert.match(sql, /is_public is false\s+and published_at is null\s+and publication_event_id is null/i);
  assert.match(sql, /create or replace function public\.collector_memory_set_public_v1/i);
  assert.match(sql, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(sql, /and user_id = v_user_id\s+and archived_at is null\s+for update/i);
  assert.match(sql, /interest_graph_collector_public_v1\(v_user_id\)/i);
  assert.match(sql, /vault_item_instances[\s\S]*and card_print_id is not null/i);
  assert.match(sql, /grant execute on function public\.collector_memory_set_public_v1\(uuid, boolean\)\s+to authenticated/i);
  assert.doesNotMatch(sql, /grant execute on function public\.collector_memory_set_public_v1\(uuid, boolean\)\s+to anon/i);
});

test("Memory publication creates append-only current-version Pulse evidence", () => {
  const sql = read(migrationPath);

  assert.match(sql, /insert into public\.card_events/i);
  assert.match(sql, /'collector_memory_published'/i);
  assert.match(sql, /'publication_version', v_next_version/i);
  assert.match(sql, /publication_event_id = v_event_id/i);
  assert.match(sql, /cm\.publication_event_id = e\.id/i);
  assert.match(sql, /e\.payload ->> 'publication_version'\) = cm\.publication_version::text/i);
  assert.doesNotMatch(sql, /delete from public\.card_events/i);
  assert.doesNotMatch(sql, /update public\.card_events/i);
});

test("unpublish and archive immediately invalidate current Pulse visibility", () => {
  const sql = read(migrationPath);

  assert.match(sql, /is_public = false,\s+published_at = null,\s+publication_event_id = null/i);
  assert.match(sql, /collector_memory_archive_v1/i);
  assert.match(sql, /archived_at = coalesce\(archived_at, now\(\)\)/i);
  assert.match(sql, /cm\.is_public is true\s+and cm\.archived_at is null/i);
  assert.match(sql, /vii\.archived_at is null/i);
});

test("published Memory photos stay private and require current governed evidence", () => {
  const sql = read(migrationPath);

  assert.match(sql, /create policy collector_memory_images_published_select_v1/i);
  assert.match(sql, /bucket_id = 'collector-memory-images'/i);
  assert.match(sql, /join public\.vault_item_instances vii/i);
  assert.match(sql, /join public\.card_events e/i);
  assert.match(sql, /cm\.photo_path = name/i);
  assert.match(sql, /interest_graph_collectors_visible_to_viewer_v1\(\s*auth\.uid\(\),\s*cm\.user_id/i);
  assert.doesNotMatch(sql, /on public\.collector_memories\s+for select\s+to anon/i);
  assert.doesNotMatch(sql, /on public\.collector_memories\s+for select\s+to authenticated\s+using \(is_public/i);
});

test("Pulse publication remains watch-backed and rechecks privacy boundaries", () => {
  const sql = read(migrationPath);

  assert.match(sql, /rename to collector_memory_pulse_base_eligible_events_v1/i);
  assert.match(sql, /from public\.collector_memory_pulse_base_eligible_events_v1/i);
  assert.match(sql, /join lateral \([\s\S]*from public\.watches w/i);
  assert.match(sql, /w\.muted_at is null/i);
  assert.match(sql, /w\.subject_type = 'collector'/i);
  assert.match(sql, /w\.subject_type = 'card'/i);
  assert.match(sql, /w\.subject_type = 'set'/i);
  assert.match(sql, /interest_graph_card_event_visible_to_viewer_v1/i);
  assert.match(sql, /interest_graph_collector_public_v1\(e\.actor_user_id\)/i);
  assert.match(sql, /muted_card_watch\.muted_at is not null/i);
});

test("Flutter exposes owner publication control without direct Memory table reads", () => {
  const service = read("lib/services/vault/collector_memory_service.dart");
  const detail = read(
    "lib/screens/grookai_objects/collector_memory_detail_screen.dart",
  );
  const pulse = read("lib/services/network/pulse_service.dart");

  assert.match(service, /collector_memory_set_public_v1/);
  assert.doesNotMatch(service, /\.from\('collector_memories'\)/);
  assert.match(detail, /memory-public-switch/);
  assert.match(detail, /Share this Memory in Pulse\?/);
  assert.match(pulse, /_memoryPhotoExpirySeconds = 300/);
  assert.match(pulse, /_validMemoryPhotoPath/);
  assert.match(pulse, /collector-memory-images/);
});
