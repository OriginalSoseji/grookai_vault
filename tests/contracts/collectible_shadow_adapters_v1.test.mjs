import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  COLLECTIBLE_DOMAINS,
  COLLECTIBLE_IDENTITY_CONTRACTS,
  COLLECTIBLE_SHADOW_ADAPTERS,
  normalizeCollectibleShadowCandidateV1,
  validateCollectibleShadowAdapterRegistryV1,
} from "../../backend/catalog/collectible_shadow_adapter_registry_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");

test("registry validates unique adapters and all collectible domains", () => {
  const summary = validateCollectibleShadowAdapterRegistryV1();
  assert.equal(summary.adapter_count, 20);
  assert.equal(summary.probe_adapter_count, 16);
  assert.equal(summary.blocked_adapter_count, 1);
  for (const domain of Object.values(COLLECTIBLE_DOMAINS)) {
    assert.ok(summary.by_domain[domain] > 0, domain);
  }
  assert.match(summary.fingerprint_sha256, /^[0-9a-f]{64}$/);
});

test("every adapter remains noncanonical with no unproven image authority", () => {
  for (const row of COLLECTIBLE_SHADOW_ADAPTERS) {
    assert.equal(row.canonical_authority, false, row.adapter_id);
    assert.equal(row.persistence_policy, "hash_and_metadata_only", row.adapter_id);
    assert.equal(row.rights.image_republication, "not_authorized", row.adapter_id);
    assert.equal(row.rights.self_hosting, "not_authorized", row.adapter_id);
  }
});

test("existing catalogs are not duplicated by the new probe worker", () => {
  for (const key of ["pokemon", "mtg", "one_piece"]) {
    const row = COLLECTIBLE_SHADOW_ADAPTERS.find((candidate) => candidate.catalog_key === key);
    assert.equal(row.execution_stage, "managed_by_existing_runtime");
    assert.equal(row.probe_enabled, false);
    assert.equal(row.existing_runtime, "universal_catalog_discovery_v1");
  }
  const mtg = COLLECTIBLE_SHADOW_ADAPTERS.find((row) => row.catalog_key === "mtg");
  assert.equal(mtg.source_authority, "governed_community_reference");
});

test("comics fail closed until a licensed cross-publisher source exists", () => {
  const comics = COLLECTIBLE_SHADOW_ADAPTERS.find((row) => row.catalog_key === "comics");
  assert.equal(comics.domain, COLLECTIBLE_DOMAINS.COMIC);
  assert.equal(comics.execution_stage, "licensed_source_required");
  assert.equal(comics.probe_enabled, false);
  assert.equal(comics.official_source_url, null);
});

test("domain identity contracts preserve domain-specific coordinates", () => {
  assert.ok(COLLECTIBLE_IDENTITY_CONTRACTS.vinyl_figure_v1.variant_coordinates.includes("sticker"));
  assert.ok(COLLECTIBLE_IDENTITY_CONTRACTS.die_cast_vehicle_v1.variant_coordinates.includes("wheel_type"));
  assert.ok(COLLECTIBLE_IDENTITY_CONTRACTS.sports_card_v1.variant_coordinates.includes("serial_numbering"));
  assert.ok(COLLECTIBLE_IDENTITY_CONTRACTS.comic_v1.variant_coordinates.includes("cover_artist"));
});

test("complete and incomplete shadow candidates remain evidence-only", () => {
  const adapter = COLLECTIBLE_SHADOW_ADAPTERS.find((row) => row.catalog_key === "hot_wheels");
  const complete = normalizeCollectibleShadowCandidateV1(adapter, {
    source_candidate_id: "hw-1",
    label: "Example Casting",
    identity_coordinates: {
      manufacturer: "Mattel",
      casting: "Example Casting",
      release_year: "2026",
      series: "Mainline",
    },
  });
  assert.equal(complete.status, "identity_coordinates_complete");
  assert.equal(complete.canonical_authority, false);
  assert.equal(complete.image_republication_authorized, false);

  const incomplete = normalizeCollectibleShadowCandidateV1(adapter, {
    source_candidate_id: "hw-2",
    label: "Unknown release",
    identity_coordinates: { manufacturer: "Mattel", casting: "Unknown" },
  });
  assert.equal(incomplete.status, "incomplete_candidate");
  assert.deepEqual(incomplete.missing_required_coordinates, ["release_year", "series"]);
});

test("probe worker has no database, image, or canonical writer capability", () => {
  const source = fs.readFileSync(
    path.join(ROOT, "scripts", "workers", "collectible_shadow_adapter_probe_v1.mjs"),
    "utf8",
  );
  assert.doesNotMatch(source, /from "pg"|@supabase|SUPABASE_DB_URL|DATABASE_URL/);
  assert.doesNotMatch(
    source,
    /(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|TRUNCATE\s+(?:TABLE\s+)?)/i,
  );
  assert.match(source, /raw_source_body_persistence: false/);
  assert.match(source, /image_downloads: false/);
  assert.match(source, /writer_dispatches: false/);
});

test("fixture probe emits hashed metadata without persisting source bodies", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "collectible-shadow-"));
  const fixtures = path.join(temp, "fixtures");
  const output = path.join(temp, "output");
  fs.mkdirSync(fixtures, { recursive: true });
  for (const id of ["yugioh_official_v1", "funko_official_v1"]) {
    fs.writeFileSync(path.join(fixtures, `${id}.html`), `<html>${id}</html>\n`);
  }
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "collectible_shadow_adapter_probe_v1.mjs"),
    "--adapter-ids=yugioh_official_v1,funko_official_v1",
    `--expected-head-sha=${head}`,
    `--fixture-dir=${fixtures}`,
    `--out-dir=${output}`,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: "shadow-only" },
  });
  assert.equal(run.status, 0, run.stderr);
  const summary = JSON.parse(fs.readFileSync(path.join(output, "summary.json"), "utf8"));
  const snapshots = JSON.parse(fs.readFileSync(path.join(output, "source_snapshots.json"), "utf8"));
  assert.equal(summary.status, "completed");
  assert.equal(summary.healthy_adapter_count, 2);
  assert.ok(snapshots.every((row) => row.body_persisted === false));
  assert.ok(snapshots.every((row) => /^[0-9a-f]{64}$/.test(row.response_sha256)));
  assert.deepEqual(fs.readdirSync(output).sort(), [
    "artifact_hashes.json",
    "registry_snapshot.json",
    "run_plan.json",
    "source_snapshots.json",
    "summary.json",
  ]);
  const manifest = JSON.parse(fs.readFileSync(path.join(output, "artifact_hashes.json"), "utf8"));
  for (const entry of manifest.artifacts) {
    const actual = crypto.createHash("sha256")
      .update(fs.readFileSync(path.join(output, entry.path))).digest("hex");
    assert.equal(actual, entry.sha256, entry.path);
  }
});

test("scheduled workflow is shadow-only and receives no database secret", () => {
  const source = fs.readFileSync(
    path.join(ROOT, ".github", "workflows", "collectible-shadow-adapters.yml"),
    "utf8",
  );
  assert.match(source, /schedule:/);
  assert.match(source, /CATALOG_AUTOMATION_MODE:\s*shadow-only/);
  assert.match(source, /ref:\s*\$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(source, /SUPABASE|DATABASE_URL|POSTGRES|--apply|--mode=apply/);
  assert.doesNotMatch(source, /Storage|canonical.*writer.*run/i);
});

test("contract distinguishes source health from parsed catalog completion", () => {
  const contract = fs.readFileSync(
    path.join(ROOT, "docs", "contracts", "COLLECTIBLE_SHADOW_ADAPTERS_V1.md"),
    "utf8",
  );
  assert.match(contract, /A healthy source probe does not mean its catalog is parsed or complete\./);
  assert.match(contract, /An official source proves provenance, not republication rights\./);
  assert.match(contract, /Canonical promotion remains governed by `CATALOG_SHADOW_AUTOMATION_V1`/);
});
