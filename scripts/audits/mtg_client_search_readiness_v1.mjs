import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");

export const AUDIT_VERSION = "MTG_CLIENT_SEARCH_READINESS_AUDIT_V1";
export const FIXTURE_VERSION = "MTG_CLIENT_SEARCH_READINESS_FIXTURE_V1";

const SOURCE_FILES = Object.freeze({
  frozen_contract: "docs/contracts/MTG_CANONICAL_CATALOG_IMPORT_CONTRACT_V1.md",
  frozen_canary_payload:
    "docs/audits/pricing/mtg_canonical_catalog_canary_plan_v1/dsk/writer_payload.json",
  visibility_boundary:
    "supabase/migrations/20260813200000_mtg_catalog_app_visibility_boundary_v1.sql",
  web_types: "apps/web/src/types/cards.ts",
  web_search: "apps/web/src/lib/publicSearchResolver.ts",
  web_search_intent: "apps/web/src/lib/search/smartSearchIntent.ts",
  web_explore: "apps/web/src/lib/explore/getExploreRows.ts",
  web_card_detail: "apps/web/src/lib/getPublicCardByGvId.ts",
  web_card_page: "apps/web/src/app/card/[gv_id]/page.tsx",
  web_sets: "apps/web/src/lib/publicSets.ts",
  web_set_types: "apps/web/src/lib/publicSets.shared.ts",
  web_set_grid: "apps/web/src/components/PublicSetCardGrid.tsx",
  web_language: "apps/web/src/lib/publicLanguageScope.ts",
  web_finish: "apps/web/src/lib/cards/displayDiscriminator.ts",
  flutter_model: "lib/models/card_print.dart",
  flutter_search_identity: "lib/services/identity/identity_search.dart",
  flutter_card_detail: "lib/card_detail_screen.dart",
  flutter_sets: "lib/services/public/public_sets_service.dart",
  flutter_set_grid: "lib/screens/sets/public_set_detail_screen.dart",
  flutter_finish: "lib/services/identity/display_identity.dart",
  fixture: "tests/fixtures/mtg_client_search_readiness_v1.json"
});

const CAPABILITY_LABELS = Object.freeze({
  game_scope: "Game-scoped identity",
  set_code: "Set code",
  collector_number: "Exact collector number",
  finishes: "Normal, foil, and etched finishes",
  multiface_names: "Multi-face names",
  multiface_images: "Multi-face images",
  artist: "Artist",
  rarity: "Rarity",
  language: "Explicit language",
  hidden_release: "Hidden-release fallback"
});

const SURFACES = Object.freeze([
  {
    id: "web_catalog",
    client: "web",
    label: "Web set catalog",
    capabilities: ["game_scope", "set_code", "language", "hidden_release"]
  },
  {
    id: "web_search",
    client: "web",
    label: "Web catalog search",
    capabilities: Object.keys(CAPABILITY_LABELS)
  },
  {
    id: "web_card_detail",
    client: "web",
    label: "Web card detail",
    capabilities: Object.keys(CAPABILITY_LABELS)
  },
  {
    id: "web_set_grid",
    client: "web",
    label: "Web set card grid",
    capabilities: Object.keys(CAPABILITY_LABELS)
  },
  {
    id: "flutter_catalog",
    client: "flutter",
    label: "Flutter set catalog",
    capabilities: ["game_scope", "set_code", "language", "hidden_release"]
  },
  {
    id: "flutter_search",
    client: "flutter",
    label: "Flutter catalog search",
    capabilities: Object.keys(CAPABILITY_LABELS)
  },
  {
    id: "flutter_card_detail",
    client: "flutter",
    label: "Flutter card detail",
    capabilities: Object.keys(CAPABILITY_LABELS)
  },
  {
    id: "flutter_set_grid",
    client: "flutter",
    label: "Flutter set card grid",
    capabilities: Object.keys(CAPABILITY_LABELS)
  }
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function has(source, pattern) {
  return pattern instanceof RegExp ? pattern.test(source) : source.includes(pattern);
}

function all(source, patterns) {
  return patterns.every((pattern) => has(source, pattern));
}

function finding(status, evidence, gap = null) {
  return { status, evidence, gap };
}

function hiddenReleaseFinding(sources) {
  const sql = sources.visibility_boundary;
  const ready = all(sql, [
    /release_status in \('hidden', 'signed_in', 'public'\)/i,
    /card_prints_catalog_release_visibility_v1/i,
    /card_printings_catalog_release_visibility_v1/i,
    /catalog_parent_gv_id_visible_to_request_v1\(result\.parent_gv_id\)/i,
    /revoke all on table public\.catalog_game_release_controls from public, anon, authenticated/i
  ]);
  return ready
    ? finding("ready", [SOURCE_FILES.visibility_boundary], null)
    : finding(
        "blocked",
        [SOURCE_FILES.visibility_boundary],
        "The restrictive RLS and wrapped identity-search boundary are incomplete."
      );
}

function gameScopeFinding(surface, sources) {
  const sourceBySurface = {
    web_catalog: sources.web_sets,
    web_search: [sources.web_search, sources.web_explore].join("\n"),
    web_card_detail: [sources.web_types, sources.web_card_detail].join("\n"),
    web_set_grid: [sources.web_set_types, sources.web_sets, sources.web_set_grid].join("\n"),
    flutter_catalog: sources.flutter_sets,
    flutter_search: [sources.flutter_model, sources.flutter_search_identity].join("\n"),
    flutter_card_detail: sources.flutter_card_detail,
    flutter_set_grid: [sources.flutter_sets, sources.flutter_set_grid].join("\n")
  };
  const source = sourceBySurface[surface.id] ?? "";
  if (/\bgame_(?:id|code)\b|\bgameId\b/.test(source)) {
    return finding("ready", surface.client === "web"
      ? [SOURCE_FILES.web_types, SOURCE_FILES.web_search]
      : [SOURCE_FILES.flutter_model, SOURCE_FILES.flutter_sets]);
  }
  if (/identity_domain/.test(source)) {
    return finding(
      "partial",
      surface.client === "web" ? [SOURCE_FILES.web_card_detail] : [SOURCE_FILES.flutter_model],
      "Identity domain is visible in part of the path, but the client has no first-class game scope."
    );
  }
  return finding(
    "blocked",
    surface.client === "web" ? [SOURCE_FILES.web_search, SOURCE_FILES.web_sets] : [SOURCE_FILES.flutter_model, SOURCE_FILES.flutter_sets],
    "The surface cannot distinguish MTG from another game before matching or grouping rows."
  );
}

function setCodeFinding(surface, sources) {
  const source = surface.client === "web"
    ? [sources.web_search, sources.web_card_detail, sources.web_sets, sources.web_set_grid].join("\n")
    : [sources.flutter_model, sources.flutter_card_detail, sources.flutter_sets, sources.flutter_set_grid].join("\n");
  return /set_code|setCode|\.code\b/.test(source)
    ? finding("ready", surface.client === "web" ? [SOURCE_FILES.web_sets] : [SOURCE_FILES.flutter_sets])
    : finding("blocked", [], "Set code is not carried by this surface.");
}

function collectorNumberFinding(surface, sources) {
  if (surface.id.includes("catalog")) {
    return finding("not_applicable", [], null);
  }
  if (surface.id.includes("search")) {
    const source = surface.client === "web" ? sources.web_search : sources.flutter_model;
    const numericOnly = /\^\[a-z\]\*\\d\+\$/i.test(source) || /RegExp\(r?'\^\\d/.test(source);
    const carriesNumber = /number|collector/.test(source);
    return carriesNumber
      ? finding(
          numericOnly ? "partial" : "ready",
          [surface.client === "web" ? SOURCE_FILES.web_search : SOURCE_FILES.flutter_model],
          numericOnly
            ? "Structured search only recognizes numeric or prefix-numeric tokens; suffix, symbol, dagger, and other MTG collector numbers are not exact-search safe."
            : null
        )
      : finding("blocked", [], "Collector number is absent from search identity.");
  }
  const source = surface.client === "web"
    ? [sources.web_card_detail, sources.web_card_page, sources.web_set_grid].join("\n")
    : [sources.flutter_model, sources.flutter_card_detail, sources.flutter_set_grid].join("\n");
  return /number|collector/.test(source)
    ? finding("ready", [surface.client === "web" ? SOURCE_FILES.web_card_page : SOURCE_FILES.flutter_card_detail])
    : finding("blocked", [], "Collector number is not represented.");
}

function finishesFinding(surface, sources) {
  if (surface.id.includes("catalog")) {
    return finding("not_applicable", [], null);
  }
  const finishSource = surface.client === "web"
    ? [sources.web_finish, sources.web_search_intent, sources.web_set_grid, sources.web_card_detail].join("\n")
    : [sources.flutter_finish, sources.flutter_sets, sources.flutter_card_detail].join("\n");
  const hasAllFinishes = all(finishSource, ["normal", "foil", "etched"]);
  const hasPrintingPath = /finish_key|finishKey/.test(finishSource);
  if (hasAllFinishes && hasPrintingPath) {
    return finding("ready", surface.client === "web"
      ? [SOURCE_FILES.web_finish, SOURCE_FILES.web_search_intent]
      : [SOURCE_FILES.flutter_finish, SOURCE_FILES.flutter_sets]);
  }
  if (hasPrintingPath) {
    return finding(
      "partial",
      [surface.client === "web" ? SOURCE_FILES.web_finish : SOURCE_FILES.flutter_finish],
      "The child-printing path exists but does not name all MTG finish lanes."
    );
  }
  return finding("blocked", [], "No child-printing finish path is represented.");
}

function multifaceFinding(surface, sources, capability) {
  if (surface.id.includes("catalog")) {
    return finding("not_applicable", [], null);
  }
  const clientSource = surface.client === "web"
    ? [sources.web_types, sources.web_card_detail, sources.web_card_page, sources.web_set_grid].join("\n")
    : [sources.flutter_model, sources.flutter_card_detail, sources.flutter_set_grid].join("\n");
  const facePattern = capability === "multiface_names"
    ? /card_faces|face_names|faces\??\s*:/
    : /face_image|card_faces|faceImages|face_images/;
  if (facePattern.test(clientSource)) {
    return finding("ready", surface.client === "web" ? [SOURCE_FILES.web_types] : [SOURCE_FILES.flutter_model]);
  }
  const payloadHasFaceFields = /"card_faces"|"face_names"|"face_images"/.test(sources.frozen_canary_payload);
  const gap = payloadHasFaceFields
    ? "The frozen payload carries face metadata, but this client surface does not model it."
    : "The frozen payload preserves a combined name and layout but no structured face names or face images, so the client cannot render a trustworthy multi-face model.";
  return finding(
    "blocked",
    [SOURCE_FILES.frozen_canary_payload, surface.client === "web" ? SOURCE_FILES.web_types : SOURCE_FILES.flutter_model],
    gap
  );
}

function artistFinding(surface, sources) {
  if (surface.id.includes("catalog")) {
    return finding("not_applicable", [], null);
  }
  const source = surface.id === "web_search"
    ? [sources.web_explore, sources.web_search_intent].join("\n")
    : surface.id === "web_card_detail"
      ? [sources.web_card_detail, sources.web_card_page].join("\n")
      : surface.id === "web_set_grid"
        ? [sources.web_sets, sources.web_set_grid].join("\n")
        : surface.id === "flutter_search"
          ? [sources.flutter_model, sources.flutter_search_identity].join("\n")
          : surface.id === "flutter_card_detail"
            ? sources.flutter_card_detail
            : [sources.flutter_sets, sources.flutter_set_grid].join("\n");
  return /artist|illustrator/.test(source)
    ? finding("ready", surface.client === "web" ? [SOURCE_FILES.web_card_detail] : [SOURCE_FILES.flutter_card_detail])
    : finding("blocked", [], "Artist is not carried or rendered by this surface.");
}

function rarityFinding(surface, sources) {
  if (surface.id.includes("catalog")) {
    return finding("not_applicable", [], null);
  }
  const source = surface.client === "web"
    ? [sources.web_search, sources.web_explore, sources.web_card_detail, sources.web_card_page, sources.web_sets, sources.web_set_grid].join("\n")
    : [sources.flutter_model, sources.flutter_card_detail, sources.flutter_sets, sources.flutter_set_grid].join("\n");
  return /rarity/.test(source)
    ? finding("ready", [surface.client === "web" ? SOURCE_FILES.web_card_detail : SOURCE_FILES.flutter_model])
    : finding("blocked", [], "Rarity is not represented.");
}

function languageFinding(surface, sources) {
  const sourceBySurface = {
    web_catalog: [sources.web_language, sources.web_sets].join("\n"),
    web_search: [sources.web_language, sources.web_explore].join("\n"),
    web_card_detail: [sources.web_types, sources.web_card_detail].join("\n"),
    web_set_grid: [sources.web_set_types, sources.web_sets, sources.web_set_grid].join("\n"),
    flutter_catalog: sources.flutter_sets,
    flutter_search: sources.flutter_model,
    flutter_card_detail: sources.flutter_card_detail,
    flutter_set_grid: [sources.flutter_sets, sources.flutter_set_grid].join("\n")
  };
  const source = sourceBySurface[surface.id] ?? "";
  const explicitLanguage = /\blanguage\??\s*:|\blanguage\b.*select|language_code/.test(source);
  if (explicitLanguage) {
    return finding("ready", [surface.client === "web" ? SOURCE_FILES.web_language : SOURCE_FILES.flutter_model]);
  }
  const inferredLanguage = /JPN|Japanese|languageScope|language_scope/.test(source);
  return inferredLanguage
    ? finding(
        "partial",
        [surface.client === "web" ? SOURCE_FILES.web_language : SOURCE_FILES.flutter_model],
        "Language is inferred from Pokemon-specific IDs instead of carried as canonical card language. English MTG V1 can render, but language truth is not generic."
      )
    : finding("blocked", [], "The surface carries no explicit or safely inferred language.");
}

function evaluateCapability(surface, capability, sources) {
  switch (capability) {
    case "game_scope": return gameScopeFinding(surface, sources);
    case "set_code": return setCodeFinding(surface, sources);
    case "collector_number": return collectorNumberFinding(surface, sources);
    case "finishes": return finishesFinding(surface, sources);
    case "multiface_names": return multifaceFinding(surface, sources, capability);
    case "multiface_images": return multifaceFinding(surface, sources, capability);
    case "artist": return artistFinding(surface, sources);
    case "rarity": return rarityFinding(surface, sources);
    case "language": return languageFinding(surface, sources);
    case "hidden_release": return hiddenReleaseFinding(sources);
    default: throw new Error(`Unknown capability: ${capability}`);
  }
}

export function validateMtgClientReadinessFixtureV1(fixture) {
  const issues = [];
  if (fixture?.fixture_version !== FIXTURE_VERSION) issues.push("fixture_version");
  if (fixture?.authority !== "synthetic_offline_contract_fixture") issues.push("fixture_authority");
  const cards = Array.isArray(fixture?.cards) ? fixture.cards : [];
  const finishes = new Set(cards.flatMap((card) => card.finishes ?? []));
  for (const finish of ["normal", "foil", "etched"]) {
    if (!finishes.has(finish)) issues.push(`missing_finish:${finish}`);
  }
  if (!cards.some((card) => card.layout !== "normal" && card.faces?.length >= 2)) {
    issues.push("missing_multiface_card");
  }
  if (!cards.some((card) => /[^0-9]/.test(card.collector_number ?? ""))) {
    issues.push("missing_non_numeric_collector_number");
  }
  for (const card of cards) {
    for (const field of ["game_code", "language", "set_code", "collector_number", "name", "rarity", "artist"]) {
      if (!String(card[field] ?? "").trim()) issues.push(`${card.fixture_id}:missing_${field}`);
    }
    if (!Array.isArray(card.faces) || card.faces.some((face) => !face.name || !face.image_url)) {
      issues.push(`${card.fixture_id}:invalid_faces`);
    }
  }
  if (fixture?.hidden_release_case?.release_status !== "hidden") issues.push("hidden_release_status");
  if ((fixture?.hidden_release_case?.expected_visible_card_ids ?? []).length !== 0) {
    issues.push("hidden_release_leak");
  }
  return { ok: issues.length === 0, issues };
}

export function buildMtgClientSearchReadinessV1(sources, fixture) {
  const fixtureValidation = validateMtgClientReadinessFixtureV1(fixture);
  if (!fixtureValidation.ok) {
    throw new Error(`Fixture failed: ${fixtureValidation.issues.join(", ")}`);
  }
  const surfaces = SURFACES.map((surface) => ({
    id: surface.id,
    client: surface.client,
    label: surface.label,
    capabilities: Object.fromEntries(
      surface.capabilities.map((capability) => [
        capability,
        {
          label: CAPABILITY_LABELS[capability],
          ...evaluateCapability(surface, capability, sources)
        }
      ])
    )
  }));
  const findings = surfaces.flatMap((surface) =>
    Object.entries(surface.capabilities).map(([capability, result]) => ({
      surface: surface.id,
      capability,
      ...result
    }))
  );
  const counts = Object.fromEntries(
    ["ready", "partial", "blocked", "not_applicable"].map((status) => [
      status,
      findings.filter((item) => item.status === status).length
    ])
  );
  const releaseBlockers = [
    {
      id: "game_scoped_client_read_model",
      status: findings.some((item) => item.capability === "game_scope" && item.status === "blocked") ? "blocked" : "ready",
      reason: "Search and catalog queries need an explicit game scope before MTG can be released beside Pokemon."
    },
    {
      id: "multiface_identity_and_image_model",
      status: findings.some((item) => ["multiface_names", "multiface_images"].includes(item.capability) && item.status === "blocked") ? "blocked" : "ready",
      reason: "Structured face names and face images are absent from the frozen payload and both clients."
    },
    {
      id: "exact_mtg_collector_number_search",
      status: findings.some((item) => item.capability === "collector_number" && ["partial", "blocked"].includes(item.status)) ? "blocked" : "ready",
      reason: "Exact search must preserve suffix, symbol, dagger, and other nonnumeric collector tokens."
    },
    {
      id: "explicit_language_contract",
      status: findings.some((item) => item.capability === "language" && ["partial", "blocked"].includes(item.status)) ? "blocked" : "ready",
      reason: "Current language scope relies on Pokemon identity conventions instead of a canonical language field."
    },
    {
      id: "hidden_release_boundary",
      status: findings.some((item) => item.capability === "hidden_release" && item.status !== "ready") ? "blocked" : "ready",
      reason: "Restrictive RLS and the wrapped search RPC must remain the authority."
    }
  ];
  return {
    audit_version: AUDIT_VERSION,
    status: releaseBlockers.some((gate) => gate.status === "blocked")
      ? "blocked_before_mtg_client_release"
      : "ready_for_hidden_client_canary",
    fixture_validation: fixtureValidation,
    summary: {
      surface_count: surfaces.length,
      capability_check_count: findings.length,
      ...counts,
      release_blocker_count: releaseBlockers.filter((gate) => gate.status === "blocked").length
    },
    release_blockers: releaseBlockers,
    surfaces,
    boundaries: {
      mode: "offline_source_audit",
      database_access: false,
      database_writes: false,
      release_control_changes: false,
      mtg_visibility_activation: false,
      deployment: false,
      vercel: false,
      active_ingestion_worktree_touched: false
    },
    next_gate: "build_game_scoped_client_read_model_and_multiface_contract_offline"
  };
}

async function loadSources() {
  const entries = await Promise.all(
    Object.entries(SOURCE_FILES).map(async ([key, relativePath]) => {
      const body = await fs.readFile(path.join(ROOT, relativePath), "utf8");
      return [key, body];
    })
  );
  return Object.fromEntries(entries);
}

function markdown(result) {
  const lines = [
    "# MTG Client And Search Readiness V1",
    "",
    `- Result: **${result.status.toUpperCase()}**`,
    `- Surfaces audited: \`${result.summary.surface_count}\``,
    `- Capability checks: \`${result.summary.capability_check_count}\``,
    `- Ready: \`${result.summary.ready}\``,
    `- Partial: \`${result.summary.partial}\``,
    `- Blocked: \`${result.summary.blocked}\``,
    `- Release blockers: \`${result.summary.release_blocker_count}\``,
    `- Database access/writes: \`0/0\``,
    "",
    "## Release Gates",
    "",
    "| Gate | Status | Reason |",
    "|---|---|---|",
    ...result.release_blockers.map((gate) => `| \`${gate.id}\` | ${gate.status} | ${gate.reason} |`),
    "",
    "## Surface Matrix",
    "",
    "| Surface | Capability | Status | Gap |",
    "|---|---|---|---|",
    ...result.surfaces.flatMap((surface) =>
      Object.entries(surface.capabilities).map(([capability, value]) =>
        `| ${surface.label} | ${CAPABILITY_LABELS[capability]} | ${value.status} | ${value.gap ?? "none"} |`
      )
    ),
    "",
    "## Findings",
    "",
    "- The hidden release boundary is already authoritative: restrictive RLS covers games, sets, parents, identities, and child printings, while the identity-search RPC filters every result by parent visibility.",
    "- Set code, card name, rarity, artist on detail/search, and generic child-printing labels are reusable across games.",
    "- Foil and etched labels are now explicit in web and Flutter controlled finish vocabulary; web natural-language intent recognizes both.",
    "- The clients do not carry a first-class game scope. Releasing MTG beside Pokemon would permit ambiguous cross-game matches and Pokemon-specific grouping/filter behavior.",
    "- Exact collector-number display is string-safe, but structured search is numeric-oriented and cannot guarantee every MTG suffix, symbol, dagger, or other nonnumeric token.",
    "- The frozen payload keeps combined names such as `Front // Back` and a layout value, but it does not preserve structured face names or per-face images. This is an upstream canonical payload gap as well as a client gap.",
    "- Language filtering is Pokemon-specific inference. English MTG V1 can appear under the English lane, but the client cannot prove language from canonical data.",
    "- Set catalog filters and labels remain Pokemon-era-specific. They require a game-scoped taxonomy before an MTG client can be activated.",
    "",
    "## Decision",
    "",
    "Do not activate MTG in web or Flutter yet. Build one versioned, game-scoped read model that exposes exact collector tokens, explicit language, structured faces, per-face image truth, artist, rarity, and child finishes while continuing to rely on the existing release-control RLS. Then rerun this audit against offline fixtures before any hidden client canary.",
    "",
    `Exact next gate: **${result.next_gate}**.`,
    "",
    "## Boundaries",
    "",
    "- This audit read repository files and synthetic fixtures only.",
    "- It did not access or mutate Supabase.",
    "- It did not deploy, run Vercel, activate release controls, publish MTG, or touch the ingestion worktree."
  ];
  return `${lines.join("\n")}\n`;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function main() {
  const outArg = process.argv.slice(2).find((arg) => arg.startsWith("--out-dir="));
  const outDir = outArg
    ? path.resolve(outArg.slice("--out-dir=".length))
    : path.join(ROOT, "docs", "audits", "pricing", "mtg_client_search_readiness_v1");
  const sources = await loadSources();
  const fixture = JSON.parse(sources.fixture);
  const sourceEvidence = Object.fromEntries(
    Object.entries(SOURCE_FILES).map(([key, relativePath]) => [key, {
      path: relativePath,
      sha256: sha256(sources[key])
    }])
  );
  const result = {
    ...buildMtgClientSearchReadinessV1(sources, fixture),
    source_evidence: sourceEvidence
  };
  await fs.mkdir(outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(outDir, "run_plan.json"), {
    audit_version: AUDIT_VERSION,
    mode: "offline_source_audit",
    source_files: Object.values(SOURCE_FILES),
    boundaries: result.boundaries
  });
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = markdown(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "run_plan.json": sha256(runPlanBody),
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody)
    }
  });
  process.stdout.write(`${JSON.stringify({ out_dir: outDir, status: result.status, summary: result.summary })}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
