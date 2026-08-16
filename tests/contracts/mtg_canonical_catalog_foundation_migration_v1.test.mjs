import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const migration = readFileSync(
  path.join(
    ROOT,
    "supabase",
    "migrations",
    "20260813190000_mtg_canonical_catalog_foundation_v1.sql",
  ),
  "utf8",
);

test("MTG foundation migration is transactional and bounded", () => {
  assert.match(migration, /^begin;/);
  assert.match(migration, /commit;\s*$/);
  assert.doesNotMatch(migration, /\b(?:delete|truncate|drop table|drop column)\b/i);
  assert.doesNotMatch(migration, /update\s+public\./i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.(?!games|finish_keys)/i);
});

test("MTG game seed is deterministic", () => {
  assert.match(migration, /4d544700-0000-4000-8000-000000000001/);
  assert.match(migration, /'mtg'/);
  assert.match(migration, /'Magic: The Gathering'/);
  assert.match(migration, /on conflict \(code\) do nothing/);
});

test("MTG finish taxonomy adds foil and etched without changing normal", () => {
  assert.match(migration, /'foil'[\s\S]*'Foil'/);
  assert.match(migration, /'etched'[\s\S]*'Etched Foil'/);
  assert.match(migration, /'publication_scope', 'deferred'/);
  assert.doesNotMatch(migration, /update\s+public\.finish_keys/i);
});

test("identity domain extension preserves every existing domain", () => {
  for (const domain of [
    "pokemon_eng_standard",
    "pokemon_ba",
    "pokemon_eng_special_print",
    "pokemon_jpn",
    "mtg_eng_paper_print",
  ]) {
    assert.match(migration, new RegExp(`'${domain}'`));
  }
});

test("image provenance extension preserves every existing source", () => {
  for (const source of [
    "tcgdex",
    "ptcg",
    "pokemonapi",
    "identity",
    "user_photo",
    "scryfall",
  ]) {
    assert.match(migration, new RegExp(`'${source}'`));
  }
});

test("migration adds no publication or app visibility behavior", () => {
  assert.doesNotMatch(migration, /market_price_publication/i);
  assert.doesNotMatch(migration, /app_visible/i);
  assert.doesNotMatch(migration, /grant\s+/i);
  assert.doesNotMatch(migration, /create\s+policy/i);
});

