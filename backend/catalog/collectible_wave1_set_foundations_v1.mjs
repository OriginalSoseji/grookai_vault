import crypto from "node:crypto";

import {
  COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED,
  COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
  COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT,
  canonicalWave1SetCodeV1,
  canonicalWave1SetIdV1,
  stableJsonWave1SetApplyV1,
  wave1SetApplyFingerprintV1,
} from "./collectible_wave1_set_apply_proposal_v1.mjs";

export const COLLECTIBLE_WAVE1_SET_FOUNDATIONS_VERSION =
  "COLLECTIBLE_WAVE1_SET_FOUNDATIONS_V1";
export const COLLECTIBLE_WAVE1_SET_FOUNDATIONS_MIGRATION_VERSION =
  "20260828063000";
export const COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD = Object.freeze({
  bytes: 570890,
  sha256: "2c07787bf965909a2b9f0a6296e45d6a2407c7faf28d70069c23a305beec7144",
  fingerprint_sha256:
    "fa0674bc2563e57c8ab02e2bf19f44805328bdb0b56ad98ed807323e45b51668",
});

const EXPECTED_GAME_COUNTS = Object.freeze({ gundam: 5, yugioh: 500 });
const REQUIRED_SOURCE_FIELDS = Object.freeze([
  "source_id",
  "source_manifest_sha256",
  "source_manifest_row_number",
  "source_set_name",
  "source_set_code",
  "source_card_count",
  "matching_candidate_count",
  "mapping_method",
  "set_proposal_id",
  "language_code",
  "canonical_code_policy",
  "canonical_visibility",
  "card_identity_authorized",
  "source_images_authorized",
]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function number(value) {
  return Number(value ?? 0);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countBy(rows, field) {
  return rows.reduce((counts, row) => ({
    ...counts,
    [row[field]]: (counts[row[field]] ?? 0) + 1,
  }), {});
}

function assertUnique(rows, field) {
  assert(
    new Set(rows.map((row) => row[field])).size === rows.length,
    `Wave 1 payload contains duplicate ${field}`,
  );
}

function validatePayloadRow(row) {
  assert(row?.apply_proposal_version === COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
    "Wave 1 payload version mismatch");
  assert(row?.write_authority === false && row?.canonical_authority_proposed === true,
    `Wave 1 payload authority mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  assert(row?.id === canonicalWave1SetIdV1(row?.source_set_proposal_id),
    `Wave 1 payload ID mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  assert(row?.code === canonicalWave1SetCodeV1(row?.game, row?.source?.source_set_code),
    `Wave 1 payload code mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  assert(typeof row?.name === "string" && row.name.trim() === row.name && row.name.length > 0,
    `Wave 1 payload name mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  assert(row?.release_date === null || /^\d{4}-\d{2}-\d{2}$/.test(row.release_date),
    `Wave 1 payload release date mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  assert(row?.printed_total === null && row?.set_role === null &&
    row?.identity_domain_default === null && row?.identity_model === "standard",
  `Wave 1 payload identity boundary mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  for (const field of ["logo_url", "symbol_url", "hero_image_url", "hero_image_source"]) {
    assert(row?.[field] === null,
      `Wave 1 payload image authority mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  }
  assert(row?.printed_set_abbrev === row?.source?.source_set_code,
    `Wave 1 payload printed code mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  assert(row?.source?.set_proposal_id === row?.source_set_proposal_id,
    `Wave 1 payload source proposal mismatch: ${row?.source_set_proposal_id ?? "missing"}`);
  for (const field of REQUIRED_SOURCE_FIELDS) {
    assert(Object.hasOwn(row?.source ?? {}, field),
      `Wave 1 payload source field missing: ${field}`);
  }
  assert(row.source.language_code === "en" && row.source.canonical_visibility === "hidden" &&
    row.source.card_identity_authorized === false &&
    row.source.source_images_authorized === false,
  `Wave 1 payload source boundary mismatch: ${row.source_set_proposal_id}`);
}

export function parseCollectibleWave1SetPayloadV1(body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  assert(bytes.length === COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.bytes,
    "Wave 1 payload byte count mismatch");
  assert(sha256(bytes) === COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.sha256,
    "Wave 1 payload file hash mismatch");
  const rows = bytes.toString("utf8").trimEnd().split("\n").map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Wave 1 payload row ${index + 1} is invalid JSON: ${error.message}`);
    }
  });
  assert(rows.length === COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.selected_set_count,
    "Wave 1 payload row count mismatch");
  rows.forEach(validatePayloadRow);
  assertUnique(rows, "id");
  assertUnique(rows, "code");
  assertUnique(rows, "source_set_proposal_id");
  assert(stableJsonWave1SetApplyV1(countBy(rows, "game")) ===
    stableJsonWave1SetApplyV1(EXPECTED_GAME_COUNTS), "Wave 1 payload game count mismatch");
  assert(rows.every((row, index) => index === 0 ||
    rows[index - 1].source_set_proposal_id.localeCompare(row.source_set_proposal_id) < 0),
  "Wave 1 payload order mismatch");
  const fingerprint = wave1SetApplyFingerprintV1({
    version: COLLECTIBLE_WAVE1_SET_APPLY_PROPOSAL_VERSION,
    input: COLLECTIBLE_WAVE1_SET_PROPOSAL_INPUT,
    rows,
  });
  assert(fingerprint === COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.fingerprint_sha256,
    "Wave 1 payload fingerprint mismatch");
  return rows;
}

export function collectibleWave1SetDatabaseRowsV1(payloadRows) {
  assert(Array.isArray(payloadRows) &&
    payloadRows.length === COLLECTIBLE_WAVE1_SET_APPLY_EXPECTED.selected_set_count,
  "Wave 1 database rows require the exact payload");
  return payloadRows.map((row) => ({
    id: row.id,
    game: row.game,
    code: row.code,
    name: row.name,
    release_date: row.release_date,
    source: {
      ...row.source,
      canonical_apply_version: COLLECTIBLE_WAVE1_SET_FOUNDATIONS_VERSION,
      canonical_payload_fingerprint_sha256:
        COLLECTIBLE_WAVE1_SET_FOUNDATIONS_PAYLOAD.fingerprint_sha256,
    },
    printed_total: null,
    printed_set_abbrev: row.printed_set_abbrev,
    set_role: null,
    identity_domain_default: null,
    identity_model: "standard",
    logo_url: null,
    symbol_url: null,
    hero_image_url: null,
    hero_image_source: null,
  }));
}

export function renderCollectibleWave1SetFoundationsMigrationV1(payloadRows) {
  const rows = collectibleWave1SetDatabaseRowsV1(payloadRows);
  const json = JSON.stringify(rows);
  assert(!json.includes("$wave1_sets$"), "Wave 1 payload contains the SQL delimiter");
  return `-- ${COLLECTIBLE_WAVE1_SET_FOUNDATIONS_VERSION}\n` +
    `-- Inserts only the exact 500 Yu-Gi-Oh and 5 Gundam hidden-game set foundations.\n\n` +
    `begin;\n\n` +
    `set local lock_timeout = '5s';\n` +
    `set local statement_timeout = '180s';\n\n` +
    `create temporary table collectible_wave1_set_seed_v1 (\n` +
    `  id uuid primary key,\n  game text not null,\n  code text not null unique,\n` +
    `  name text not null,\n  release_date date,\n  source jsonb not null,\n` +
    `  printed_total integer,\n  printed_set_abbrev text not null,\n  set_role text,\n` +
    `  identity_domain_default text,\n  identity_model text not null,\n` +
    `  logo_url text,\n  symbol_url text,\n  hero_image_url text,\n` +
    `  hero_image_source text\n) on commit drop;\n\n` +
    `insert into pg_temp.collectible_wave1_set_seed_v1\n` +
    `select * from jsonb_to_recordset($wave1_sets$${json}$wave1_sets$::jsonb) as seed(\n` +
    `  id uuid, game text, code text, name text, release_date date, source jsonb,\n` +
    `  printed_total integer, printed_set_abbrev text, set_role text,\n` +
    `  identity_domain_default text, identity_model text, logo_url text,\n` +
    `  symbol_url text, hero_image_url text, hero_image_source text\n);\n\n` +
    `do $$\n` +
    `begin\n` +
    `  if (select count(*) from pg_temp.collectible_wave1_set_seed_v1) <> 505\n` +
    `    or (select count(*) from pg_temp.collectible_wave1_set_seed_v1 where game = 'yugioh') <> 500\n` +
    `    or (select count(*) from pg_temp.collectible_wave1_set_seed_v1 where game = 'gundam') <> 5 then\n` +
    `    raise exception 'Wave 1 set seed partition mismatch';\n  end if;\n\n` +
    `  if (select count(*) from public.games where (id, code, name, slug) in (\n` +
    `    ('59474f00-0000-4000-8000-000000000001'::uuid, 'yugioh', 'Yu-Gi-Oh!', 'yu-gi-oh'),\n` +
    `    ('47434700-0000-4000-8000-000000000001'::uuid, 'gundam', 'Gundam Card Game', 'gundam-card-game')\n` +
    `  )) <> 2 then\n    raise exception 'Wave 1 game foundations mismatch';\n  end if;\n\n` +
    `  if (select count(*) from public.catalog_game_release_controls\n` +
    `      where game_code in ('yugioh', 'gundam') and release_status = 'hidden'\n` +
    `        and release_version = 'COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1') <> 2 then\n` +
    `    raise exception 'Wave 1 hidden release controls mismatch';\n  end if;\n\n` +
    `  if exists (\n    select 1 from public.sets existing\n` +
    `    join pg_temp.collectible_wave1_set_seed_v1 expected on expected.id = existing.id\n` +
    `    where (existing.game, existing.code, existing.name, existing.release_date, existing.source,\n` +
    `      existing.printed_total, existing.printed_set_abbrev, existing.set_role,\n` +
    `      existing.identity_domain_default, existing.identity_model, existing.logo_url,\n` +
    `      existing.symbol_url, existing.hero_image_url, existing.hero_image_source)\n` +
    `    is distinct from\n` +
    `      (expected.game, expected.code, expected.name, expected.release_date, expected.source,\n` +
    `      expected.printed_total, expected.printed_set_abbrev, expected.set_role,\n` +
    `      expected.identity_domain_default, expected.identity_model, expected.logo_url,\n` +
    `      expected.symbol_url, expected.hero_image_url, expected.hero_image_source)\n` +
    `  ) then\n    raise exception 'Wave 1 set ID conflicts with the exact payload';\n  end if;\n\n` +
    `  if exists (select 1 from public.sets existing\n` +
    `    join pg_temp.collectible_wave1_set_seed_v1 expected on expected.code = existing.code\n` +
    `    where existing.id <> expected.id) then\n` +
    `    raise exception 'Wave 1 globally namespaced set code collision';\n  end if;\n\n` +
    `  if exists (select 1 from public.sets existing\n` +
    `    join pg_temp.collectible_wave1_set_seed_v1 expected\n` +
    `      on existing.source ->> 'set_proposal_id' = expected.source ->> 'set_proposal_id'\n` +
    `    where existing.id <> expected.id) then\n` +
    `    raise exception 'Wave 1 source proposal collision';\n  end if;\n\n` +
    `  if exists (select 1 from public.sets existing\n` +
    `    join pg_temp.collectible_wave1_set_seed_v1 expected\n` +
    `      on existing.game = expected.game and lower(existing.name) = lower(expected.name)\n` +
    `    where existing.id <> expected.id) then\n` +
    `    raise exception 'Wave 1 same-game set name collision';\n  end if;\n` +
    `end;\n$$;\n\n` +
    `insert into public.sets (\n` +
    `  id, game, code, name, release_date, source, printed_total, printed_set_abbrev,\n` +
    `  set_role, identity_domain_default, identity_model, logo_url, symbol_url,\n` +
    `  hero_image_url, hero_image_source\n)\n` +
    `select id, game, code, name, release_date, source, printed_total, printed_set_abbrev,\n` +
    `  set_role, identity_domain_default, identity_model, logo_url, symbol_url,\n` +
    `  hero_image_url, hero_image_source\n` +
    `from pg_temp.collectible_wave1_set_seed_v1\n` +
    `order by code\n` +
    `on conflict (code) do nothing;\n\n` +
    `do $$\n` +
    `begin\n` +
    `  if (\n    select count(*) from public.sets existing\n` +
    `    join pg_temp.collectible_wave1_set_seed_v1 expected on expected.id = existing.id\n` +
    `    where (existing.game, existing.code, existing.name, existing.release_date, existing.source,\n` +
    `      existing.printed_total, existing.printed_set_abbrev, existing.set_role,\n` +
    `      existing.identity_domain_default, existing.identity_model, existing.logo_url,\n` +
    `      existing.symbol_url, existing.hero_image_url, existing.hero_image_source)\n` +
    `      is not distinct from\n` +
    `      (expected.game, expected.code, expected.name, expected.release_date, expected.source,\n` +
    `      expected.printed_total, expected.printed_set_abbrev, expected.set_role,\n` +
    `      expected.identity_domain_default, expected.identity_model, expected.logo_url,\n` +
    `      expected.symbol_url, expected.hero_image_url, expected.hero_image_source)\n` +
    `  ) <> 505 then\n` +
    `    raise exception 'Wave 1 set insert did not reconcile to the exact payload';\n` +
    `  end if;\nend;\n$$;\n\ncommit;\n`;
}

export function compareCollectibleWave1ProtectedCountsV1(before, after, deltas = {}) {
  const findings = [];
  for (const key of Object.keys(before ?? {}).sort()) {
    const expected = number(before[key]) + number(deltas[key]);
    if (number(after?.[key]) !== expected) {
      findings.push(`protected_count_mismatch:${key}:${expected}:${number(after?.[key])}`);
    }
  }
  return findings;
}

export function evaluateCollectibleWave1SetRollbackBaselineV1(readback) {
  const findings = [];
  if (readback?.transaction_read_only !== true) findings.push("transaction_not_read_only");
  if (readback?.latest_migration !== "20260828024500") {
    findings.push("migration_history_not_at_expected_parent");
  }
  for (const field of [
    "candidate_migration_count",
    "existing_selected_set_count",
    "existing_wave1_set_count",
    "planned_id_collision_count",
    "planned_code_collision_count",
    "planned_source_proposal_collision_count",
    "planned_game_name_collision_count",
    "conflicting_lock_count",
  ]) {
    if (number(readback?.[field]) !== 0) findings.push(`${field}_not_zero`);
  }
  if (number(readback?.planned_row_count) !== 505) findings.push("planned_row_count_mismatch");
  if (readback?.sets_rls_enabled !== true || readback?.sets_force_rls !== false) {
    findings.push("sets_rls_state_mismatch");
  }
  if (readback?.sets_release_policy?.permissive !== "RESTRICTIVE" ||
      !String(readback?.sets_release_policy?.qual ?? "")
        .includes("catalog_game_visible_to_request_v1(game)")) {
    findings.push("sets_release_policy_mismatch");
  }
  const games = [...(readback?.games ?? [])].sort((left, right) =>
    left.code.localeCompare(right.code));
  if (stableJsonWave1SetApplyV1(games) !== stableJsonWave1SetApplyV1([
    { id: "47434700-0000-4000-8000-000000000001", code: "gundam",
      name: "Gundam Card Game", slug: "gundam-card-game" },
    { id: "59474f00-0000-4000-8000-000000000001", code: "yugioh",
      name: "Yu-Gi-Oh!", slug: "yu-gi-oh" },
  ])) findings.push("game_foundations_mismatch");
  for (const game of ["gundam", "yugioh"]) {
    const control = readback?.release_controls?.find((row) => row.game_code === game);
    if (!control || control.release_status !== "hidden" ||
        control.release_version !== "COLLECTIBLE_WAVE1_GAME_FOUNDATIONS_V1") {
      findings.push(`hidden_release_control_mismatch:${game}`);
    }
  }
  return [...new Set(findings)].sort();
}

export function evaluateCollectibleWave1SetTransientV1(readback, expectedRows) {
  const findings = [];
  if (stableJsonWave1SetApplyV1(readback?.sets ?? []) !==
      stableJsonWave1SetApplyV1(expectedRows ?? [])) findings.push("transient_set_rows_mismatch");
  if (number(readback?.migration_count) !== 0) findings.push("migration_ledger_changed");
  for (const field of ["card_print_count", "legacy_card_count", "identity_count",
    "printing_count", "external_mapping_count", "external_printing_mapping_count"]) {
    if (number(readback?.[field]) !== 0) findings.push(`${field}_not_zero`);
  }
  for (const role of ["anon", "authenticated", "service_role"]) {
    for (const game of ["gundam", "yugioh"]) {
      if (readback?.visibility?.[role]?.[game] !== false) {
        findings.push(`game_not_hidden:${role}:${game}`);
      }
    }
  }
  for (const role of ["anon", "authenticated"]) {
    if (number(readback?.rls_visible_set_counts?.[role]) !== 0) {
      findings.push(`sets_visible_through_rls:${role}`);
    }
  }
  return [...new Set(findings)].sort();
}

export function collectibleWave1SetProofFingerprintV1(value) {
  return wave1SetApplyFingerprintV1(value);
}
