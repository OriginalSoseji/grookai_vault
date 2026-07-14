import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

test("trust safety migration creates block/report ledgers and blocks card messages both directions", () => {
  const sql = read("supabase/migrations/20260713190000_trust_safety_block_report_v1.sql");

  assert.match(sql, /create table if not exists public\.trust_blocks/i);
  assert.match(sql, /create table if not exists public\.trust_reports/i);
  assert.match(sql, /trust_blocks_no_self_check/i);
  assert.match(sql, /trust_reports_surface_check/i);
  assert.match(sql, /'profile', 'message', 'wall_card', 'listing', 'card', 'gvvi', 'other'/);
  assert.match(sql, /trust_block_exists_between_v1/i);
  assert.match(sql, /tb\.user_id = p_user_id[\s\S]*tb\.blocked_user_id = p_other_user_id/i);
  assert.match(sql, /tb\.user_id = p_other_user_id[\s\S]*tb\.blocked_user_id = p_user_id/i);
  assert.match(sql, /drop policy if exists card_interactions_insert_sender/i);
  assert.match(sql, /not public\.trust_block_exists_between_v1\(auth\.uid\(\), receiver_user_id\)/i);
  assert.match(sql, /create or replace view public\.v_card_contact_targets_v1/i);
  assert.match(sql, /not public\.trust_block_exists_between_v1\(auth\.uid\(\), vii\.user_id\)/i);
});

test("web trust safety actions expose report and block without bypassing auth", () => {
  const actions = read("apps/web/src/lib/trustSafety/trustSafetyActions.ts");
  const controls = read("apps/web/src/components/trust/TrustSafetyControls.tsx");
  const inboxControls = read("apps/web/src/components/network/InteractionGroupControls.tsx");
  const contactButton = read("apps/web/src/components/network/ContactOwnerButton.tsx");

  assert.match(actions, /"use server"/);
  assert.match(actions, /client\.auth\.getUser\(\)/);
  assert.match(actions, /\.from\("trust_reports"\)\.insert/);
  assert.match(actions, /\.from\("trust_blocks"\)\.upsert/);
  assert.match(actions, /card_interaction_group_states/);
  assert.match(controls, /Report/);
  assert.match(controls, /Block/);
  assert.match(inboxControls, /surface="message"/);
  assert.match(inboxControls, /reportedUserId=\{counterpartUserId\}/);
  assert.match(contactButton, /surface="listing"/);
  assert.match(contactButton, /reportedUserId=\{ownerUserId\}/);
});

test("mobile messaging exposes report and block actions and writes guarded ledgers", () => {
  const service = read("lib/services/network/card_interaction_service.dart");
  const thread = read("lib/screens/network/network_thread_screen.dart");

  assert.match(service, /Future<CardInteractionSendResult> reportThread/);
  assert.match(service, /from\('trust_reports'\)\.insert/);
  assert.match(service, /Future<CardInteractionSendResult> blockCollector/);
  assert.match(service, /from\('trust_blocks'\)\.upsert/);
  assert.match(service, /card_interaction_group_states/);
  assert.match(thread, /Report conversation/);
  assert.match(thread, /Block collector/);
  assert.match(thread, /_reportThread/);
  assert.match(thread, /_blockCounterpart/);
});
