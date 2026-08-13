import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import {
  evaluateTcgplayerMarketVaultProductionReadbackV1,
  TCGPLAYER_MARKET_VAULT_PRODUCTION_READBACK_POLICY_V1,
} from "../../backend/pricing/tcgplayer_market_vault_production_readback_policy_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_VERSION =
  "TCGPLAYER_MARKET_VAULT_PRODUCTION_READBACK_AUDIT_V1";
const DEFAULT_OUT_ROOT = path.join(
  REPO_ROOT,
  "artifacts",
  "market_pricing_product_v1",
  "vault_production_readback",
);

function parseArgs(argv) {
  const value = (name) =>
    argv
      .find((arg) => arg.startsWith(`--${name}=`))
      ?.slice(name.length + 3)
      .trim() ?? "";
  return {
    outRoot: path.resolve(value("out-root") || DEFAULT_OUT_ROOT),
    expectedCommitSha: value("expected-commit-sha"),
    requirePass: argv.includes("--require-pass"),
  };
}

function connectionString() {
  return (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    ""
  );
}

function sslConfig(url) {
  return /localhost|127\.0\.0\.1|\[::1\]/i.test(url)
    ? false
    : { rejectUnauthorized: false };
}

function git(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function bool(value) {
  return value === true;
}

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function money(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function iso(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

async function querySchemaEvidence(client) {
  const row = (
    await client.query(
      `with target as (
         select to_regclass(
           'public.v_vault_mobile_pricing_targets_v1'
         ) as relation_oid
       )
       select
         c.relname as relation_name,
         c.relkind as relation_kind,
         coalesce(c.reloptions, '{}'::text[]) as relation_options,
         case
           when c.oid is null then null
           else pg_get_viewdef(c.oid, true)
         end as definition,
         p.proname as backing_function_name,
         p.prosecdef as backing_function_security_definer,
         p.provolatile = 's' as backing_function_stable,
         coalesce(p.proconfig, '{}'::text[]) as backing_function_config,
         case
           when p.oid is null then null
           else pg_get_functiondef(p.oid)
         end as backing_function_definition,
         owner_table.relrowsecurity as owner_table_rls_enabled,
         case
           when c.oid is null then null
           else has_table_privilege('anon', c.oid, 'SELECT')
         end as anonymous_select_granted,
         case
           when c.oid is null then null
           else has_table_privilege('authenticated', c.oid, 'SELECT')
         end as authenticated_select_granted,
         case
           when c.oid is null then null
           else (
             has_table_privilege('authenticated', c.oid, 'INSERT')
             or has_table_privilege('authenticated', c.oid, 'UPDATE')
             or has_table_privilege('authenticated', c.oid, 'DELETE')
             or has_table_privilege('authenticated', c.oid, 'TRUNCATE')
             or has_table_privilege('authenticated', c.oid, 'REFERENCES')
             or has_table_privilege('authenticated', c.oid, 'TRIGGER')
           )
         end as authenticated_write_or_ddl_granted,
         case
           when c.oid is null then null
           else has_table_privilege('service_role', c.oid, 'SELECT')
         end as service_select_granted,
         case
           when c.oid is null then null
           else (
             has_table_privilege('service_role', c.oid, 'INSERT')
             or has_table_privilege('service_role', c.oid, 'UPDATE')
             or has_table_privilege('service_role', c.oid, 'DELETE')
             or has_table_privilege('service_role', c.oid, 'TRUNCATE')
             or has_table_privilege('service_role', c.oid, 'REFERENCES')
             or has_table_privilege('service_role', c.oid, 'TRIGGER')
           )
         end as service_write_or_ddl_granted,
         case
           when p.oid is null then null
           else has_function_privilege('anon', p.oid, 'EXECUTE')
         end as backing_function_anonymous_execute_granted,
         case
           when p.oid is null then null
           else has_function_privilege('authenticated', p.oid, 'EXECUTE')
         end as backing_function_authenticated_execute_granted,
         case
           when p.oid is null then null
           else has_function_privilege('service_role', p.oid, 'EXECUTE')
         end as backing_function_service_execute_granted
       from target
       left join pg_class c on c.oid = target.relation_oid
       left join pg_proc p
         on p.oid = to_regprocedure(
           'public.vault_mobile_pricing_target_rows_for_current_user_v2()'
         )
       left join pg_class owner_table
         on owner_table.oid = 'public.vault_item_instances'::regclass`,
    )
  ).rows[0] ?? {};
  const definition = String(row.definition ?? "").toLowerCase();
  const backingFunctionDefinition = String(
    row.backing_function_definition ?? "",
  ).toLowerCase();
  const backingFunctionConfig = row.backing_function_config ?? [];
  return {
    relation_name: row.relation_name ?? null,
    relation_kind: row.relation_kind ?? null,
    relation_options: row.relation_options ?? [],
    owner_table_rls_enabled: bool(row.owner_table_rls_enabled),
    definition_owner_scoped:
      definition.includes("auth.uid()") &&
      definition.includes("vii.user_id"),
    definition_excludes_archived:
      definition.includes("vii.archived_at is null"),
    definition_excludes_slabs:
      definition.includes("vii.slab_cert_id is null"),
    definition_uses_backing_function: definition.includes(
      "vault_mobile_pricing_target_rows_for_current_user_v2()",
    ),
    backing_function_name: row.backing_function_name ?? null,
    backing_function_security_definer: bool(
      row.backing_function_security_definer,
    ),
    backing_function_stable: bool(row.backing_function_stable),
    backing_function_fixed_search_path: backingFunctionConfig.some(
      (option) =>
        String(option)
          .toLowerCase()
          .replaceAll(" ", "") === "search_path=pg_catalog,public",
    ),
    backing_function_owner_scoped:
      backingFunctionDefinition.includes("auth.uid()") &&
      backingFunctionDefinition.includes("vii.user_id = auth.uid()"),
    backing_function_excludes_archived:
      backingFunctionDefinition.includes("vii.archived_at is null"),
    backing_function_excludes_slabs:
      backingFunctionDefinition.includes("vii.slab_cert_id is null"),
    access: {
      anonymous_select_granted: bool(row.anonymous_select_granted),
      authenticated_select_granted: bool(
        row.authenticated_select_granted,
      ),
      authenticated_write_or_ddl_granted: bool(
        row.authenticated_write_or_ddl_granted,
      ),
      service_select_granted: bool(row.service_select_granted),
      service_write_or_ddl_granted: bool(
        row.service_write_or_ddl_granted,
      ),
      backing_function_anonymous_execute_granted: bool(
        row.backing_function_anonymous_execute_granted,
      ),
      backing_function_authenticated_execute_granted: bool(
        row.backing_function_authenticated_execute_granted,
      ),
      backing_function_service_execute_granted: bool(
        row.backing_function_service_execute_granted,
      ),
    },
  };
}

async function queryAsRole(client, role, subjectId, callback) {
  await client.query("begin read only");
  try {
    await client.query(`set local role ${role}`);
    if (subjectId) {
      await client.query(
        "select set_config('request.jwt.claim.sub', $1, true)",
        [subjectId],
      );
    }
    const result = await callback();
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function queryRuntimeEvidence(client, relationExists) {
  if (!relationExists) {
    return {
      access: {
        anonymous_runtime_denied: false,
        anonymous_runtime_code: null,
        authenticated_without_uid_count: 0,
      },
      owner_scope: {
        sample_owner_available: false,
        expected_target_count: 0,
        authenticated_target_count: 0,
        foreign_owner_target_count: 0,
        duplicate_instance_count: 0,
        resolved_printing_count: 0,
        unresolved_printing_count: 0,
      },
      exact_pricing: {
        requested_printing_count: 0,
        returned_pricing_row_count: 0,
        non_exact_scope_count: 0,
        identity_mismatch_count: 0,
        priced_copy_count: 0,
        unpriced_copy_count: 0,
        reconciled_total_usd: 0,
        independent_total_usd: 0,
      },
    };
  }

  let anonymousRuntimeDenied = false;
  let anonymousRuntimeCode = null;
  try {
    await queryAsRole(client, "anon", null, () =>
      client.query(
        "select count(*)::integer from public.v_vault_mobile_pricing_targets_v1",
      ),
    );
  } catch (error) {
    anonymousRuntimeCode = error.code ?? null;
    anonymousRuntimeDenied = error.code === "42501";
  }

  const authenticatedWithoutUidCount = integer(
    (
      await queryAsRole(client, "authenticated", null, () =>
        client.query(
          `select count(*)::integer as row_count
           from public.v_vault_mobile_pricing_targets_v1`,
        ),
      )
    ).rows[0]?.row_count,
  );

  const sampleOwner = (
    await client.query(
      `select vii.user_id
       from public.vault_item_instances vii
       join public.v_market_price_current_v1 current_price
         on current_price.card_printing_id = vii.card_printing_id
       where vii.archived_at is null
         and vii.slab_cert_id is null
         and vii.card_print_id is not null
         and vii.user_id is not null
       group by vii.user_id
       order by count(*) desc, vii.user_id
       limit 1`,
    )
  ).rows[0] ?? null;

  if (!sampleOwner?.user_id) {
    return {
      access: {
        anonymous_runtime_denied: anonymousRuntimeDenied,
        anonymous_runtime_code: anonymousRuntimeCode,
        authenticated_without_uid_count: authenticatedWithoutUidCount,
      },
      owner_scope: {
        sample_owner_available: false,
        expected_target_count: 0,
        authenticated_target_count: 0,
        foreign_owner_target_count: 0,
        duplicate_instance_count: 0,
        resolved_printing_count: 0,
        unresolved_printing_count: 0,
      },
      exact_pricing: {
        requested_printing_count: 0,
        returned_pricing_row_count: 0,
        non_exact_scope_count: 0,
        identity_mismatch_count: 0,
        priced_copy_count: 0,
        unpriced_copy_count: 0,
        reconciled_total_usd: 0,
        independent_total_usd: 0,
      },
    };
  }

  const expectedTargets = (
    await client.query(
      `select
         id::text as instance_id,
         card_print_id::text as card_print_id,
         card_printing_id::text as card_printing_id
       from public.vault_item_instances
       where user_id = $1::uuid
         and archived_at is null
         and slab_cert_id is null
         and card_print_id is not null
       order by id`,
      [sampleOwner.user_id],
    )
  ).rows;
  const authenticatedTargets = (
    await queryAsRole(client, "authenticated", sampleOwner.user_id, () =>
      client.query(
        `select
           instance_id::text,
           card_print_id::text,
           card_printing_id::text
         from public.v_vault_mobile_pricing_targets_v1
         order by instance_id`,
      ),
    )
  ).rows;

  const expectedIds = new Set(
    expectedTargets.map((row) => row.instance_id),
  );
  const authenticatedIds = authenticatedTargets.map(
    (row) => row.instance_id,
  );
  const foreignOwnerTargetCount = authenticatedIds.filter(
    (id) => !expectedIds.has(id),
  ).length;
  const duplicateInstanceCount =
    authenticatedIds.length - new Set(authenticatedIds).size;
  const resolvedTargets = authenticatedTargets.filter(
    (row) => row.card_printing_id,
  );
  const unresolvedPrintingCount =
    authenticatedTargets.length - resolvedTargets.length;
  const requestedPrintingIds = [
    ...new Set(resolvedTargets.map((row) => row.card_printing_id)),
  ].sort();

  let pricingRows = [];
  if (requestedPrintingIds.length > 0) {
    pricingRows = (
      await queryAsRole(
        client,
        "authenticated",
        sampleOwner.user_id,
        () =>
          client.query(
            `select *
             from public.get_market_pricing_read_model_v1(
               null::uuid[],
               $1::uuid[]
             )
             order by card_printing_id`,
            [requestedPrintingIds],
          ),
      )
    ).rows;
  }
  const requestedSet = new Set(requestedPrintingIds);
  const nonExactScopeCount = pricingRows.filter(
    (row) => row.pricing_scope !== "card_printing",
  ).length;
  const identityMismatchCount = pricingRows.filter(
    (row) =>
      !row.card_printing_id ||
      !requestedSet.has(String(row.card_printing_id)),
  ).length;
  const availableByPrintingId = new Map(
    pricingRows
      .filter(
        (row) =>
          row.status === "available" &&
          row.pricing_scope === "card_printing" &&
          row.card_printing_id &&
          money(row.market_close) > 0,
      )
      .map((row) => [String(row.card_printing_id), row]),
  );
  const directPriceRows =
    requestedPrintingIds.length === 0
      ? []
      : (
          await client.query(
            `select card_printing_id::text, market_price
             from public.v_market_price_current_v1
             where card_printing_id = any($1::uuid[])
             order by card_printing_id`,
            [requestedPrintingIds],
          )
        ).rows;
  const directByPrintingId = new Map(
    directPriceRows.map((row) => [
      row.card_printing_id,
      money(row.market_price),
    ]),
  );

  let pricedCopyCount = 0;
  let reconciledTotalUsd = 0;
  let independentTotalUsd = 0;
  const groupTotals = new Map();
  for (const target of authenticatedTargets) {
    const group = groupTotals.get(target.card_print_id) ?? {
      card_print_id: target.card_print_id,
      priced_copy_count: 0,
      unpriced_copy_count: 0,
      reconciled_total_usd: 0,
      independent_total_usd: 0,
      latest_observed_at: null,
      latest_published_at: null,
    };
    const rpcRow = availableByPrintingId.get(target.card_printing_id);
    if (rpcRow) {
      const rpcAmount = money(rpcRow.market_close);
      pricedCopyCount += 1;
      reconciledTotalUsd += rpcAmount;
      group.priced_copy_count += 1;
      group.reconciled_total_usd += rpcAmount;
      const observedAt = iso(rpcRow.observed_at);
      const publishedAt = iso(rpcRow.published_at);
      if (
        observedAt &&
        (!group.latest_observed_at ||
          observedAt > group.latest_observed_at)
      ) {
        group.latest_observed_at = observedAt;
      }
      if (
        publishedAt &&
        (!group.latest_published_at ||
          publishedAt > group.latest_published_at)
      ) {
        group.latest_published_at = publishedAt;
      }
    } else {
      group.unpriced_copy_count += 1;
    }
    const directAmount = directByPrintingId.get(target.card_printing_id);
    if (directAmount !== undefined) {
      independentTotalUsd += directAmount;
      group.independent_total_usd += directAmount;
    }
    groupTotals.set(target.card_print_id, group);
  }
  const sampleGroup =
    [...groupTotals.values()]
      .filter((group) => group.priced_copy_count > 0)
      .sort((left, right) =>
        left.card_print_id.localeCompare(right.card_print_id),
      )
      .map((group) => ({
        ...group,
        reconciled_total_usd: Number(
          group.reconciled_total_usd.toFixed(6),
        ),
        independent_total_usd: Number(
          group.independent_total_usd.toFixed(6),
        ),
      }))[0] ?? null;

  return {
    access: {
      anonymous_runtime_denied: anonymousRuntimeDenied,
      anonymous_runtime_code: anonymousRuntimeCode,
      authenticated_without_uid_count: authenticatedWithoutUidCount,
    },
    owner_scope: {
      sample_owner_available: true,
      expected_target_count: expectedTargets.length,
      authenticated_target_count: authenticatedTargets.length,
      foreign_owner_target_count: foreignOwnerTargetCount,
      duplicate_instance_count: duplicateInstanceCount,
      resolved_printing_count: resolvedTargets.length,
      unresolved_printing_count: unresolvedPrintingCount,
    },
    exact_pricing: {
      requested_printing_count: requestedPrintingIds.length,
      returned_pricing_row_count: pricingRows.length,
      non_exact_scope_count: nonExactScopeCount,
      identity_mismatch_count: identityMismatchCount,
      priced_copy_count: pricedCopyCount,
      unpriced_copy_count: authenticatedTargets.length - pricedCopyCount,
      reconciled_total_usd: Number(reconciledTotalUsd.toFixed(6)),
      independent_total_usd: Number(independentTotalUsd.toFixed(6)),
      sample_group: sampleGroup,
    },
  };
}

function markdown(report) {
  const lines = [
    "# TCGPlayer Market Exact-Vault Production Readback",
    "",
    `- Audit: \`${AUDIT_VERSION}\``,
    `- Policy: \`${report.policy_version}\``,
    `- Status: \`${report.status}\``,
    `- Commit: \`${report.commit_sha}\``,
    "",
    "## Schema And Access",
    "",
    `- View: \`${report.schema.relation_name}\``,
    `- Authority mode: \`${report.schema.authority_mode}\``,
    `- Security options: \`${report.schema.relation_options.join(", ")}\``,
    `- Owner table RLS: \`${report.schema.owner_table_rls_enabled}\``,
    `- Authenticated SELECT: \`${report.access.authenticated_select_granted}\``,
    `- Anonymous runtime denied: \`${report.access.anonymous_runtime_denied}\``,
    `- Anonymous denial code: \`${report.access.anonymous_runtime_code}\``,
    "",
    "## Owner Scope",
    "",
    `- Expected targets: \`${report.owner_scope.expected_target_count}\``,
    `- Authenticated targets: \`${report.owner_scope.authenticated_target_count}\``,
    `- Foreign-owner targets: \`${report.owner_scope.foreign_owner_target_count}\``,
    `- Duplicate instances: \`${report.owner_scope.duplicate_instance_count}\``,
    "",
    "## Exact Pricing",
    "",
    `- Requested printings: \`${report.exact_pricing.requested_printing_count}\``,
    `- Returned pricing rows: \`${report.exact_pricing.returned_pricing_row_count}\``,
    `- Priced copies: \`${report.exact_pricing.priced_copy_count}\``,
    `- Unpriced copies: \`${report.exact_pricing.unpriced_copy_count}\``,
    `- Reconciled total USD: \`${report.exact_pricing.reconciled_total_usd}\``,
    `- Independent total USD: \`${report.exact_pricing.independent_total_usd}\``,
    "",
    "## Findings",
    "",
    ...(report.findings.length
      ? report.findings.map((finding) => `- \`${finding}\``)
      : ["- none"]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = connectionString();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required",
    );
  }
  const commitSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const trackedWorktreeClean =
    !git(["status", "--porcelain", "--untracked-files=no"]);
  if (args.requirePass && !args.expectedCommitSha) {
    throw new Error(
      "--expected-commit-sha is required with --require-pass",
    );
  }
  if (args.expectedCommitSha && args.expectedCommitSha !== commitSha) {
    throw new Error(
      `expected commit ${args.expectedCommitSha}, found ${commitSha}`,
    );
  }
  if (args.requirePass && !trackedWorktreeClean) {
    throw new Error("tracked worktree must be clean with --require-pass");
  }

  const client = new Client({
    connectionString: url,
    ssl: sslConfig(url),
    connectionTimeoutMillis: 15_000,
    statement_timeout: 120_000,
    query_timeout: 120_000,
  });
  await client.connect();
  try {
    const schemaEvidence = await querySchemaEvidence(client);
    const runtimeEvidence = await queryRuntimeEvidence(
      client,
      Boolean(schemaEvidence.relation_name),
    );
    const evaluation =
      evaluateTcgplayerMarketVaultProductionReadbackV1({
        schema: schemaEvidence,
        access: {
          ...schemaEvidence.access,
          ...runtimeEvidence.access,
        },
        owner_scope: runtimeEvidence.owner_scope,
        exact_pricing: runtimeEvidence.exact_pricing,
      });
    const report = {
      audit_version: AUDIT_VERSION,
      ...evaluation,
      as_of: new Date().toISOString(),
      commit_sha: commitSha,
      branch,
      tracked_worktree_clean: trackedWorktreeClean,
      boundaries: {
        database_reads_only: true,
        database_writes: false,
        ownership_mutations: false,
        pricing_mutations: false,
        publication_activation: false,
        grant_changes: false,
        customer_identifiers_in_artifacts: false,
      },
    };
    const runDir = path.join(args.outRoot, stamp());
    await fs.mkdir(runDir, { recursive: true });
    const runPlan = {
      audit_version: AUDIT_VERSION,
      policy_version:
        TCGPLAYER_MARKET_VAULT_PRODUCTION_READBACK_POLICY_V1,
      expected_commit_sha: args.expectedCommitSha || null,
      actual_commit_sha: commitSha,
      branch,
      tracked_worktree_clean: trackedWorktreeClean,
      require_pass: args.requirePass,
      boundaries: report.boundaries,
    };
    const files = {
      "run_plan.json": `${JSON.stringify(runPlan, null, 2)}\n`,
      "summary.json": `${JSON.stringify(report, null, 2)}\n`,
      "REPORT.md": markdown(report),
    };
    const hashes = {};
    for (const [name, contents] of Object.entries(files)) {
      await fs.writeFile(path.join(runDir, name), contents);
      hashes[name] = sha256(contents);
    }
    await fs.writeFile(
      path.join(runDir, "artifact_hashes.json"),
      `${JSON.stringify(hashes, null, 2)}\n`,
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          status: report.status,
          findings: report.findings,
          owner_scope: report.owner_scope,
          exact_pricing: report.exact_pricing,
          artifact_root: path
            .relative(REPO_ROOT, runDir)
            .replace(/\\/g, "/"),
        },
        null,
        2,
      )}\n`,
    );
    if (args.requirePass && report.status !== "passed") {
      process.exitCode = 1;
    }
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(
    `[market-vault-production-readback] ${error.stack || error.message}`,
  );
  process.exitCode = 1;
});
