import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  buildSealedFamilyIdentityV1,
  buildSealedVariantIdentityV1,
  CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1,
  SEALED_PACKAGE_FORMS_V1,
  validateFutureSealedCanaryPlanV1,
  validateSealedPromotionCandidateV1,
} from "../../backend/pricing/cross_tcg_sealed_product_domain_v1.mjs";

function source(path) {
  return readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const fixture = JSON.parse(source("tests/fixtures/cross_tcg_sealed_product_domain_v1.json"));
const migrationPath = "docs/sql/cross_tcg_sealed_product_domain_v1_migration_candidate.sql";
const promotedMigrationPath =
  "supabase/migrations/20260814060000_cross_tcg_sealed_product_domain_v1.sql";
const rollbackPath = "docs/sql/cross_tcg_sealed_product_domain_v1_schema_only_rollback_candidate.sql";
const migration = source(migrationPath);
const rollback = source(rollbackPath);

function stripComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

test("family identity is deterministic and normalized", () => {
  const first = buildSealedFamilyIdentityV1(fixture.families[0]);
  const second = buildSealedFamilyIdentityV1({
    ...fixture.families[0],
    game_key: " Pokemon ",
    family_key: "Scarlet Violet Base Booster",
  });
  assert.equal(first.identity_contract_version, CROSS_TCG_SEALED_PRODUCT_DOMAIN_V1);
  assert.equal(first.game_key, "pokemon");
  assert.equal(first.family_key, "scarlet_violet_base_booster");
  assert.equal(first.identity_fingerprint, second.identity_fingerprint);
  assert.match(first.identity_fingerprint, /^[0-9a-f]{64}$/);
});

test("variant identity includes family, package, locale, and explicit contents", () => {
  const family = buildSealedFamilyIdentityV1(fixture.families[0]);
  const variant = buildSealedVariantIdentityV1({
    ...fixture.variants[0],
    family_identity_fingerprint: family.identity_fingerprint,
  });
  assert.equal(variant.package_form, "booster_box");
  assert.equal(variant.language_code, "en");
  assert.equal(variant.region_code, "US");
  assert.deepEqual(variant.explicit_contents, [{ unit: "booster_pack", quantity: 36 }]);
});

test("identity-significant variant differences produce different fingerprints", () => {
  const family = buildSealedFamilyIdentityV1(fixture.families[0]);
  const base = { ...fixture.variants[0], family_identity_fingerprint: family.identity_fingerprint };
  const english = buildSealedVariantIdentityV1(base);
  const japanese = buildSealedVariantIdentityV1({ ...base, language_code: "ja", region_code: "JP" });
  const pack = buildSealedVariantIdentityV1({ ...base, package_form: "pack" });
  assert.notEqual(english.identity_fingerprint, japanese.identity_fingerprint);
  assert.notEqual(english.identity_fingerprint, pack.identity_fingerprint);
});

test("sealed identities reject card-domain keys", () => {
  assert.throws(
    () => buildSealedFamilyIdentityV1({ ...fixture.families[0], card_print_id: "forbidden" }),
    /cannot contain.*card_print_id/,
  );
  assert.throws(
    () => buildSealedVariantIdentityV1({
      ...fixture.variants[0],
      family_identity_fingerprint: "a".repeat(64),
      nested: { card_printing_id: "forbidden" },
    }),
    /cannot contain.*card_printing_id/,
  );
});

test("only governed package forms validate", () => {
  assert.equal(SEALED_PACKAGE_FORMS_V1.length, 12);
  assert.throws(
    () => buildSealedVariantIdentityV1({
      ...fixture.variants[0],
      family_identity_fingerprint: "a".repeat(64),
      package_form: "individual_card",
    }),
    /unsupported package_form/,
  );
});

test("confirmed exact candidate with field evidence can promote but cannot publish", () => {
  const result = validateSealedPromotionCandidateV1(fixture.valid_promotion);
  assert.equal(result.valid, true);
  assert.equal(result.canonical_authority, true);
  assert.equal(result.publication_authority, false);
});

test("ambiguous or circularly unsupported candidate cannot promote", () => {
  const result = validateSealedPromotionCandidateV1(fixture.ambiguous_promotion);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("classification must be sealed_candidate"));
  assert.ok(result.errors.includes("confirmed_sealed authorized review is required"));
});

test("variant fields require matching evidence dimensions", () => {
  const input = structuredClone(fixture.valid_promotion);
  input.evidence = [{ dimension: "package_form" }];
  const result = validateSealedPromotionCandidateV1(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("language evidence is required when language_code is present"));
  assert.ok(result.errors.includes("contents evidence is required when explicit_contents is present"));
});

test("future canary fixture is bounded, cross-game, draft, and no-publication", () => {
  assert.deepEqual(validateFutureSealedCanaryPlanV1(fixture.future_canary), {
    valid: true,
    errors: [],
  });
});

test("future canary refuses oversized or pointer-changing plans", () => {
  const plan = structuredClone(fixture.future_canary);
  plan.candidates = Array.from({ length: 21 }, (_, index) => ({ source_product_id: index + 1 }));
  plan.change_active_release_pointer = true;
  const result = validateFutureSealedCanaryPlanV1(plan);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("candidate count must be 1 through 20"));
  assert.ok(result.errors.includes("active release pointer must remain unchanged"));
});

test("reviewed migration is promoted byte-for-byte but remains execution-gated", () => {
  const migrations = readdirSync(new URL("../../supabase/migrations/", import.meta.url));
  assert.match(migration, /Review artifact only/);
  assert.match(stripComments(migration), /^\s*begin\s*;/i);
  assert.match(stripComments(migration), /commit\s*;\s*$/i);
  assert.deepEqual(source(promotedMigrationPath), migration);
  assert.deepEqual(
    migrations.filter((name) => /sealed_product_domain/i.test(name)),
    ["20260814060000_cross_tcg_sealed_product_domain_v1.sql"],
  );
});

test("migration creates only the separate ten-table sealed domain", () => {
  const stripped = stripComments(migration);
  const tables = [...stripped.matchAll(/create table public\.(sealed_product_[a-z_]+)/gi)].map((match) => match[1]);
  assert.equal(tables.length, 10);
  assert.equal(new Set(tables).size, 10);
  assert.doesNotMatch(stripped, /card_prints?|card_printings?/i);
  assert.doesNotMatch(stripped, /\balter table public\.(?!sealed_product_)/i);
  const dmlTargets = [...stripped.matchAll(/(?:insert\s+into|update|delete\s+from)\s+public\.([a-z_]+)/gi)]
    .map((match) => match[1]);
  assert.ok(dmlTargets.every((table) => table.startsWith("sealed_product_")));
});

test("canonical and evidence rows are append-only while releases use guarded lifecycle controls", () => {
  const stripped = stripComments(migration);
  assert.match(stripped, /create function public\.sealed_product_reject_row_mutation_v1/i);
  const triggers = [...stripped.matchAll(/create trigger sealed_product_[a-z_]+_append_only/gi)];
  assert.equal(triggers.length, 8);
  assert.match(stripped, /before update or delete on public\.sealed_product_families/i);
  assert.match(stripped, /before update or delete on public\.sealed_product_source_mappings/i);
  assert.match(stripped, /before update or delete on public\.sealed_product_release_members/i);
  assert.doesNotMatch(stripped, /sealed_product_releases_append_only/i);
  assert.match(stripped, /sealed_product_releases_guard_mutation/i);
});

test("exact TCGPlayer ownership and non-public pricing hooks are constrained", () => {
  const stripped = stripComments(migration);
  assert.match(stripped, /source_provider\s*=\s*'tcgplayer'/i);
  assert.match(stripped, /unique\s*\(\s*source_provider,\s*source_category_id,\s*source_group_id,\s*source_product_id\s*\)/i);
  assert.match(stripped, /qualification_status in\s*\([\s\S]*?'qualified_exact'/i);
  assert.match(stripped, /sealed_product_pricing_no_publication_check check \(not publication_authority\)/i);
  assert.doesNotMatch(stripped, /\bcreate\s+(?:materialized\s+)?view\b/i);
});

test("mapping authority is bound to the exact candidate, confirmed review, and variant", () => {
  const stripped = stripComments(migration);
  assert.match(stripped, /sealed_product_source_mappings_candidate_binding_fk foreign key[\s\S]*?references public\.sealed_product_candidates/i);
  assert.match(stripped, /sealed_product_source_mappings_review_binding_fk foreign key[\s\S]*?references public\.sealed_product_candidate_reviews/i);
  assert.match(stripped, /sealed_product_source_mappings_classification_check check \(candidate_classification = 'sealed_candidate'\)/i);
  assert.match(stripped, /sealed_product_source_mappings_review_decision_check check \(review_decision = 'confirmed_sealed'\)/i);
  assert.match(stripped, /sealed_product_source_mappings_promotion_check check \(promotion_authorized\)/i);
  assert.match(stripped, /sealed_product_variant_evidence_mapping_binding_fk foreign key[\s\S]*?\(id, variant_id\)/i);
  assert.match(stripped, /sealed_product_pricing_mapping_binding_fk foreign key[\s\S]*?\(id, variant_id\)/i);
  assert.match(stripped, /sealed_product_release_members_mapping_binding_fk foreign key[\s\S]*?\(id, variant_id\)/i);
});

test("release activation is service-only, reconciled, and compare-and-swap", () => {
  const stripped = stripComments(migration);
  assert.match(stripped, /create function public\.sealed_product_freeze_release_v1/i);
  assert.match(stripped, /release members may only be inserted into a draft release/i);
  assert.match(stripped, /old\.release_state = 'draft'[\s\S]*?new\.release_state = 'frozen'/i);
  assert.match(stripped, /manifest_fingerprint <> p_expected_manifest_fingerprint/i);
  assert.match(stripped, /create function public\.sealed_product_set_active_release_v1/i);
  assert.match(stripped, /v_release\.release_state <> 'frozen'/i);
  assert.match(stripped, /v_member_count <> v_release\.expected_member_count/i);
  assert.match(stripped, /for update/i);
  assert.match(stripped, /lock table public\.sealed_product_release_pointer in exclusive mode/i);
  assert.match(stripped, /v_current_release_id is distinct from p_expected_current_release_id/i);
  assert.match(stripped, /grant select on public\.sealed_product_release_pointer to service_role/i);
  assert.doesNotMatch(stripped, /grant[^;]*update[^;]*sealed_product_release_pointer/i);
  assert.match(stripped, /grant execute on function public\.sealed_product_set_active_release_v1\(uuid, uuid, uuid\) to service_role/i);
  assert.match(stripped, /grant execute on function public\.sealed_product_freeze_release_v1\(uuid, text, uuid\) to service_role/i);
  assert.match(stripped, /revoke all on function public\.sealed_product_set_active_release_v1\(uuid, uuid, uuid\) from public, anon, authenticated/i);
});

test("every table forces RLS and exposes only service-role policy", () => {
  const stripped = stripComments(migration);
  const tables = [...stripped.matchAll(/create table public\.(sealed_product_[a-z_]+)/gi)].map((match) => match[1]);
  for (const table of tables) {
    assert.match(stripped, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(stripped, new RegExp(`alter table public\\.${table} force row level security`, "i"));
    assert.match(stripped, new RegExp(`revoke all on public\\.${table} from public, anon, authenticated`, "i"));
    assert.match(stripped, new RegExp(`create policy [a-z_]+ on public\\.${table}\\s+for all to service_role`, "i"));
  }
  assert.doesNotMatch(stripped, /\bgrant\b[^;]*\bto\s+(anon|authenticated)\b/i);
});

test("schema-only rollback is atomic and reverse ordered", () => {
  const stripped = stripComments(rollback);
  assert.match(stripped, /^\s*begin\s*;/i);
  assert.match(stripped, /commit\s*;\s*$/i);
  const pointer = stripped.indexOf("drop table if exists public.sealed_product_release_pointer");
  const family = stripped.indexOf("drop table if exists public.sealed_product_families");
  const activate = stripped.indexOf("drop function if exists public.sealed_product_set_active_release_v1");
  const freeze = stripped.indexOf("drop function if exists public.sealed_product_freeze_release_v1");
  const fn = stripped.indexOf("drop function if exists public.sealed_product_reject_row_mutation_v1");
  assert.ok(pointer >= 0 && pointer < family && family < activate && activate < freeze && freeze < fn);
});

test("migration audit source binding matches the final sealed readiness evidence", () => {
  const summary = JSON.parse(source(
    "docs/audits/pricing/cross_tcg_sealed_catalog_readiness_v1/2026-08-14T05-04-00-104Z_read_only_portfolio/summary.json",
  ));
  assert.equal(summary.repository.producer_commit_sha, "c2337c94b63f87700a4efc8e1b8e114653659609");
  assert.equal(summary.sample_artifact.logical_sha256, "1d788df0260d598ad2e99496989361af9edb68f1538ff88e5455b802e278a948");
  assert.equal(summary.overall.active_products_classified, 499872);
  assert.equal(summary.overall.classifications.sealed_candidate, 10007);
});
