import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const PACKAGE_ID = "COLLABORATIVE-BINDERS-ACTIVATION-V1";
const PACKAGE_FINGERPRINT =
  "877ca9e3d53bb9b2593532b8be66b0f0e10de039a841bb0a3482e04ee237cb67";
const INSTALLATION_PACKAGE_ID = "COLLABORATIVE-BINDERS-DB-V1";
const INSTALLATION_PACKAGE_FINGERPRINT =
  "14a235d9ca9bc2172ddd3bfb8e2ba8b8812849079fe0469b73f35d02b6b47fb9";
const INSTALLATION_HEAD_SHA =
  "a29680bdf79409823eedab8a62f0bd5cc89d675c";
const PRODUCTION_PROJECT_REF = "ycdxbpibncqcchqiihfz";
const CANONICAL_REPOSITORY = "OriginalSoseji/grookai_vault";
const WINDOWS_ONLY = process.platform === "win32";

const MANIFEST_PATH =
  "scripts/ops/collaborative_binders_activation_manifest_v1.json";
const MODULE_PATH = "scripts/ops/CollaborativeBindersActivationV1.psm1";
const SOURCE_VALIDATOR_PATH =
  "scripts/ops/collaborative_binders_activation_source_validate_v1.ps1";
const PREFLIGHT_PATH =
  "scripts/ops/collaborative_binders_activation_preflight_v1.ps1";
const APPLY_PATH = "scripts/ops/collaborative_binders_activation_apply_v1.ps1";
const BACKUP_WATCH_PATH =
  "scripts/ops/collaborative_binders_backup_watch_v1.ps1";
const CLIENTS_DARK_EVIDENCE_PATH =
  "scripts/ops/collaborative_binders_clients_dark_evidence_v1.ps1";
const RECOVERY_PATH =
  "scripts/ops/collaborative_binders_activation_recovery_v1.ps1";
const KILL_SWITCH_PATH =
  "scripts/ops/collaborative_binders_activation_kill_switch_v1.ps1";
const READBACK_PATH =
  "scripts/ops/sql/collaborative_binders_activation_readback_v1.sql";
const KILL_SWITCH_SQL_PATH =
  "scripts/ops/sql/collaborative_binders_activation_kill_switch_v1.sql";

const ACTIVATION_WRAPPERS = [
  {
    role: "source_validate",
    file: SOURCE_VALIDATOR_PATH,
  },
  {
    role: "preflight",
    file: PREFLIGHT_PATH,
  },
  {
    role: "apply",
    file: APPLY_PATH,
  },
  {
    role: "recovery",
    file: RECOVERY_PATH,
  },
  {
    role: "kill_switch",
    file: KILL_SWITCH_PATH,
  },
];

const WEB_CLIENT_FLAGS = [
  "GROOKAI_BINDERS_SCHEMA_RPC_V1_ENABLED",
  "GROOKAI_BINDERS_PERSONAL_V1_ENABLED",
  "GROOKAI_BINDERS_SHARED_V1_ENABLED",
  "GROOKAI_BINDERS_VIEW_LINKS_V1_ENABLED",
  "GROOKAI_BINDERS_PUBLIC_V1_ENABLED",
  "GROOKAI_BINDERS_COMMUNITY_V1_ENABLED",
  "GROOKAI_BINDERS_TEMPLATES_V1_ENABLED",
  "GROOKAI_BINDERS_NOTIFICATIONS_V1_ENABLED",
  "GROOKAI_BINDERS_PULSE_SHARING_V1_ENABLED",
  "GROOKAI_BINDERS_SET_V1_ENABLED",
  "GROOKAI_BINDERS_CUSTOM_V1_ENABLED",
];

const SAMSUNG_CLIENT_FLAGS = [
  "BINDERS_SCHEMA_V1",
  "BINDERS_PERSONAL_V1",
  "BINDERS_SHARED_V1",
  "BINDERS_VIEW_LINKS_V1",
  "BINDERS_PUBLIC_V1",
  "BINDERS_COMMUNITY_V1",
  "BINDERS_TEMPLATES_V1",
  "BINDERS_NOTIFICATIONS_V1",
  "BINDERS_PULSE_SHARING_V1",
  "BINDERS_SET_TARGET_V1",
  "BINDERS_CUSTOM_TARGET_V1",
];

const EXPECTED_CLI = {
  version: "2.90.0",
  launcher: "140e3801d8adeda639a21b14e62b93a4c7d26b7a758421f43c82be59753be49b",
  binary: "31c2a25bd590a36ad803a7c669cf76a62eac3cd5aa7112eeb2e1c5f308c8b39c",
  shim: "0c68f69a367b2b76e61f3e71fb98c9a867143628a361a2e715dd30f33c4b2c3f",
};

const CANONICAL_FLAGS = [
  "community",
  "custom",
  "notifications",
  "personal",
  "public",
  "pulse_milestones",
  "schema_internal",
  "set_binders",
  "shared",
  "templates",
  "view_links",
];

const EXCLUDED_FLAGS = ["notifications", "pulse_milestones", "set_binders"];

const FINAL_ENABLED_FLAGS = [
  "community",
  "custom",
  "personal",
  "public",
  "schema_internal",
  "shared",
  "templates",
  "view_links",
];

const EXPECTED_PHASES = [
  {
    sequence: 1,
    flag_key: "schema_internal",
    file: "scripts/ops/sql/collaborative_binders_activation_01_schema_internal_v1.sql",
    sha256: "957eaf94a1b988b3563af5183aa5928f23566c58506ff26de7d9e1447b21bcc8",
    enabled_before: [],
    enabled_after: ["schema_internal"],
  },
  {
    sequence: 2,
    flag_key: "personal",
    file: "scripts/ops/sql/collaborative_binders_activation_02_personal_v1.sql",
    sha256: "dcda58cde5a01414eff85feecdd90e50f89a8a9fd8aa4478a3c2130ae0a93330",
    enabled_before: ["schema_internal"],
    enabled_after: ["personal", "schema_internal"],
  },
  {
    sequence: 3,
    flag_key: "shared",
    file: "scripts/ops/sql/collaborative_binders_activation_03_shared_v1.sql",
    sha256: "794a339bb934586f3c9014b4ce8e18a705b4528e962984c8723f14617f1c5fce",
    enabled_before: ["personal", "schema_internal"],
    enabled_after: ["personal", "schema_internal", "shared"],
  },
  {
    sequence: 4,
    flag_key: "view_links",
    file: "scripts/ops/sql/collaborative_binders_activation_04_view_links_v1.sql",
    sha256: "509d680e88e5ffb17d5cdb37d00bba1e4759fce553a32c1f6a0aba1790205fe6",
    enabled_before: ["personal", "schema_internal", "shared"],
    enabled_after: ["personal", "schema_internal", "shared", "view_links"],
  },
  {
    sequence: 5,
    flag_key: "public",
    file: "scripts/ops/sql/collaborative_binders_activation_05_public_v1.sql",
    sha256: "b05933ab916f9c87c59858da8784fe9b41ba2edaeeabf53bd53d9beac61bc70d",
    enabled_before: ["personal", "schema_internal", "shared", "view_links"],
    enabled_after: [
      "personal",
      "public",
      "schema_internal",
      "shared",
      "view_links",
    ],
  },
  {
    sequence: 6,
    flag_key: "community",
    file: "scripts/ops/sql/collaborative_binders_activation_06_community_v1.sql",
    sha256: "b744019a8af97990ca2b4ef1424536c6c5d966277b03d40ccdc2b7367615c015",
    enabled_before: [
      "personal",
      "public",
      "schema_internal",
      "shared",
      "view_links",
    ],
    enabled_after: [
      "community",
      "personal",
      "public",
      "schema_internal",
      "shared",
      "view_links",
    ],
  },
  {
    sequence: 7,
    flag_key: "custom",
    file: "scripts/ops/sql/collaborative_binders_activation_07_custom_v1.sql",
    sha256: "4e97476b8a215012ea7848d3e418bdb4286a0042e2bc1e46f41a21c04ca46e93",
    enabled_before: [
      "community",
      "personal",
      "public",
      "schema_internal",
      "shared",
      "view_links",
    ],
    enabled_after: [
      "community",
      "custom",
      "personal",
      "public",
      "schema_internal",
      "shared",
      "view_links",
    ],
  },
  {
    sequence: 8,
    flag_key: "templates",
    file: "scripts/ops/sql/collaborative_binders_activation_08_templates_v1.sql",
    sha256: "cae2d7c5a7462f630925865e503e41a904b676073324c125335c4af02013fc42",
    enabled_before: [
      "community",
      "custom",
      "personal",
      "public",
      "schema_internal",
      "shared",
      "view_links",
    ],
    enabled_after: FINAL_ENABLED_FLAGS,
  },
];

function absolute(relativePath) {
  return path.join(REPO_ROOT, ...relativePath.split("/"));
}

function source(relativePath) {
  return readFileSync(absolute(relativePath), "utf8");
}

function psLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function runActivationPowerShell(script) {
  const encoded = Buffer.from(script, "utf8").toString("base64");
  const command = [
    "$ErrorActionPreference = 'Stop'",
    `$activationModule = Import-Module ${psLiteral(
      absolute(MODULE_PATH),
    )} -Force -PassThru`,
    "$scriptText = [Text.Encoding]::UTF8.GetString(" +
      `[Convert]::FromBase64String('${encoded}'))`,
    "& ([scriptblock]::Create($scriptText)) $activationModule",
  ].join("; ");

  return spawnSync(
    "pwsh",
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      windowsHide: true,
    },
  );
}

function bytes(relativePath) {
  return readFileSync(absolute(relativePath));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compactCanonicalFingerprint(manifest) {
  const { package_fingerprint_sha256: _fingerprint, ...core } = manifest;
  return sha256(JSON.stringify(core));
}

function stripSqlCommentsAndStrings(sql) {
  return sql
    .replace(/--[^\r\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)\$[\s\S]*?\$\1\$/g, "$$")
    .replace(/\$\$[\s\S]*?\$\$/g, "$$")
    .replace(/'(?:''|[^'])*'/g, "''");
}

function sqlTextArray(values) {
  if (values.length === 0) {
    return "array[]::text[]";
  }
  return `array[${values.map((value) => `'${value}'`).join(",")}]::text[]`;
}

function functionBody(powerShell, functionName) {
  const marker = `function ${functionName}`;
  const start = powerShell.indexOf(marker);
  assert.notEqual(start, -1, `Missing PowerShell function ${functionName}.`);
  const next = powerShell.indexOf("\nfunction ", start + marker.length);
  return powerShell.slice(start, next === -1 ? undefined : next);
}

function assertPowerShell7Declaration(relativePath) {
  const text = source(relativePath).replace(/^\uFEFF/, "");
  assert.ok(
    /^#requires\s+-Version\s+7(?:\.\d+){0,2}\s*(?:\r?\n)/i.test(text),
    `${relativePath} must declare its PowerShell 7 runtime before executable code.`,
  );
}

function assertOnePreparedStatement(sql, label) {
  const stripped = stripSqlCommentsAndStrings(sql);
  assert.equal(
    (stripped.match(/;/g) ?? []).length,
    1,
    `${label} must contain exactly one prepared statement terminator.`,
  );
  return stripped;
}

function assertContentAddressedEntry(entry, expectedPath, label) {
  assert.ok(entry && typeof entry === "object", `${label} is missing.`);
  assert.equal(entry.file, expectedPath, `${label} path is not fixed.`);
  assert.match(entry.sha256, /^[0-9a-f]{64}$/, `${label} hash is invalid.`);
  assert.ok(existsSync(absolute(entry.file)), `${label} source is missing.`);
  assert.equal(
    sha256(bytes(entry.file)),
    entry.sha256,
    `${label} source hash drifted.`,
  );
}

function assertToolchainAndProjectSealSet(powerShell, label) {
  const sealStart = powerShell.indexOf("$sealPaths = @(");
  const sealEnd = powerShell.indexOf("$sealStreams", sealStart);
  assert.notEqual(sealStart, -1, `${label} has no static seal set.`);
  assert.notEqual(sealEnd, -1, `${label} seal set is not bounded.`);
  const sealBlock = powerShell.slice(sealStart, sealEnd);
  for (const [name, pattern] of [
    ["Supabase config", /\$[A-Za-z0-9_]*config[A-Za-z0-9_]*path/i],
    [
      "linked project ref",
      /\$[A-Za-z0-9_]*project[A-Za-z0-9_]*ref[A-Za-z0-9_]*path/i,
    ],
    ["CLI binary", /\$[A-Za-z0-9_]*binary[A-Za-z0-9_]*path/i],
    ["CLI launcher", /\$[A-Za-z0-9_]*launcher[A-Za-z0-9_]*path/i],
    ["CLI shim", /\$[A-Za-z0-9_]*shim[A-Za-z0-9_]*path/i],
    ["activation manifest", /\$[A-Za-z0-9_]*manifest[A-Za-z0-9_]*path/i],
    ["activation readback", /\$[A-Za-z0-9_]*readback[A-Za-z0-9_]*path/i],
    ["continuity evidence", /\$[A-Za-z0-9_]*evidence[A-Za-z0-9_]*/i],
  ]) {
    assert.ok(pattern.test(sealBlock), `${label} does not seal ${name}.`);
  }
  return sealBlock;
}

const manifest = JSON.parse(source(MANIFEST_PATH));
const moduleSource = source(MODULE_PATH);

test("activation manifest is one exact content-addressed package", () => {
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.package_id, PACKAGE_ID);
  assert.equal(manifest.package_fingerprint_sha256, PACKAGE_FINGERPRINT);
  assert.equal(
    compactCanonicalFingerprint(manifest),
    manifest.package_fingerprint_sha256,
  );
  assert.equal(manifest.production_project_ref, PRODUCTION_PROJECT_REF);
  assert.equal(manifest.canonical_git_repository, CANONICAL_REPOSITORY);
  assert.equal(
    manifest.required_installation_package_id,
    INSTALLATION_PACKAGE_ID,
  );
  assert.equal(
    manifest.required_installation_package_fingerprint_sha256,
    INSTALLATION_PACKAGE_FINGERPRINT,
  );
  assert.equal(
    manifest.required_installation_head_sha,
    INSTALLATION_HEAD_SHA,
  );
  assert.equal(manifest.supported_supabase_cli_version, EXPECTED_CLI.version);
  assert.equal(manifest.supabase_cli_launcher_sha256, EXPECTED_CLI.launcher);
  assert.equal(manifest.supabase_cli_binary_sha256, EXPECTED_CLI.binary);
  assert.equal(manifest.supabase_cli_shim_descriptor_sha256, EXPECTED_CLI.shim);

  const hashedEntries = [
    manifest.production_rollout_module,
    manifest.production_manifest,
    manifest.installation_readback,
    manifest.activation_readback,
    ...manifest.phases,
  ];
  const paths = new Set();
  for (const entry of hashedEntries) {
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
    assert.ok(!paths.has(entry.file), `Duplicate hashed source ${entry.file}.`);
    paths.add(entry.file);
    assert.equal(
      sha256(bytes(entry.file)),
      entry.sha256,
      `Manifest hash drift: ${entry.file}`,
    );
  }
  assert.equal(manifest.activation_readback.file, READBACK_PATH);
});

test("activation vectors are contiguous, exact, and exclude P8 surfaces", () => {
  assert.deepEqual(manifest.phases, EXPECTED_PHASES);
  assert.deepEqual(manifest.canonical_flags, CANONICAL_FLAGS);
  assert.deepEqual(manifest.final_enabled_flags, FINAL_ENABLED_FLAGS);
  assert.deepEqual(manifest.excluded_flags, EXCLUDED_FLAGS);
  assert.equal(manifest.excluded_project_phase, "P8");
  assert.equal(
    manifest.installation_evidence_ttl_hours,
    24,
    "Initial installation evidence must stay within the accepted daily-backup horizon.",
  );
  assert.equal(
    manifest.prior_evidence_ttl_hours,
    2,
    "Phase-to-phase evidence must keep its narrow two-hour window.",
  );

  let before = [];
  const seenTargets = new Set();
  for (const phase of manifest.phases) {
    assert.equal(phase.sequence, seenTargets.size + 1);
    assert.ok(!seenTargets.has(phase.flag_key));
    assert.ok(!EXCLUDED_FLAGS.includes(phase.flag_key));
    assert.notEqual(phase.flag_key.toLowerCase(), "p8");
    assert.doesNotMatch(phase.file, /p8/i);
    assert.deepEqual(phase.enabled_before, before);
    const after = [...before, phase.flag_key].sort();
    assert.deepEqual(phase.enabled_after, after);
    assert.equal(
      phase.enabled_after.some((flag) => EXCLUDED_FLAGS.includes(flag)),
      false,
    );
    seenTargets.add(phase.flag_key);
    before = after;
  }
  assert.deepEqual(before, FINAL_ENABLED_FLAGS);
});

test("every activation phase is a one-statement one-target compare-and-set", () => {
  const forbidden =
    /\b(?:insert|delete|merge|call|do|execute|alter|create|drop|truncate|copy|grant|revoke)\b/gi;

  for (const phase of manifest.phases) {
    const sql = source(phase.file);
    const stripped = assertOnePreparedStatement(sql, phase.file);

    assert.equal(
      (stripped.match(/(?:^|\r?\n)\s*update\b/gi) ?? []).length,
      1,
      `${phase.file} must contain exactly one UPDATE statement.`,
    );
    assert.equal(
      (
        stripped.match(
          /(?:^|\r?\n)\s*update\s+public\.binder_feature_flags\s+target\b/gi,
        ) ?? []
      ).length,
      1,
      `${phase.file} must use the one literal UPDATE target.`,
    );
    assert.doesNotMatch(
      stripped,
      forbidden,
      `${phase.file} contains a forbidden SQL operation.`,
    );
    assert.match(
      stripped,
      /\bupdate\s+public\.binder_feature_flags\s+target\b/i,
    );
    assert.match(stripped, /\bset\s+enabled\s*=\s*true\b/i);
    assert.match(
      stripped,
      new RegExp(String.raw`\bwhere\s+target\.flag_key\s*=\s*''`, "i"),
    );
    assert.match(
      sql,
      new RegExp(
        String.raw`where\s+target\.flag_key\s*=\s*'${phase.flag_key}'`,
        "i",
      ),
    );
    assert.match(sql, /and\s+target\.enabled\s*=\s*false/i);
    assert.match(sql, /pg_try_advisory_xact_lock/i);
    assert.match(sql, /for\s+update\s+of\s+f\s+nowait/i);
    assert.match(
      sql.replace(/\s+/g, ""),
      new RegExp(
        sqlTextArray(phase.enabled_before)
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\s+/g, ""),
        "i",
      ),
      `${phase.file} does not pin the exact before vector.`,
    );
    assert.match(
      sql,
      new RegExp(
        `'enabled_after'\\s*,\\s*'${JSON.stringify(phase.enabled_after).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        )}'::jsonb`,
        "i",
      ),
    );
    assert.match(sql, /change_summary\.updated_rows\s*=\s*1/i);
    assert.match(sql, /and\s+domain\.binder_domain_empty/i);
    assert.match(sql, /and\s+domain\.binder_card_events_empty/i);
    assert.match(sql, /and\s+domain\.binder_trust_reports_empty/i);
    assert.doesNotMatch(sql, /\bP8\b/i);
  }
});

test("activation readback is immutable, read-only, and proves raw/effective vectors", () => {
  assert.equal(
    manifest.activation_readback.sha256,
    sha256(bytes(READBACK_PATH)),
  );
  const sql = source(READBACK_PATH);
  const stripped = stripSqlCommentsAndStrings(sql);
  assert.doesNotMatch(
    stripped,
    /\b(?:insert|update|delete|merge|call|do|execute|alter|create|drop|truncate|copy|grant|revoke)\b/i,
  );
  assert.match(sql, /as\s+enabled_flags/i);
  assert.match(sql, /as\s+effective_enabled_flags/i);
  assert.match(sql, /effective_enabled_flags\s*=\s*enabled_flags/i);
  assert.match(sql, /enabled_flag_count\s+between\s+0\s+and\s+8/i);
  assert.match(sql, /enabled_flags\s*<@\s*'\[/i);
  assert.match(
    sql,
    /enabled_flags\s+\?\|\s+array\[\s*'notifications',\s*'pulse_milestones',\s*'set_binders'/i,
  );
  assert.match(sql, /nonempty_domain_tables\s*=\s*'\[\]'::jsonb/i);
  assert.match(sql, /not\s+binder_card_event_data_exists/i);
  assert.match(sql, /not\s+binder_trust_report_data_exists/i);
  assert.match(sql, /'read_only',\s*true/i);
  assert.match(sql, /'phase',\s*'activation'/i);
});

test("every activation entrypoint explicitly requires PowerShell 7", () => {
  for (const relativePath of [
    MODULE_PATH,
    SOURCE_VALIDATOR_PATH,
    PREFLIGHT_PATH,
    APPLY_PATH,
    BACKUP_WATCH_PATH,
  ]) {
    assertPowerShell7Declaration(relativePath);
  }
});

test("source validation and final apply seals cover project binding and exact CLI identity", () => {
  const sourceBody = functionBody(
    moduleSource,
    "Assert-BinderActivationSourceV1",
  );
  const applyBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationApplyV1",
  );
  const sealStart = applyBody.indexOf("$sealPaths = @(");
  const sealEnd = applyBody.indexOf("$sealStreams", sealStart);
  assert.notEqual(sealStart, -1, "Apply has no static seal set.");
  assert.notEqual(sealEnd, -1, "Apply seal set is not bounded.");
  const sealBlock = applyBody.slice(sealStart, sealEnd);

  for (const field of [
    "supported_supabase_cli_version",
    "supabase_cli_launcher_sha256",
    "supabase_cli_binary_sha256",
    "supabase_cli_shim_descriptor_sha256",
  ]) {
    assert.ok(
      new RegExp(field, "i").test(sourceBody),
      `Source validation does not compare ${field}.`,
    );
  }
  assert.ok(/Resolve-BinderSupabaseExecutableV1/i.test(sourceBody));
  assert.ok(/BinaryPath/i.test(sourceBody));
  assert.ok(/LauncherPath/i.test(sourceBody));
  assert.ok(/ShimDescriptorPath/i.test(sourceBody));

  assert.ok(/supabase[\\/]+config\.toml/i.test(moduleSource));
  assert.ok(/supabase[\\/]+\.temp[\\/]+project-ref/i.test(moduleSource));
  assert.ok(/\$[A-Za-z0-9_]*config[A-Za-z0-9_]*path/i.test(sealBlock));
  assert.ok(
    /\$[A-Za-z0-9_]*project[A-Za-z0-9_]*ref[A-Za-z0-9_]*path/i.test(sealBlock),
  );
  assert.ok(/\$[A-Za-z0-9_]*binary[A-Za-z0-9_]*path/i.test(sealBlock));
  assert.ok(/\$[A-Za-z0-9_]*launcher[A-Za-z0-9_]*path/i.test(sealBlock));
  assert.ok(/\$[A-Za-z0-9_]*shim[A-Za-z0-9_]*path/i.test(sealBlock));
  assert.ok(
    /Open-BinderActivationSealV1\s+-Paths\s+\$sealPaths/i.test(applyBody),
  );
  assert.ok(
    applyBody.indexOf("Open-BinderActivationSealV1") <
      applyBody.indexOf("$mutationStarted = $true"),
    "All source/toolchain seals must be held before mutation starts.",
  );
  assert.ok(
    applyBody.indexOf("Close-BinderActivationSealV1") >
      applyBody.indexOf("diagnostic-readback.json"),
    "Source/toolchain seals must remain held through diagnostics.",
  );
});

test("prior sibling apply evidence enforces exact phase and catalog continuity", () => {
  const priorBody = functionBody(
    moduleSource,
    "Test-BinderActivationPriorEvidenceV1",
  );
  const applyBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationApplyV1",
  );

  assert.ok(
    /\$resultPath\s*=\s*Join-Path\s+\$root\s+'apply-result\.json'/i.test(
      priorBody,
    ),
  );
  assert.ok(
    /\$readbackPath\s*=\s*Join-Path\s+\$root\s+'readback\.after\.json'/i.test(
      priorBody,
    ),
  );
  assert.ok(
    /Test-BinderActivationChecksumsV1\s+-Root\s+\$root/i.test(priorBody),
  );
  assert.match(
    priorBody,
    /\[int\]\$Phase\.sequence\s*-eq\s*1[\s\S]*?Assert-BinderInstallationEvidenceRootV1[\s\S]*?else\s*{[\s\S]*?Assert-BinderActivationArtifactRootV1/i,
  );
  assert.ok(/\$result\.head_sha\s*-ceq\s*\$ExpectedHeadSha/i.test(priorBody));
  assert.ok(/\$result\.project_ref\s*-ceq/i.test(priorBody));
  assert.ok(/\$result\.package_fingerprint_sha256/i.test(priorBody));
  assert.ok(
    /\$expectedPreviousSequence\s*=\s*\[int\]\$Phase\.sequence\s*-\s*1/i.test(
      priorBody,
    ),
  );
  assert.ok(/\$result\.enabled_flags_after/i.test(priorBody));
  assert.ok(/\$readback\.checks\.enabled_flags/i.test(priorBody));
  assert.ok(/\$readback\.checks\.effective_enabled_flags/i.test(priorBody));
  assert.ok(/StableCatalogFingerprintSha256/i.test(priorBody));
  const priorTimeBody = functionBody(
    moduleSource,
    "Assert-BinderActivationPriorEvidenceTimeV1",
  );
  assert.match(
    priorTimeBody,
    /\$PhaseSequence\s*-eq\s*1[\s\S]*?installation_evidence_ttl_hours[\s\S]*?else\s*{[\s\S]*?prior_evidence_ttl_hours/i,
  );
  assert.match(priorTimeBody, /AddHours\(-\$ttlHours\)/i);
  assert.match(
    priorBody,
    /Assert-BinderActivationPriorEvidenceTimeV1/i,
  );
  assert.ok(/mutation_termination_confirmed/i.test(priorBody));

  assert.ok(/Join-Path\s+\$applyRoot\s+'apply-result\.json'/i.test(applyBody));
  assert.ok(
    /Join-Path\s+\$applyRoot\s+'readback\.after\.json'/i.test(applyBody),
  );
  assert.ok(
    /Write-BinderActivationChecksumsV1\s+-Root\s+\$applyRoot/i.test(applyBody),
  );
});

test("activation continuity preserves explicit recovery and backup evidence", () => {
  const priorBody = functionBody(
    moduleSource,
    "Test-BinderActivationPriorEvidenceV1",
  );
  const manifestBody = functionBody(
    moduleSource,
    "New-BinderActivationManifestV1",
  );
  const preflightBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationPreflightV1",
  );
  const applyBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationApplyV1",
  );

  assert.ok(/AddMinutes\(30\)/i.test(manifestBody));
  assert.ok(/stable_catalog_fingerprint_sha256/i.test(preflightBody));
  assert.ok(/prior_evidence_checksum_sha256/i.test(applyBody));

  for (const field of [
    "backup_kind",
    "backup_verified_at_utc",
    "backup_recoverable_through_utc",
    "backup_evidence_reference",
    "backup_evidence_sha256",
    "restore_path_reviewed",
  ]) {
    assert.ok(
      new RegExp(field, "i").test(priorBody),
      `Prior evidence does not validate ${field}.`,
    );
    assert.ok(
      new RegExp(field, "i").test(manifestBody),
      `Activation preflight manifest does not carry ${field}.`,
    );
    assert.ok(
      new RegExp(field, "i").test(applyBody),
      `Activation apply result does not preserve ${field}.`,
    );
  }
  for (const field of [
    "activation_head_sha",
    "installation_evidence_head_sha",
  ]) {
    for (const [label, body] of [
      ["prior evidence", priorBody],
      ["preflight manifest", manifestBody],
      ["activation apply", applyBody],
    ]) {
      assert.ok(
        body.toLowerCase().includes(field),
        `${label} does not preserve ${field}.`,
      );
    }
  }
  assert.ok(/restore_path_reviewed\s*-eq\s*\$true/i.test(priorBody));
  assert.ok(/recoverable/i.test(priorBody));
  assert.ok(/PriorEvidenceRoot/i.test(preflightBody));
});

test("stopped activation performs state-neutral diagnostics and forbids retry", () => {
  const applyBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationApplyV1",
  );
  assert.ok(
    /function Invoke-BinderActivationDiagnosticReadbackV1/i.test(moduleSource),
  );
  const diagnosticBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationDiagnosticReadbackV1",
  );

  assert.ok(/enabled_flags/i.test(diagnosticBody));
  assert.ok(/effective_enabled_flags/i.test(diagnosticBody));
  assert.doesNotMatch(
    diagnosticBody,
    /\[Parameter\(Mandatory\s*=\s*\$true\)\]\s*\[string\[\]\]\$ExpectedEnabledFlags/i,
  );

  const catchStart = applyBody.indexOf("} catch {");
  assert.notEqual(catchStart, -1, "Activation apply has no incident path.");
  const incidentBody = applyBody.slice(catchStart);
  assert.ok(/Invoke-BinderActivationDiagnosticReadbackV1/i.test(incidentBody));
  assert.ok(/diagnostic-readback\.json/i.test(incidentBody));
  assert.ok(/phase\.enabled_before/i.test(incidentBody));
  assert.ok(/phase\.enabled_after/i.test(incidentBody));
  assert.ok(/diagnostic_state/i.test(incidentBody));
  assert.ok(/automatic_retry_permitted\s*=\s*\$false/i.test(incidentBody));
  assert.ok(/automatic_rollback_permitted\s*=\s*\$false/i.test(incidentBody));
  assert.ok(
    /\$lifecycle\.Started\s*-and\s*\$lifecycle\.TerminationConfirmed/i.test(
      incidentBody,
    ),
  );
  assert.doesNotMatch(
    incidentBody,
    /catch\s*{\s*}/i,
    "Diagnostic failures must be recorded, not silently discarded.",
  );
});

test("activation is explicitly clients-dark and empty-domain through phase eight", () => {
  assert.equal(
    manifest.rollout_model,
    "clients_dark_empty_domain",
    "Manifest must explicitly name the clients-dark empty-domain model.",
  );
  assert.equal(manifest.clients_dark_through_phase_sequence, 8);
  assert.equal(manifest.binder_domain_must_remain_empty, true);

  const combinedOrchestrator = [
    moduleSource,
    source(SOURCE_VALIDATOR_PATH),
    source(PREFLIGHT_PATH),
    source(APPLY_PATH),
  ].join("\n");
  assert.doesNotMatch(
    combinedOrchestrator,
    /\b(?:flutter|adb|dart-define|npm\s+run\s+(?:build|deploy)|vercel|netlify|sites\s+deploy)\b/i,
    "Database activation must not build, install, or deploy a client.",
  );

  for (const phase of manifest.phases) {
    const sql = source(phase.file);
    assert.match(sql, /binder_domain_empty/i);
    assert.match(sql, /binder_card_events_empty/i);
    assert.match(sql, /binder_trust_reports_empty/i);
    assert.equal(
      (stripSqlCommentsAndStrings(sql).match(/(?:^|\r?\n)\s*update\b/gi) ?? [])
        .length,
      1,
    );
  }
  const readback = source(READBACK_PATH);
  assert.match(readback, /nonempty_domain_tables\s*=\s*'\[\]'::jsonb/i);
  assert.match(readback, /not\s+binder_card_event_data_exists/i);
  assert.match(readback, /not\s+binder_trust_report_data_exists/i);
  assert.ok(/clients_dark/i.test(moduleSource));
  assert.ok(/binder_domain_must_remain_empty/i.test(moduleSource));
});

test("activation exposes no arbitrary phase, repair, or routing escape hatch", () => {
  const entrypoints = [
    moduleSource,
    source(SOURCE_VALIDATOR_PATH),
    source(PREFLIGHT_PATH),
    source(APPLY_PATH),
  ].join("\n");
  const validateSetValues = (text) => {
    const match = text.match(
      /\[ValidateSet\(([\s\S]*?)\)\]\s*\[string\]\$Phase/i,
    );
    assert.ok(match, "Phase must have a closed static ValidateSet.");
    return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
  };
  assert.deepEqual(
    validateSetValues(source(PREFLIGHT_PATH)),
    EXPECTED_PHASES.map((phase) => phase.flag_key),
  );
  for (const functionName of [
    "Get-BinderActivationPhaseV1",
    "Invoke-BinderActivationPreflightV1",
  ]) {
    assert.deepEqual(
      validateSetValues(functionBody(moduleSource, functionName)),
      EXPECTED_PHASES.map((phase) => phase.flag_key),
    );
  }
  assert.match(source(APPLY_PATH), /ConfirmImpact\s*=\s*'High'/i);
  assert.match(source(APPLY_PATH), /ConfirmProduction/i);
  assert.match(moduleSource, /GROOKAI_BINDER_ACTIVATION_ACK/i);
  assert.match(moduleSource, /ACTIVATE-COLLABORATIVE-BINDERS-V1::/i);
  assert.doesNotMatch(
    entrypoints,
    /(?:\bmigration\s+repair\b|\bdb\s+(?:reset|push)\b|--db-url\b|\bdatabase_url\b|\bsupabase_db_url\b|--force\b)/i,
  );
  assert.match(moduleSource, /'db',\s*'query',\s*'--linked',\s*'--file'/i);
});

test("manifest content-addresses the activation module and every wrapper", () => {
  assertContentAddressedEntry(
    manifest.activation_module,
    MODULE_PATH,
    "Activation module",
  );
  assert.ok(
    Array.isArray(manifest.activation_wrappers),
    "Activation wrapper inventory is missing.",
  );
  assert.equal(manifest.activation_wrappers.length, ACTIVATION_WRAPPERS.length);
  assert.deepEqual(
    manifest.activation_wrappers.map(({ role, file }) => ({ role, file })),
    ACTIVATION_WRAPPERS,
  );
  for (const wrapper of manifest.activation_wrappers) {
    assertContentAddressedEntry(
      wrapper,
      wrapper.file,
      `Activation ${wrapper.role} wrapper`,
    );
  }
  assert.equal(
    new Set(manifest.activation_wrappers.map((entry) => entry.file)).size,
    ACTIVATION_WRAPPERS.length,
    "Activation wrapper inventory contains a duplicate.",
  );
});

test("every activation wrapper hashes and seals both trusted modules before import", () => {
  const activationHash = manifest.activation_module?.sha256;
  const productionHash = manifest.production_rollout_module?.sha256;
  assert.match(activationHash ?? "", /^[0-9a-f]{64}$/);
  assert.match(productionHash ?? "", /^[0-9a-f]{64}$/);

  for (const wrapper of ACTIVATION_WRAPPERS) {
    const powerShell = source(wrapper.file);
    const firstImport = powerShell.indexOf("Import-Module");
    assert.notEqual(
      firstImport,
      -1,
      `${wrapper.file} does not import its module.`,
    );
    const bootstrap = powerShell.slice(0, firstImport);
    const afterImport = powerShell.slice(firstImport);

    assert.ok(
      bootstrap.includes("CollaborativeBindersActivationV1.psm1"),
      `${wrapper.file} does not bind the activation module path.`,
    );
    assert.ok(
      bootstrap.includes("CollaborativeBindersProductionRolloutV1.psm1"),
      `${wrapper.file} does not bind the production module path.`,
    );
    assert.ok(
      bootstrap.includes(activationHash),
      `${wrapper.file} does not pin the activation module hash.`,
    );
    assert.ok(
      bootstrap.includes(productionHash),
      `${wrapper.file} does not pin the production module hash.`,
    );
    assert.equal(
      (bootstrap.match(/Get-FileHash\b/gi) ?? []).length >= 4,
      true,
      `${wrapper.file} must hash both modules before and after sealing.`,
    );
    assert.equal(
      (bootstrap.match(/FileAttributes\]::ReparsePoint/gi) ?? []).length >= 2,
      true,
      `${wrapper.file} must reject a reparse point for both modules.`,
    );
    assert.equal(
      (bootstrap.match(/\[IO\.File\]::Open\(/gi) ?? []).length >= 2,
      true,
      `${wrapper.file} must open two lifetime seals before import.`,
    );
    assert.equal(
      (bootstrap.match(/\[IO\.FileShare\]::Read/gi) ?? []).length >= 2,
      true,
      `${wrapper.file} module seals must deny replacement and writes.`,
    );
    assert.match(
      afterImport,
      /finally\s*{[\s\S]*?\.Dispose\(\)[\s\S]*?\.Dispose\(\)/i,
      `${wrapper.file} must retain both seals through wrapper completion.`,
    );
  }

  const bootstrapImport = moduleSource.indexOf("Import-Module");
  const activationModuleBootstrap = moduleSource.slice(0, bootstrapImport);
  assert.ok(
    activationModuleBootstrap.includes(productionHash),
    "Activation module bootstrap does not pin the production module hash.",
  );
  assert.match(activationModuleBootstrap, /\[IO\.File\]::Open\(/i);
  assert.match(activationModuleBootstrap, /\[IO\.FileShare\]::Read/i);
});

test("clients-dark evidence creation seals both trusted modules for its lifetime", () => {
  const activationHash = manifest.activation_module?.sha256;
  const productionHash = manifest.production_rollout_module?.sha256;
  const sourceEntry = manifest.activation_sources?.find(
    (entry) => entry.file === CLIENTS_DARK_EVIDENCE_PATH,
  );
  assertContentAddressedEntry(
    sourceEntry,
    CLIENTS_DARK_EVIDENCE_PATH,
    "Clients-dark evidence wrapper",
  );
  assert.match(activationHash ?? "", /^[0-9a-f]{64}$/);
  assert.match(productionHash ?? "", /^[0-9a-f]{64}$/);

  const powerShell = source(CLIENTS_DARK_EVIDENCE_PATH);
  const firstImport = powerShell.indexOf("Import-Module");
  assert.notEqual(firstImport, -1);
  const bootstrap = powerShell.slice(0, firstImport);
  const afterImport = powerShell.slice(firstImport);
  assert.ok(bootstrap.includes("CollaborativeBindersActivationV1.psm1"));
  assert.ok(bootstrap.includes("CollaborativeBindersProductionRolloutV1.psm1"));
  assert.ok(bootstrap.includes(activationHash));
  assert.ok(bootstrap.includes(productionHash));
  assert.ok((bootstrap.match(/Get-FileHash\b/gi) ?? []).length >= 4);
  assert.ok(
    (bootstrap.match(/FileAttributes\]::ReparsePoint/gi) ?? []).length >= 2,
  );
  assert.ok((bootstrap.match(/\[IO\.File\]::Open\(/gi) ?? []).length >= 2);
  assert.ok((bootstrap.match(/\[IO\.FileShare\]::Read/gi) ?? []).length >= 2);
  assert.match(
    afterImport,
    /finally\s*{[\s\S]*?\.Dispose\(\)[\s\S]*?\.Dispose\(\)/i,
  );
});

test("activation evidence roots stay directly under secure-ops with exact protected ACLs", () => {
  const aclBody = functionBody(
    moduleSource,
    "Assert-BinderActivationArtifactAclV1",
  );
  const protectBody = functionBody(
    moduleSource,
    "Protect-BinderActivationArtifactRootV1",
  );
  const createBody = functionBody(
    moduleSource,
    "New-BinderActivationArtifactRootV1",
  );
  const assertRootBody = functionBody(
    moduleSource,
    "Assert-BinderActivationArtifactRootV1",
  );

  assert.match(createBody, /C:\\secure-ops/i);
  assert.match(createBody, /Split-Path\s+-Parent/i);
  assert.match(createBody, /-ceq\s+\$secureOpsRoot/i);
  assert.match(createBody, /FileAttributes\]::ReparsePoint/i);
  assert.match(createBody, /Protect-BinderActivationArtifactRootV1/i);
  assert.match(assertRootBody, /C:\\secure-ops/i);
  assert.match(assertRootBody, /Split-Path\s+-Parent/i);
  assert.match(assertRootBody, /-ceq\s+\$secureOpsRoot/i);
  assert.match(assertRootBody, /FileAttributes\]::ReparsePoint/i);
  assert.match(assertRootBody, /Assert-BinderActivationArtifactAclV1/i);
  assert.match(protectBody, /SetAccessRuleProtection\(\$true,\s*\$false\)/i);
  assert.match(protectBody, /SetOwner\(\$currentSid\)/i);
  assert.match(protectBody, /Set-Acl\b/i);
  assert.match(aclBody, /AreAccessRulesProtected/i);
  assert.match(aclBody, /AreAccessRulesCanonical/i);
  assert.match(aclBody, /\$rules\.Count\s*-eq\s*3/i);
  assert.match(aclBody, /AccessControlType\s*-ne\s*\$allow/i);
  assert.match(aclBody, /IsInherited/i);
  assert.match(aclBody, /FileSystemRights\]::FullControl/i);
  assert.match(aclBody, /S-1-5-18/i);
  assert.match(aclBody, /S-1-5-32-544/i);
  assert.match(aclBody, /Compare-Object\s+\$expectedSids\s+\$actualSids/i);
});

test("phase one accepts only the production installer's exact nested apply evidence", () => {
  const installationBody = functionBody(
    moduleSource,
    "Assert-BinderInstallationEvidenceRootV1",
  );

  assert.match(installationBody, /C:\\secure-ops/i);
  assert.match(
    installationBody,
    /Split-Path\s+-Parent\s+\$preflightRoot[\s\S]*?-ceq\s+\$secureOpsRoot/i,
  );
  assert.match(installationBody, /\^apply-\\d\{8\}T\\d\{6\}Z\$/);
  assert.ok(
    (installationBody.match(/Assert-BinderArtifactRootV1/gi) ?? []).length >= 2,
  );
  assert.ok(
    (installationBody.match(/Assert-BinderActivationArtifactAclV1/gi) ?? [])
      .length >= 2,
  );
  assert.match(installationBody, /FileAttributes\]::ReparsePoint/i);
  assert.match(
    installationBody,
    /Split-Path\s+-Parent\s+\$resolvedApplyRoot[\s\S]*?-ceq[\s\S]*?\$resolvedPreflightRoot/i,
  );

  const preflightEvidenceBody = functionBody(
    moduleSource,
    "Test-BinderInstallationPreflightEvidenceV1",
  );
  for (const required of [
    "preflight-manifest.json",
    "preflight-manifest.sha256",
    "backup-evidence.digest.json",
    "checksums.sha256",
  ]) {
    assert.ok(preflightEvidenceBody.includes(`'${required}'`));
  }
  assert.match(
    preflightEvidenceBody,
    /Get-ChildItem[\s\S]*?-Directory[\s\S]*?-Force/i,
  );
  assert.match(
    preflightEvidenceBody,
    /Get-ChildItem[\s\S]*?-File[\s\S]*?-Force/i,
  );
  assert.match(preflightEvidenceBody, /FileAttributes\]::ReparsePoint/i);
  assert.match(preflightEvidenceBody, /Get-BinderActivationSha256V1/i);
  assert.match(
    functionBody(moduleSource, "Test-BinderActivationPriorEvidenceV1"),
    /Test-BinderInstallationPreflightEvidenceV1/i,
  );
  const priorBody = functionBody(
    moduleSource,
    "Test-BinderActivationPriorEvidenceV1",
  );
  assert.match(
    priorBody,
    /\$result\.head_sha\s*-ceq\s*\[string\]\$policy\.Manifest\.required_installation_head_sha/i,
  );
  assert.match(
    priorBody,
    /\$installationManifest\.Data\.head_sha\s*-ceq\s*\[string\]\$policy\.Manifest\.required_installation_head_sha/i,
  );
  assert.match(
    priorBody,
    /\$installationManifest\.Data\.origin_main_sha\s*-ceq\s*\[string\]\$policy\.Manifest\.required_installation_head_sha/i,
  );
  assert.match(priorBody, /\$result\.head_sha\s*-ceq\s*\$ExpectedHeadSha/i);

  const repositoryBody = functionBody(
    moduleSource,
    "Assert-BinderActivationRepositoryV1",
  );
  assert.ok(repositoryBody.includes(INSTALLATION_HEAD_SHA));
  assert.match(
    repositoryBody,
    /merge-base[\s\S]*?--is-ancestor[\s\S]*?\$InstallationHead[\s\S]*?\$ActivationHead/i,
  );
  assert.match(
    repositoryBody,
    /diff[\s\S]*?--name-only[\s\S]*?--diff-filter=ACDMRTUXB/i,
  );
  for (const allowedPath of [
    "scripts/ops/CollaborativeBindersActivationV1.psm1",
    "scripts/ops/collaborative_binders_activation_apply_v1.ps1",
    "scripts/ops/collaborative_binders_activation_kill_switch_v1.ps1",
    "scripts/ops/collaborative_binders_activation_manifest_v1.json",
    "scripts/ops/collaborative_binders_activation_preflight_v1.ps1",
    "scripts/ops/collaborative_binders_activation_recovery_v1.ps1",
    "scripts/ops/collaborative_binders_activation_source_validate_v1.ps1",
    "scripts/ops/collaborative_binders_clients_dark_evidence_v1.ps1",
    "tests/contracts/collaborative_binders_activation_v1.test.mjs",
  ]) {
    assert.ok(
      repositoryBody.includes(`'${allowedPath}'`),
      `Installation-to-activation allowlist is missing ${allowedPath}.`,
    );
  }
});

test(
  "phase-specific prior evidence windows accept only exact 24h install and 2h phase boundaries",
  { skip: !WINDOWS_ONLY },
  () => {
    const script = String.raw`
param($activationModule)
$now = [datetimeoffset]'2026-07-27T00:00:00Z'
$manifest = [pscustomobject]@{
  installation_evidence_ttl_hours = 24
  prior_evidence_ttl_hours = 2
}
function Invoke-Probe {
  param(
    [int]$Sequence,
    [datetimeoffset]$Completed,
    [object]$PolicyManifest = $manifest
  )
  try {
    $ttl = & $activationModule {
      param($completedAt, $phaseSequence, $policyManifest, $current)
      Assert-BinderActivationPriorEvidenceTimeV1 -CompletedAtUtc $completedAt -PhaseSequence $phaseSequence -Manifest $policyManifest -NowUtc $current
    } $Completed $Sequence $PolicyManifest $now
    return [pscustomobject]@{
      accepted = $true
      ttl = [int]$ttl
      error = ''
    }
  } catch {
    return [pscustomobject]@{
      accepted = $false
      ttl = 0
      error = $_.Exception.Message
    }
  }
}
[pscustomobject]@{
  install_exact = Invoke-Probe 1 ($now.AddHours(-24))
  install_expired = Invoke-Probe 1 ($now.AddHours(-24).AddSeconds(-1))
  phase_exact = Invoke-Probe 2 ($now.AddHours(-2))
  phase_expired = Invoke-Probe 2 ($now.AddHours(-2).AddSeconds(-1))
  future_exact = Invoke-Probe 1 ($now.AddMinutes(5))
  future_invalid = Invoke-Probe 1 ($now.AddMinutes(5).AddSeconds(1))
  invalid_sequence = Invoke-Probe 0 $now
  install_bad_ttl = Invoke-Probe 1 $now ([pscustomobject]@{
    installation_evidence_ttl_hours = 23
    prior_evidence_ttl_hours = 2
  })
  phase_bad_ttl = Invoke-Probe 2 $now ([pscustomobject]@{
    installation_evidence_ttl_hours = 24
    prior_evidence_ttl_hours = 3
  })
} | ConvertTo-Json -Depth 5 -Compress
`;
    const result = runActivationPowerShell(script);
    assert.equal(
      result.error,
      undefined,
      `could not launch pwsh: ${result.error?.message ?? ""}`,
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout.trim());
    assert.equal(report.install_exact.accepted, true);
    assert.equal(report.install_exact.ttl, 24);
    assert.equal(report.install_expired.accepted, false);
    assert.match(report.install_expired.error, /phase-specific activation window/i);
    assert.equal(report.phase_exact.accepted, true);
    assert.equal(report.phase_exact.ttl, 2);
    assert.equal(report.phase_expired.accepted, false);
    assert.match(report.phase_expired.error, /phase-specific activation window/i);
    assert.equal(report.future_exact.accepted, true);
    assert.equal(report.future_invalid.accepted, false);
    assert.match(report.future_invalid.error, /phase-specific activation window/i);
    assert.equal(report.invalid_sequence.accepted, false);
    assert.match(report.invalid_sequence.error, /phase sequence is invalid/i);
    assert.equal(report.install_bad_ttl.accepted, false);
    assert.match(report.install_bad_ttl.error, /phase-specific TTL is invalid/i);
    assert.equal(report.phase_bad_ttl.accepted, false);
    assert.match(report.phase_bad_ttl.error, /phase-specific TTL is invalid/i);
  },
);

test(
  "phase-one parent preflight evidence rejects digest tampering and extra files",
  { skip: !WINDOWS_ONLY },
  () => {
    const script = String.raw`
param($activationModule)
$osTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/')
$fixture = Join-Path $osTemp (
  'binder-installation-evidence-fixture-' + [guid]::NewGuid().ToString('N')
)
if ((Split-Path -Parent $fixture) -cne $osTemp) {
  throw 'unsafe fixture path'
}
try {
  [void][IO.Directory]::CreateDirectory($fixture)
  $originals = [ordered]@{
    'approval.txt' = 'approved'
    'backup-evidence.digest.json' = '{"Sha256":"' + ('1' * 64) + '"}'
    'preflight-manifest.json' = '{"status":"pass"}'
    'preflight-manifest.sha256' = ('2' * 64)
  }
  foreach ($entry in $originals.GetEnumerator()) {
    [IO.File]::WriteAllText(
      (Join-Path $fixture $entry.Key),
      $entry.Value
    )
  }
  $checksumLines = @(
    foreach ($name in @($originals.Keys | Sort-Object)) {
      $hash = (
        Get-FileHash -LiteralPath (
          Join-Path $fixture $name
        ) -Algorithm SHA256
      ).Hash.ToLowerInvariant()
      "$hash  $name"
    }
  )
  [IO.File]::WriteAllText(
    (Join-Path $fixture 'checksums.sha256'),
    (($checksumLines -join [Environment]::NewLine) +
      [Environment]::NewLine)
  )
  $applyRoot = Join-Path $fixture 'apply-20260724T230000Z'
  [void][IO.Directory]::CreateDirectory($applyRoot)

  $baseline = & $activationModule {
    param($preflight, $apply)
    Test-BinderInstallationPreflightEvidenceV1 -PreflightRoot $preflight -ApplyRoot $apply
  } $fixture $applyRoot

  [IO.File]::WriteAllText(
    (Join-Path $fixture 'backup-evidence.digest.json'),
    '{"tampered":true}'
  )
  $tamperFailure = ''
  try {
    [void](& $activationModule {
      param($preflight, $apply)
      Test-BinderInstallationPreflightEvidenceV1 -PreflightRoot $preflight -ApplyRoot $apply
    } $fixture $applyRoot)
  } catch {
    $tamperFailure = $_.Exception.Message
  }
  [IO.File]::WriteAllText(
    (Join-Path $fixture 'backup-evidence.digest.json'),
    $originals['backup-evidence.digest.json']
  )
  [IO.File]::WriteAllText(
    (Join-Path $fixture 'injected.txt'),
    'unexpected'
  )
  $extraFileFailure = ''
  try {
    [void](& $activationModule {
      param($preflight, $apply)
      Test-BinderInstallationPreflightEvidenceV1 -PreflightRoot $preflight -ApplyRoot $apply
    } $fixture $applyRoot)
  } catch {
    $extraFileFailure = $_.Exception.Message
  }

  [pscustomobject]@{
    BaselineFileCount = $baseline.FileCount
    TamperFailure = $tamperFailure
    ExtraFileFailure = $extraFileFailure
  } | ConvertTo-Json -Compress
} finally {
  if (
    (Test-Path -LiteralPath $fixture) -and
    (Split-Path -Parent ([IO.Path]::GetFullPath($fixture))) -ceq $osTemp
  ) {
    [IO.Directory]::Delete($fixture, $true)
  }
}
`;
    const result = runActivationPowerShell(script);
    assert.equal(
      result.error,
      undefined,
      `could not launch pwsh: ${result.error?.message ?? ""}`,
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout.trim());
    assert.equal(report.BaselineFileCount, 4);
    assert.match(report.TamperFailure, /checksum mismatch/i);
    assert.match(report.ExtraFileFailure, /file set changed/i);
  },
);

test("activation command success is fail-closed on OutputTruncated", () => {
  const successBody = functionBody(
    moduleSource,
    "Assert-BinderActivationCommandSucceededV1",
  );
  assert.match(successBody, /PSObject\.Properties\['OutputTruncated'\]/i);
  assert.match(successBody, /OutputTruncated\s*-eq\s*\$false/i);
  assert.doesNotMatch(
    successBody,
    /OutputTruncated\s*-ne\s*\$true/i,
    "Missing truncation state must fail rather than default to success.",
  );
});

test("clients-dark evidence policy fixes both client identities and every false flag", () => {
  assert.equal(manifest.clients_dark_evidence_required, true);
  assert.equal(manifest.clients_dark_evidence_ttl_hours, 2);
  assert.equal(
    manifest.clients_dark_evidence_package_id,
    "COLLABORATIVE-BINDERS-CLIENTS-DARK-V1",
  );
  assert.equal(manifest.clients_dark_web_origin, "https://grookaivault.com");
  assert.equal(
    manifest.clients_dark_mobile_application_id,
    "com.grookai.vault",
  );
  assert.deepEqual(manifest.clients_dark_web_flag_keys, WEB_CLIENT_FLAGS);
  assert.deepEqual(
    manifest.clients_dark_samsung_compile_flag_keys,
    SAMSUNG_CLIENT_FLAGS,
  );
  assert.equal(
    manifest.backup_max_activation_recovery_lag_minutes,
    1440,
    "Activation backup recovery lag must match the reviewed daily-backup window.",
  );

  assert.ok(
    /function Test-BinderActivationClientsDarkEvidenceV1/i.test(moduleSource),
    "Activation module is missing its clients-dark evidence validator.",
  );
  const evidenceBody = functionBody(
    moduleSource,
    "Test-BinderActivationClientsDarkEvidenceV1",
  );
  for (const parameter of [
    "Path",
    "RepoRoot",
    "ExpectedHeadSha",
    "ExpectedWebDeploymentId",
    "ExpectedMobileVersionName",
    "ExpectedMobileVersionCode",
    "ExpectedMobileApkSha256",
    "NowUtc",
  ]) {
    assert.match(
      evidenceBody,
      new RegExp(String.raw`\$${parameter}\b`, "i"),
      `Clients-dark validator is missing ${parameter}.`,
    );
  }
  const disabledFlagBody = functionBody(
    moduleSource,
    "Assert-BinderActivationDisabledFlagMapV1",
  );
  for (const field of [
    "clients-dark-evidence.json",
    "checksums.sha256",
    "status",
    "head_sha",
    "created_at_utc",
    "expires_at_utc",
    "production_origin",
    "deployment_commit_sha",
    "deployment_id",
    "application_id",
    "build_head_sha",
    "version_name",
    "version_code",
    "apk_sha256",
    "web_flags",
    "mobile.flags",
  ]) {
    assert.ok(
      evidenceBody.toLowerCase().includes(field.toLowerCase()),
      `Clients-dark validator does not bind ${field}.`,
    );
  }
  for (const flag of [...WEB_CLIENT_FLAGS, ...SAMSUNG_CLIENT_FLAGS]) {
    assert.ok(
      disabledFlagBody.includes(`'${flag}'`) ||
        disabledFlagBody.includes(`"${flag}"`),
      `Clients-dark validator does not pin ${flag}.`,
    );
  }
  assert.match(evidenceBody, /Assert-BinderActivationArtifactRootV1/i);
  assert.match(evidenceBody, /Assert-BinderActivationArtifactAclV1/i);
  assert.match(evidenceBody, /Test-BinderActivationChecksumsV1/i);
  assert.match(evidenceBody, /Open-BinderActivationSealV1\s+-Paths/i);
  assert.match(evidenceBody, /Close-BinderActivationSealV1\s+-Streams/i);
  assert.match(evidenceBody, /head_sha\s*-ceq\s*\$ExpectedHeadSha/i);
  assert.match(
    evidenceBody,
    /production_origin\s*-ceq\s*'https:\/\/grookaivault\.com'/i,
  );
  assert.match(evidenceBody, /application_id\s*-ceq\s*'com\.grookai\.vault'/i);
  assert.match(
    evidenceBody,
    /deployment_id\s*-ceq\s*\$ExpectedWebDeploymentId/i,
  );
  assert.match(
    evidenceBody,
    /version_name\s*-ceq\s*\$ExpectedMobileVersionName/i,
  );
  assert.match(
    evidenceBody,
    /\[int\][^\r\n]*version_code\s*-eq\s*\$ExpectedMobileVersionCode/i,
  );
  assert.match(evidenceBody, /apk_sha256\s*-ceq\s*\$ExpectedMobileApkSha256/i);
  assert.match(
    disabledFlagBody,
    /(?:\.Value|\$FlagMap\[\$key\])\s*-eq\s*\$false/i,
  );
  assert.match(evidenceBody, /\$created\s*-le\s*\$NowUtc/i);
  assert.match(
    evidenceBody,
    /\$created\s*-ge\s*\$NowUtc\.AddHours\(-\$[A-Za-z0-9_.]*clients_dark_evidence_ttl_hours\)/i,
  );
  assert.match(evidenceBody, /\$expires\s*-ge\s*\$NowUtc/i);
  assert.match(
    evidenceBody,
    /\$expires\s*-le\s*\$created\.AddHours\(\$[A-Za-z0-9_.]*clients_dark_evidence_ttl_hours\)/i,
  );
  assert.match(evidenceBody, /ReportSha256/i);
  const evidenceSealStart = evidenceBody.indexOf("Open-BinderActivationSealV1");
  const evidenceChecksum = evidenceBody.indexOf(
    "Test-BinderActivationChecksumsV1",
  );
  const evidenceRead = evidenceBody.indexOf("Get-Content");
  const evidenceSealEnd = evidenceBody.lastIndexOf(
    "Close-BinderActivationSealV1",
  );
  assert.ok(
    evidenceSealStart !== -1 &&
      evidenceChecksum > evidenceSealStart &&
      evidenceRead > evidenceSealStart &&
      evidenceSealEnd > evidenceChecksum &&
      evidenceSealEnd > evidenceRead,
    "Clients-dark files must remain sealed during checksum validation and parsing.",
  );
});

test("every phase chains sealed clients-dark evidence through preflight, apply, prior evidence, and recovery", () => {
  const preflightEntry = source(PREFLIGHT_PATH);
  const preflightBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationPreflightV1",
  );
  const manifestBody = functionBody(
    moduleSource,
    "New-BinderActivationManifestV1",
  );
  const applyBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationApplyV1",
  );
  const priorBody = functionBody(
    moduleSource,
    "Test-BinderActivationPriorEvidenceV1",
  );
  const recoveryBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationRecoveryV1",
  );

  for (const parameter of [
    "ClientsDarkEvidenceRoot",
    "ExpectedWebDeploymentId",
    "ExpectedMobileVersionName",
    "ExpectedMobileVersionCode",
    "ExpectedMobileApkSha256",
  ]) {
    const pattern = new RegExp(String.raw`\$${parameter}\b`, "i");
    assert.match(preflightEntry, pattern);
    assert.match(preflightBody, pattern);
  }
  assert.match(preflightBody, /Test-BinderActivationClientsDarkEvidenceV1/i);

  const continuityFields = [
    "activation_head_sha",
    "installation_evidence_head_sha",
    "clients_dark_evidence_root",
    "clients_dark_evidence_checksum_sha256",
    "clients_dark_evidence_sha256",
    "clients_dark_evidence_fingerprint_sha256",
    "clients_dark_evidence_created_at_utc",
    "clients_dark_expires_at_utc",
    "web_deployment_id",
    "web_deployment_commit_sha",
    "mobile_application_id",
    "mobile_version_name",
    "mobile_version_code",
    "mobile_apk_sha256",
  ];
  for (const field of continuityFields) {
    for (const [label, body] of [
      ["preflight manifest", manifestBody],
      ["prior sibling evidence", priorBody],
      ["apply", applyBody],
      ["recovery", recoveryBody],
    ]) {
      assert.ok(
        body.toLowerCase().includes(field.toLowerCase()),
        `${label} does not chain ${field}.`,
      );
    }
  }
  assert.match(applyBody, /Test-BinderActivationClientsDarkEvidenceV1/i);
  assert.match(recoveryBody, /Test-BinderActivationClientsDarkEvidenceV1/i);
  assert.match(applyBody, /Open-BinderActivationSealV1\s+-Paths/i);
  assert.match(recoveryBody, /Open-BinderActivationSealV1\s+-Paths/i);
  assert.match(
    applyBody.slice(
      applyBody.indexOf("$sealPaths = @("),
      applyBody.indexOf("$sealStreams", applyBody.indexOf("$sealPaths = @(")),
    ),
    /clientsDark|clients_dark/i,
  );
  assert.match(
    recoveryBody.slice(
      recoveryBody.indexOf("$sealPaths = @("),
      recoveryBody.indexOf(
        "$sealStreams",
        recoveryBody.indexOf("$sealPaths = @("),
      ),
    ),
    /clientsDark|clients_dark/i,
  );
});

test("phase backup recovery horizon is never future and at most policy minutes old", () => {
  const priorBody = functionBody(
    moduleSource,
    "Test-BinderActivationPriorEvidenceV1",
  );
  assert.match(
    priorBody,
    /\$backupRecoverable\s*-le\s*\$NowUtc(?!\.AddMinutes)/i,
  );
  assert.match(
    priorBody,
    /\$backupRecoverable\s*-ge\s*\$NowUtc\.AddMinutes\(\s*-\s*\[?int\]?\s*\$[A-Za-z0-9_.]*backup_max_activation_recovery_lag_minutes\s*\)/i,
  );

  for (const functionName of [
    "Invoke-BinderActivationPreflightV1",
    "Invoke-BinderActivationApplyV1",
    "Invoke-BinderActivationRecoveryV1",
  ]) {
    assert.match(
      functionBody(moduleSource, functionName),
      /Test-BinderActivationPriorEvidenceV1/i,
      `${functionName} must re-check the backup window at that phase.`,
    );
  }

  const watcher = source(BACKUP_WATCH_PATH);
  const watcherLag = watcher.match(/\$recoveryLagMinutes\s*=\s*(\d+)/i);
  assert.ok(watcherLag, "Backup watcher recovery lag is missing.");
  assert.equal(
    Number(watcherLag[1]),
    manifest.backup_max_activation_recovery_lag_minutes,
    "Backup watcher and activation recovery windows must match.",
  );
  assert.match(
    watcher,
    /\$maximumFutureMinutes\s*=\s*0\b/i,
    "Backup watcher must reject every future recovery horizon.",
  );
});

test("recovery is an explicit content-addressed state-neutral workflow", () => {
  assertContentAddressedEntry(
    manifest.recovery_entrypoint,
    RECOVERY_PATH,
    "Recovery entrypoint",
  );
  assert.deepEqual(manifest.recovery_policy, {
    accepted_evidence_statuses: ["pass", "stop"],
    classifications: ["before", "after", "unexpected"],
    recovered_prior_evidence_classification: "after",
    before_action: "stop",
    unexpected_action: "stop",
    state_neutral_readback: true,
    automatic_retry_permitted: false,
    automatic_rollback_permitted: false,
  });
  assertPowerShell7Declaration(RECOVERY_PATH);

  const entrypoint = source(RECOVERY_PATH);
  assert.match(
    entrypoint,
    /\[CmdletBinding\(\s*SupportsShouldProcess\s*=\s*\$true\s*,\s*ConfirmImpact\s*=\s*'High'\s*\)\]/i,
  );
  for (const parameter of [
    "EvidenceRoot",
    "ExpectedHeadSha",
    "ArtifactRoot",
    "ConfirmRecovery",
  ]) {
    assert.match(
      entrypoint,
      new RegExp(String.raw`\$${parameter}\b`, "i"),
      `Recovery entrypoint must expose ${parameter}.`,
    );
  }
  assert.doesNotMatch(
    entrypoint,
    /\$(?:Phase|SqlPath|ProjectRef|DatabaseUrl|DbUrl)\b/i,
  );
  assert.match(entrypoint, /Invoke-BinderActivationRecoveryV1/i);
  assert.match(entrypoint, /ConfirmRecovery\.IsPresent/i);
});

test("recovery consumes exactly one sealed success or failure evidence set", () => {
  assert.ok(
    /function Invoke-BinderActivationRecoveryV1/i.test(moduleSource),
    "Activation module is missing Invoke-BinderActivationRecoveryV1.",
  );
  const recoveryBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationRecoveryV1",
  );

  for (const marker of [
    "EvidenceRoot",
    "ExpectedHeadSha",
    "ArtifactRoot",
    "ConfirmRecovery",
    "checksums.sha256",
    "STOP-incident.json",
    "diagnostic-readback.json",
    "apply-result.json",
    "readback.after.json",
    "package_id",
    "package_fingerprint_sha256",
    "project_ref",
    "head_sha",
    "phase_sequence",
    "target_flag",
    "enabled_flags_before",
    "enabled_flags_after",
    "backup_kind",
    "backup_verified_at_utc",
    "backup_recoverable_through_utc",
    "backup_evidence_reference",
    "backup_evidence_sha256",
    "restore_path_reviewed",
    "rollout_model",
    "binder_domain_must_remain_empty",
    "excluded_flags",
    "excluded_project_phase",
  ]) {
    assert.ok(
      recoveryBody.toLowerCase().includes(marker.toLowerCase()),
      `Recovery does not bind sealed continuity field ${marker}.`,
    );
  }

  assert.match(
    recoveryBody,
    /Test-BinderActivationChecksumsV1\s+-Root\s+\$[A-Za-z0-9_]+/i,
  );
  assert.match(recoveryBody, /\s-xor\s/i);
  assert.match(recoveryBody, /Open-BinderActivationSealV1\s+-Paths/i);
  assert.match(recoveryBody, /Close-BinderActivationSealV1\s+-Streams/i);
  assert.match(recoveryBody, /Assert-BinderActivationSourceV1/i);
  assert.match(recoveryBody, /Assert-BinderActivationRepositoryV1/i);
  assert.match(recoveryBody, /Assert-ProjectBindingV1/i);
  assert.match(recoveryBody, /Resolve-BinderSupabaseExecutableV1/i);
  assert.match(recoveryBody, /Invoke-BinderActivationDiagnosticReadbackV1/i);
  assert.match(recoveryBody, /-EnabledBefore\b/i);
  assert.match(recoveryBody, /-EnabledAfter\b/i);
  assert.match(recoveryBody, /EnabledFlags/i);
  assert.match(recoveryBody, /EffectiveEnabledFlags/i);
  assert.match(recoveryBody, /DiagnosticState/i);
  assert.match(recoveryBody, /GROOKAI_BINDER_ACTIVATION_RECOVERY_ACK/i);
  assert.match(recoveryBody, /RECOVER-COLLABORATIVE-BINDERS-V1::/i);
  assert.match(
    recoveryBody,
    /package_fingerprint_sha256\s*-ceq\s*\$[A-Za-z0-9_.]*PackageFingerprintSha256/i,
  );
  assert.match(recoveryBody, /project_ref\s*-ceq\s*'ycdxbpibncqcchqiihfz'/i);
  assert.match(recoveryBody, /head_sha\s*-ceq\s*\$ExpectedHeadSha/i);
  assert.match(
    recoveryBody,
    /rollout_model\s*-ceq\s*'clients_dark_empty_domain'/i,
  );
  assert.match(recoveryBody, /binder_domain_must_remain_empty\s*-eq\s*\$true/i);
  assertToolchainAndProjectSealSet(recoveryBody, "Recovery");

  const sealStart = recoveryBody.indexOf("Open-BinderActivationSealV1");
  const diagnosticStart = recoveryBody.indexOf(
    "Invoke-BinderActivationDiagnosticReadbackV1",
  );
  const sealEnd = recoveryBody.lastIndexOf("Close-BinderActivationSealV1");
  assert.ok(
    sealStart !== -1 &&
      diagnosticStart > sealStart &&
      sealEnd > diagnosticStart,
    "Recovery evidence/source seals must cover the live diagnostic readback.",
  );
});

test("recovery emits prior evidence only for exact after; before and unexpected stop", () => {
  const recoveryBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationRecoveryV1",
  );

  assert.match(recoveryBody, /DiagnosticState\s*-ceq\s*'after'/i);
  assert.match(recoveryBody, /DiagnosticState\s*-ceq\s*'before'/i);
  assert.match(recoveryBody, /'unexpected'/i);
  assert.match(recoveryBody, /recovery_classification/i);
  assert.match(recoveryBody, /recovered_prior_evidence/i);
  assert.match(recoveryBody, /recovered_from_evidence_checksum_sha256/i);
  assert.match(recoveryBody, /apply-result\.json/i);
  assert.match(recoveryBody, /readback\.after\.json/i);
  assert.match(recoveryBody, /STOP-recovery\.json/i);
  assert.match(recoveryBody, /Write-BinderActivationChecksumsV1\s+-Root/i);
  assert.match(recoveryBody, /mutation_succeeded\s*=\s*\$true/i);
  assert.match(recoveryBody, /mutation_termination_confirmed\s*=\s*\$true/i);
  assert.match(recoveryBody, /automatic_retry_permitted\s*=\s*\$false/i);
  assert.match(recoveryBody, /automatic_rollback_permitted\s*=\s*\$false/i);
  assert.doesNotMatch(
    recoveryBody,
    /automatic_(?:retry|rollback)_permitted\s*=\s*\$true/i,
  );
  assert.doesNotMatch(
    recoveryBody,
    /Invoke-BinderActivationApplyV1|Invoke-BinderActivationKillSwitchV1/i,
    "Recovery must never execute an activation or rollback mutation.",
  );
  assert.match(
    recoveryBody,
    /if\s*\([^)]*DiagnosticState\s*-ceq\s*'before'[^)]*\)\s*{[\s\S]*?status\s*=\s*'stop'[\s\S]*?STOP-recovery\.json/i,
    "Exact-before recovery must stop and emit no prior-success evidence.",
  );
  assert.match(
    recoveryBody,
    /(?:else|if|switch)[\s\S]*?'unexpected'[\s\S]*?status\s*=\s*'stop'[\s\S]*?STOP-recovery\.json/i,
    "Unexpected recovery state must stop.",
  );
  assert.match(
    recoveryBody,
    /if\s*\([^)]*DiagnosticState\s*-ceq\s*'after'[^)]*\)\s*{[\s\S]*?status\s*=\s*'pass'[\s\S]*?apply-result\.json[\s\S]*?readback\.after\.json/i,
    "Only exact-after recovery may emit prior-success evidence.",
  );

  const afterGuard = recoveryBody.search(/DiagnosticState\s*-ceq\s*'after'/i);
  const priorEvidenceWrite = recoveryBody.search(/apply-result\.json/i);
  assert.ok(
    afterGuard !== -1 && priorEvidenceWrite > afterGuard,
    "Recovered prior evidence must be downstream of the exact-after guard.",
  );
});

test("the emergency kill switch is fixed and content-addressed", () => {
  const sqlDirectory = absolute("scripts/ops/sql");
  const unmanifestedKillFiles = readdirSync(sqlDirectory)
    .filter((name) =>
      /collaborative_binders_activation.*kill.*\.sql$/i.test(name),
    )
    .map((name) => `scripts/ops/sql/${name}`);
  const killSwitch = manifest.kill_switch;

  assert.ok(killSwitch, "The fixed emergency kill switch is missing.");
  assert.equal(killSwitch.file, KILL_SWITCH_SQL_PATH);
  assert.equal(killSwitch.target_flag, "schema_internal");
  assert.equal(killSwitch.set_enabled, false);
  assert.equal(killSwitch.automatic_retry_permitted, false);
  assert.equal(killSwitch.automatic_rollback_permitted, false);
  assert.deepEqual(killSwitch.effective_enabled_flags_after, []);
  assert.deepEqual(
    killSwitch.excluded_flags_must_remain_disabled,
    EXCLUDED_FLAGS,
  );
  assertContentAddressedEntry(
    killSwitch,
    KILL_SWITCH_SQL_PATH,
    "Kill-switch SQL",
  );
  assertContentAddressedEntry(
    {
      file: killSwitch.entrypoint_file,
      sha256: killSwitch.entrypoint_sha256,
    },
    KILL_SWITCH_PATH,
    "Kill-switch entrypoint",
  );
  assert.deepEqual(unmanifestedKillFiles, [killSwitch.file]);
  assertPowerShell7Declaration(KILL_SWITCH_PATH);
});

test("kill-switch SQL only disables schema_internal from an exact phase vector", () => {
  assert.ok(
    existsSync(absolute(KILL_SWITCH_SQL_PATH)),
    "Fixed kill-switch SQL is missing.",
  );
  const sql = source(KILL_SWITCH_SQL_PATH);
  const stripped = assertOnePreparedStatement(sql, KILL_SWITCH_SQL_PATH);
  assert.equal((stripped.match(/(?:^|\r?\n)\s*update\b/gi) ?? []).length, 1);
  assert.equal(
    (
      stripped.match(
        /(?:^|\r?\n)\s*update\s+public\.binder_feature_flags\s+target\b/gi,
      ) ?? []
    ).length,
    1,
  );
  assert.doesNotMatch(
    stripped,
    /\b(?:insert|delete|merge|call|do|execute|alter|create|drop|truncate|copy|grant|revoke)\b/i,
  );
  assert.match(stripped, /\bupdate\s+public\.binder_feature_flags\s+target\b/i);
  assert.match(sql, /\bset\s+enabled\s*=\s*false\b/i);
  assert.match(sql, /where\s+target\.flag_key\s*=\s*'schema_internal'/i);
  assert.match(sql, /target\.enabled\s*=\s*true/i);
  assert.match(sql, /pg_try_advisory_xact_lock/i);
  assert.match(sql, /for\s+update\s+of\s+f\s+nowait/i);
  assert.match(sql, /enabled_before/i);
  assert.match(sql, /enabled_after/i);
  assert.match(sql, /effective_enabled_after/i);
  assert.match(sql, /array_remove\s*\([^)]*'schema_internal'/i);
  assert.match(sql, /'\[\]'::jsonb/i);
  assert.match(sql, /binder_domain_empty/i);
  assert.match(sql, /binder_card_events_empty/i);
  assert.match(sql, /binder_trust_reports_empty/i);
  assert.match(sql, /change_summary\.updated_rows\s*=\s*1/i);
  for (const flag of EXCLUDED_FLAGS) {
    assert.match(
      sql,
      new RegExp(`'${flag}'`, "i"),
      `Kill switch does not prove ${flag} remains disabled.`,
    );
  }
  for (const phase of EXPECTED_PHASES) {
    assert.match(
      sql.replace(/\s+/g, ""),
      new RegExp(
        sqlTextArray(phase.enabled_after)
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\s+/g, ""),
        "i",
      ),
      `Kill switch does not accept the exact phase-${phase.sequence} vector.`,
    );
  }
  assert.doesNotMatch(sql, /\bset\s+enabled\s*=\s*true\b/i);
  assert.doesNotMatch(sql, /\bP8\b/i);
});

test("kill-switch orchestration preserves production, evidence, and seal gates", () => {
  assert.ok(
    existsSync(absolute(KILL_SWITCH_PATH)),
    "Fixed kill-switch entrypoint is missing.",
  );
  const entrypoint = source(KILL_SWITCH_PATH);
  assert.match(
    entrypoint,
    /\[CmdletBinding\(\s*SupportsShouldProcess\s*=\s*\$true\s*,\s*ConfirmImpact\s*=\s*'High'\s*\)\]/i,
  );
  for (const parameter of [
    "EvidenceRoot",
    "ExpectedHeadSha",
    "ArtifactRoot",
    "ConfirmProduction",
  ]) {
    assert.match(
      entrypoint,
      new RegExp(String.raw`\$${parameter}\b`, "i"),
      `Kill-switch entrypoint must expose ${parameter}.`,
    );
  }
  assert.doesNotMatch(
    entrypoint,
    /\$(?:Phase|SqlPath|ProjectRef|DatabaseUrl|DbUrl)\b/i,
  );
  assert.match(entrypoint, /Invoke-BinderActivationKillSwitchV1/i);
  assert.match(entrypoint, /ConfirmProduction\.IsPresent/i);

  assert.ok(
    /function Invoke-BinderActivationKillSwitchV1/i.test(moduleSource),
    "Activation module is missing Invoke-BinderActivationKillSwitchV1.",
  );
  const killBody = functionBody(
    moduleSource,
    "Invoke-BinderActivationKillSwitchV1",
  );
  for (const marker of [
    "EvidenceRoot",
    "ExpectedHeadSha",
    "ArtifactRoot",
    "ConfirmProduction",
    "checksums.sha256",
    "STOP-incident.json",
    "apply-result.json",
    "package_fingerprint_sha256",
    "project_ref",
    "head_sha",
    "phase_sequence",
    "enabled_flags_before",
    "enabled_flags_after",
    "backup_evidence_sha256",
    "restore_path_reviewed",
    "clients_dark_empty_domain",
    "binder_domain_must_remain_empty",
    "diagnostic_state",
    "EffectiveEnabledFlags",
  ]) {
    assert.ok(
      killBody.toLowerCase().includes(marker.toLowerCase()),
      `Kill switch does not retain required gate ${marker}.`,
    );
  }
  assert.match(killBody, /Test-BinderActivationChecksumsV1/i);
  assert.match(killBody, /\s-xor\s/i);
  assert.match(killBody, /Assert-BinderActivationSourceV1/i);
  assert.match(killBody, /Assert-BinderActivationRepositoryV1/i);
  assert.match(killBody, /Assert-ProjectBindingV1/i);
  assert.match(killBody, /Resolve-BinderSupabaseExecutableV1/i);
  assert.match(killBody, /Open-BinderActivationSealV1\s+-Paths/i);
  assert.match(killBody, /Close-BinderActivationSealV1\s+-Streams/i);
  assert.match(killBody, /Invoke-BinderActivationDiagnosticReadbackV1/i);
  assert.match(killBody, /GROOKAI_BINDER_ACTIVATION_KILL_ACK/i);
  assert.match(killBody, /DISABLE-COLLABORATIVE-BINDERS-V1::/i);
  assert.match(
    killBody,
    /package_fingerprint_sha256\s*-ceq\s*\$[A-Za-z0-9_.]*PackageFingerprintSha256/i,
  );
  assert.match(killBody, /project_ref\s*-ceq\s*'ycdxbpibncqcchqiihfz'/i);
  assert.match(killBody, /head_sha\s*-ceq\s*\$ExpectedHeadSha/i);
  assert.match(killBody, /rollout_model\s*-ceq\s*'clients_dark_empty_domain'/i);
  assert.match(killBody, /binder_domain_must_remain_empty\s*-eq\s*\$true/i);
  assert.match(killBody, /'db',\s*'query',\s*'--linked',\s*'--file'/i);
  assert.match(
    killBody,
    /collaborative_binders_activation_kill_switch_v1\.sql/i,
  );
  assert.match(killBody, /kill-switch-result\.json/i);
  assert.match(killBody, /Write-BinderActivationChecksumsV1\s+-Root/i);
  assert.match(killBody, /automatic_retry_permitted\s*=\s*\$false/i);
  assert.match(killBody, /automatic_rollback_permitted\s*=\s*\$false/i);
  assert.doesNotMatch(
    killBody,
    /automatic_(?:retry|rollback)_permitted\s*=\s*\$true/i,
  );
  assert.doesNotMatch(
    killBody,
    /Invoke-BinderActivationApplyV1|\$(?:Phase|SqlPath|ProjectRef|DatabaseUrl|DbUrl)\b/i,
  );
  assert.match(
    killBody,
    /EffectiveEnabledFlags[^;\r\n]*(?:Count\s*-eq\s*0|-join\s*["']["'])/i,
    "Kill-switch post-readback must prove the effective vector is empty.",
  );
  assertToolchainAndProjectSealSet(killBody, "Kill switch");

  const sealStart = killBody.indexOf("Open-BinderActivationSealV1");
  const mutationStart = killBody.indexOf("Invoke-BinderActivationSupabaseV1");
  const afterReadback = killBody.lastIndexOf(
    "Invoke-BinderActivationDiagnosticReadbackV1",
  );
  const sealEnd = killBody.lastIndexOf("Close-BinderActivationSealV1");
  assert.ok(
    sealStart !== -1 &&
      mutationStart > sealStart &&
      afterReadback > mutationStart &&
      sealEnd > afterReadback,
    "Kill-switch seals must cover its one mutation and final diagnostic.",
  );
});
