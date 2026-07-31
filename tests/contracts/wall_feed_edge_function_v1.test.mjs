import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SOURCE = readFileSync(
  "supabase/functions/wall_feed/index.ts",
  "utf8",
);
const CONFIG = readFileSync(
  "supabase/functions/wall_feed/config.toml",
  "utf8",
);
const KEY_RESOLVER = readFileSync(
  "supabase/functions/_shared/key_resolver.ts",
  "utf8",
);

test("wall_feed is a public fixed-shape read-only adapter", () => {
  assert.match(CONFIG, /^verify_jwt\s*=\s*false\s*$/m);
  assert.match(SOURCE, /req\.method !== "GET"/);
  assert.match(SOURCE, /method:\s*"GET"/);
  assert.match(SOURCE, /\.from\(|\/rest\/v1\/wall_feed_view/);
  assert.match(SOURCE, /SELECT_COLUMNS/);
  assert.doesNotMatch(SOURCE, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.doesNotMatch(SOURCE, /SUPABASE_ANON_KEY|createClient/);
});

test("wall_feed uses new secret-key authority without bearer forwarding", () => {
  assert.match(SOURCE, /getServiceRoleKey/);
  assert.match(SOURCE, /apikey:\s*secretKey/);
  assert.doesNotMatch(SOURCE, /authorization:\s*[`'"]Bearer/i);
  assert.match(KEY_RESOLVER, /SUPABASE_SECRET_KEYS/);
  assert.match(KEY_RESOLVER, /SUPABASE_PUBLISHABLE_KEYS/);
});

test("wall_feed only filters columns exposed by its governed view", () => {
  assert.match(SOURCE, /searchParams\.append\("title"/);
  assert.doesNotMatch(SOURCE, /card_name\.ilike|set_code\.ilike|card_number\.ilike/);
  assert.match(SOURCE, /wall_feed_query_failed/);
  assert.match(SOURCE, /upstream_status/);
  assert.doesNotMatch(SOURCE, /String\(e\)|error:\s*String/);
});
