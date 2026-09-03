import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import dotenv from "dotenv";
import pg from "pg";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..", "..");
const VERSION = "SYSTEM_PARITY_CRAWL_V1";
const EXPECTED_PROJECT_REF = "ycdxbpibncqcchqiihfz";
const DEFAULT_ORIGIN = "https://grookaivault.com";
const MAX_BUFFER = 128 * 1024 * 1024;

function argument(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function posix(value) {
  return value.replaceAll("\\", "/");
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortObject(value[key])]),
  );
}

export function stableJson(value) {
  return JSON.stringify(sortObject(value));
}

async function run(command, args, options = {}) {
  const result = await execFileAsync(command, args, {
    cwd: ROOT,
    windowsHide: true,
    maxBuffer: MAX_BUFFER,
    encoding: options.encoding ?? "utf8",
    env: process.env,
  });
  return result.stdout;
}

async function git(args, options = {}) {
  return run("git", args, options);
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function redactError(error) {
  return String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[redacted-database-url]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .slice(0, 1_000);
}

export function parseGitTree(raw) {
  const entries = [];
  for (const record of String(raw).split("\0")) {
    if (!record) continue;
    const tab = record.indexOf("\t");
    if (tab < 0) throw new Error("Invalid git tree record");
    const [mode, type, object] = record.slice(0, tab).split(" ");
    entries.push({ mode, type, object, path: posix(record.slice(tab + 1)) });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export function appRouteFromPath(filePath) {
  const prefix = "apps/web/src/app/";
  if (!filePath.startsWith(prefix)) return null;
  const suffix = filePath.slice(prefix.length);
  const kind = suffix.endsWith("/page.tsx") || suffix === "page.tsx"
    ? "page"
    : suffix.endsWith("/route.ts") || suffix === "route.ts"
      ? "route_handler"
      : null;
  if (!kind) return null;
  const leaf = kind === "page" ? /\/?page\.tsx$/ : /\/?route\.ts$/;
  const routePath = suffix.replace(leaf, "");
  return {
    path: routePath ? `/${routePath}` : "/",
    kind,
    source_path: filePath,
  };
}

async function readAtAuthority(authority, filePath) {
  return git(["show", `${authority}:${filePath}`]);
}

function workflowSchedules(source) {
  const schedules = [];
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/cron\s*:\s*["']?([^"'#]+)["']?/i);
    if (match) schedules.push(match[1].trim());
  }
  return [...new Set(schedules)].sort();
}

async function environmentNamesAtAuthority(authority) {
  let raw = "";
  try {
    raw = await git([
      "grep",
      "-h",
      "-E",
      "process[.]env[.][A-Z][A-Z0-9_]*|String[.]fromEnvironment[(][\"'][A-Z][A-Z0-9_]*",
      authority,
      "--",
      "*.js",
      "*.jsx",
      "*.mjs",
      "*.ts",
      "*.tsx",
      "*.dart",
    ]);
  } catch (error) {
    if (Number(error?.code) !== 1) throw error;
  }
  const names = new Set();
  for (const match of raw.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) names.add(match[1]);
  for (const match of raw.matchAll(/String\.fromEnvironment\(["']([A-Z][A-Z0-9_]*)/g)) names.add(match[1]);
  return [...names].sort();
}

function entrypointKind(filePath) {
  if (/^scripts\/workers\/.*\.(?:mjs|js|ts)$/.test(filePath)) return "worker";
  if (/^backend\/.*worker.*\.(?:mjs|js|ts)$/.test(filePath)) return "worker";
  if (/^supabase\/functions\/[^/]+\/index\.ts$/.test(filePath)) return "edge_function";
  if (/^\.github\/workflows\/.*\.ya?ml$/.test(filePath)) return "workflow";
  return null;
}

export async function buildRepositorySnapshot(authority = "origin/main") {
  const authoritySha = (await git(["rev-parse", `${authority}^{commit}`])).trim();
  const rawTree = await git(["ls-tree", "-r", "-z", "--full-tree", authority]);
  const tree = parseGitTree(rawTree);
  const packageEntry = tree.find((entry) => entry.path === "package.json");
  const packageJson = packageEntry
    ? JSON.parse(await readAtAuthority(authority, "package.json"))
    : { scripts: {}, dependencies: {}, devDependencies: {} };
  const migrations = tree.filter((entry) => /^supabase\/migrations\/.*\.sql$/.test(entry.path));
  const workflows = [];
  for (const entry of tree.filter((item) => /^\.github\/workflows\/.*\.ya?ml$/.test(item.path))) {
    const source = await readAtAuthority(authority, entry.path);
    workflows.push({ ...entry, schedules: workflowSchedules(source) });
  }
  const routes = tree.map((entry) => appRouteFromPath(entry.path)).filter(Boolean);
  const entrypoints = tree
    .map((entry) => ({ ...entry, entrypoint_kind: entrypointKind(entry.path) }))
    .filter((entry) => entry.entrypoint_kind);
  const configFiles = tree.filter((entry) =>
    /^(?:\.env\.example|supabase\/config\.toml|vercel\.json|firebase\.json|app\.json|apps\/web\/next\.config\.(?:js|mjs|ts)|android\/app\/build\.gradle(?:\.kts)?|ios\/Runner\/Info\.plist)$/.test(
      entry.path,
    ),
  );
  const envNames = await environmentNamesAtAuthority(authority);
  const treeJsonl = tree.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
  const snapshot = {
    schema_version: `${VERSION}_REPOSITORY_SNAPSHOT`,
    authority,
    authority_sha: authoritySha,
    tracked_file_count: tree.length,
    tracked_tree_sha256: sha256(treeJsonl),
    migrations,
    migration_count: migrations.length,
    migrations_sha256: sha256(stableJson(migrations)),
    workflows,
    workflow_count: workflows.length,
    workflows_sha256: sha256(stableJson(workflows)),
    web_routes: routes,
    web_route_count: routes.length,
    web_routes_sha256: sha256(stableJson(routes)),
    executable_entrypoints: entrypoints,
    executable_entrypoint_count: entrypoints.length,
    executable_entrypoints_sha256: sha256(stableJson(entrypoints)),
    config_files: configFiles,
    referenced_environment_variable_names: envNames,
    package: {
      object: packageEntry?.object ?? null,
      scripts: packageJson.scripts ?? {},
      dependencies: packageJson.dependencies ?? {},
      dev_dependencies: packageJson.devDependencies ?? {},
    },
  };
  return { snapshot, tree, treeJsonl };
}

function loadLocalEnvironment() {
  dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });
  dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });
}

function databaseConnectionString() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";
}

function projectRefFromUrl(value) {
  if (!value) return null;
  const match = String(value).match(/(?:https?:\/\/|db\.)([a-z0-9]{20})\.supabase\.co/i);
  return match?.[1] ?? null;
}

async function safeQuery(client, id, sql, params = []) {
  const savepoint = `parity_${id.replace(/[^a-z0-9_]/gi, "_").slice(0, 40)}`;
  await client.query(`savepoint ${savepoint}`);
  try {
    const result = await client.query(sql, params);
    await client.query(`release savepoint ${savepoint}`);
    return { status: "captured", row_count: result.rowCount, rows: result.rows };
  } catch (error) {
    await client.query(`rollback to savepoint ${savepoint}`);
    await client.query(`release savepoint ${savepoint}`);
    return { status: "unavailable", error: redactError(error), row_count: 0, rows: [] };
  }
}

function hashDefinitions(rows, field) {
  return rows.map((row) => {
    const value = row[field];
    const copy = { ...row, [`${field}_sha256`]: value == null ? null : sha256(String(value)) };
    delete copy[field];
    return copy;
  });
}

export async function buildDatabaseSnapshot(expectedProjectRef = EXPECTED_PROJECT_REF) {
  loadLocalEnvironment();
  const connectionString = databaseConnectionString();
  if (!connectionString) throw new Error("SUPABASE_DB_URL or DATABASE_URL is required");
  const configuredRefs = [
    projectRefFromUrl(connectionString),
    projectRefFromUrl(process.env.SUPABASE_URL),
  ].filter(Boolean);
  if (configuredRefs.length === 0 || configuredRefs.some((value) => value !== expectedProjectRef)) {
    throw new Error(`Database project-ref sanity failed; expected ${expectedProjectRef}`);
  }
  const client = new pg.Client({
    connectionString,
    ssl: /localhost|127\.0\.0\.1/i.test(connectionString) ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    await client.query("begin transaction read only");
    await client.query("set local statement_timeout = '120s'");
    const queries = {
      context: await safeQuery(client, "context", `
        select current_database() as database_name,
               current_user as database_user,
               current_setting('server_version_num') as server_version_num,
               pg_is_in_recovery() as is_replica
      `),
      relations: await safeQuery(client, "relations", `
        select n.nspname as schema_name, c.relname as relation_name, c.relkind,
               c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'auth', 'storage')
          and c.relkind in ('r', 'p', 'v', 'm', 'S')
        order by n.nspname, c.relname
      `),
      columns: await safeQuery(client, "columns", `
        select table_schema, table_name, ordinal_position, column_name, data_type,
               udt_name, is_nullable, column_default
        from information_schema.columns
        where table_schema in ('public', 'auth', 'storage')
        order by table_schema, table_name, ordinal_position
      `),
      constraints: await safeQuery(client, "constraints", `
        select n.nspname as schema_name, c.relname as relation_name, con.conname,
               con.contype, pg_get_constraintdef(con.oid, true) as definition
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in ('public', 'auth', 'storage')
        order by n.nspname, c.relname, con.conname
      `),
      indexes: await safeQuery(client, "indexes", `
        select schemaname as schema_name, tablename as relation_name, indexname,
               indexdef as definition
        from pg_indexes
        where schemaname in ('public', 'auth', 'storage')
        order by schemaname, tablename, indexname
      `),
      policies: await safeQuery(client, "policies", `
        select schemaname as schema_name, tablename as relation_name, policyname,
               permissive, roles, cmd, qual, with_check
        from pg_policies
        where schemaname in ('public', 'auth', 'storage')
        order by schemaname, tablename, policyname
      `),
      grants: await safeQuery(client, "grants", `
        select table_schema, table_name, grantee, privilege_type, is_grantable
        from information_schema.role_table_grants
        where table_schema in ('public', 'auth', 'storage')
        order by table_schema, table_name, grantee, privilege_type
      `),
      triggers: await safeQuery(client, "triggers", `
        select n.nspname as schema_name, c.relname as relation_name, t.tgname,
               pg_get_triggerdef(t.oid, true) as definition
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where not t.tgisinternal and n.nspname in ('public', 'auth', 'storage')
        order by n.nspname, c.relname, t.tgname
      `),
      functions: await safeQuery(client, "functions", `
        select n.nspname as schema_name, p.proname as function_name,
               pg_get_function_identity_arguments(p.oid) as identity_arguments,
               pg_get_function_result(p.oid) as result_type,
               p.prosecdef as security_definer, p.provolatile as volatility,
               pg_get_functiondef(p.oid) as definition
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
        order by p.proname, identity_arguments
      `),
      views: await safeQuery(client, "views", `
        select schemaname as schema_name, viewname as view_name, definition
        from pg_views
        where schemaname = 'public'
        union all
        select schemaname as schema_name, matviewname as view_name, definition
        from pg_matviews
        where schemaname = 'public'
        order by schema_name, view_name
      `),
      table_statistics: await safeQuery(client, "table_statistics", `
        select schemaname as schema_name, relname as relation_name,
               n_live_tup::bigint as estimated_live_rows,
               n_dead_tup::bigint as estimated_dead_rows,
               pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass)::bigint as total_bytes
        from pg_stat_user_tables
        where schemaname in ('public', 'auth', 'storage')
        order by schemaname, relname
      `),
      migration_ledger: await safeQuery(client, "migration_ledger", `
        select version, name
        from supabase_migrations.schema_migrations
        order by version
      `),
      games: await safeQuery(client, "games", `
        select code, name, slug from public.games order by code
      `),
      sets_by_game: await safeQuery(client, "sets_by_game", `
        select coalesce(game, '<null>') as game, count(*)::bigint as row_count,
               max(release_date) as latest_release_date,
               count(*) filter (where hero_image_url is not null)::bigint as with_hero_image
        from public.sets group by coalesce(game, '<null>') order by game
      `),
      card_prints_by_game: await safeQuery(client, "card_prints_by_game", `
        select g.code as game_code, coalesce(cp.identity_domain, '<null>') as identity_domain,
               count(*)::bigint as row_count,
               count(*) filter (where cp.gv_id is not null)::bigint as with_gv_id,
               count(*) filter (where cp.image_url is not null or cp.image_path is not null)::bigint as with_image
        from public.card_prints cp
        join public.games g on g.id = cp.game_id
        group by g.code, coalesce(cp.identity_domain, '<null>')
        order by g.code, identity_domain
      `),
    };
    await client.query("commit");
    queries.functions.rows = hashDefinitions(queries.functions.rows, "definition");
    queries.views.rows = hashDefinitions(queries.views.rows, "definition");
    const required = ["context", "relations", "columns", "policies", "functions", "migration_ledger", "games", "sets_by_game", "card_prints_by_game"];
    const failedRequiredQueries = required.filter((name) => queries[name].status !== "captured");
    const fingerprintPayload = Object.fromEntries(
      Object.entries(queries).map(([name, result]) => [name, { status: result.status, rows: result.rows }]),
    );
    return {
      schema_version: `${VERSION}_DATABASE_SNAPSHOT`,
      project_ref: expectedProjectRef,
      transaction_mode: "read_only",
      required_query_failures: failedRequiredQueries,
      queries,
      snapshot_sha256: sha256(stableJson(fingerprintPayload)),
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function parseJsonOutput(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeRemoteUrl(value) {
  try {
    const url = new URL(value);
    url.username = "";
    url.password = "";
    return url.toString();
  } catch {
    return value.replace(/:\/\/[^@]+@/, "://[redacted]@");
  }
}

export async function buildRuntimeSnapshot() {
  const errors = [];
  let repository = null;
  let workflowRuns = [];
  let pullRequests = [];
  let remoteHeads = [];
  try {
    repository = parseJsonOutput(
      await run("gh", ["repo", "view", "--json", "nameWithOwner,defaultBranchRef,url"]),
      null,
    );
  } catch (error) {
    errors.push({ component: "github_repository", error: redactError(error) });
  }
  try {
    workflowRuns = parseJsonOutput(
      await run("gh", ["run", "list", "--limit", "100", "--json", "databaseId,workflowName,status,conclusion,event,headSha,createdAt,updatedAt,url"]),
      [],
    );
  } catch (error) {
    errors.push({ component: "github_workflow_runs", error: redactError(error) });
  }
  try {
    pullRequests = parseJsonOutput(
      await run("gh", ["pr", "list", "--state", "all", "--limit", "200", "--json", "number,title,state,isDraft,headRefName,baseRefName,headRefOid,mergeStateStatus,updatedAt,url"]),
      [],
    );
  } catch (error) {
    errors.push({ component: "github_pull_requests", error: redactError(error) });
  }
  try {
    const raw = await git(["ls-remote", "--heads", "origin"]);
    remoteHeads = raw
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [object, ref] = line.split(/\s+/);
        return { object, ref };
      })
      .sort((left, right) => left.ref.localeCompare(right.ref));
  } catch (error) {
    errors.push({ component: "git_remote_heads", error: redactError(error) });
  }
  let deployment = null;
  try {
    const startedAt = Date.now();
    const response = await fetch(DEFAULT_ORIGIN, { method: "HEAD", redirect: "follow" });
    deployment = {
      requested_origin: DEFAULT_ORIGIN,
      final_origin: new URL(response.url).origin,
      status: response.status,
      latency_ms: Date.now() - startedAt,
      headers: Object.fromEntries(
        ["server", "x-vercel-id", "x-vercel-cache", "content-type"]
          .map((name) => [name, response.headers.get(name)])
          .filter(([, value]) => value != null),
      ),
    };
  } catch (error) {
    errors.push({ component: "deployment_head", error: redactError(error) });
  }
  return {
    schema_version: `${VERSION}_RUNTIME_SNAPSHOT`,
    repository,
    origin_url: safeRemoteUrl((await git(["remote", "get-url", "origin"])).trim()),
    remote_heads: remoteHeads,
    workflow_runs: workflowRuns,
    pull_requests: pullRequests,
    deployment,
    errors,
  };
}

function defaultProductRoutes() {
  return [
    { id: "home", path: "/" },
    { id: "search_pikachu", path: "/search?q=Pikachu" },
    { id: "sets", path: "/sets" },
    { id: "dex", path: "/dex" },
    { id: "legal", path: "/legal" },
    { id: "privacy", path: "/privacy" },
    { id: "support", path: "/support" },
  ];
}

async function inspectImages(page) {
  return page.locator("img").evaluateAll((images) =>
    images.map((image) => ({
      src: image.currentSrc || image.src,
      alt: image.alt,
      visible: Boolean(image.offsetWidth || image.offsetHeight || image.getClientRects().length),
      loaded: image.complete && image.naturalWidth > 0,
      natural_width: image.naturalWidth,
      natural_height: image.naturalHeight,
    })),
  );
}

export async function buildProductSnapshot(outDir, origin = DEFAULT_ORIGIN) {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { id: "desktop", width: 1440, height: 1000 },
    { id: "mobile", width: 390, height: 844 },
  ];
  const routes = defaultProductRoutes();
  const cases = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: "dark",
      });
      const page = await context.newPage();
      for (const route of routes) {
        const pageErrors = [];
        const requestFailures = [];
        const onPageError = (error) => pageErrors.push(redactError(error));
        const onRequestFailed = (request) => requestFailures.push({
          method: request.method(),
          url_sha256: sha256(request.url()),
          host: (() => { try { return new URL(request.url()).hostname; } catch { return null; } })(),
          failure: request.failure()?.errorText ?? "unknown",
        });
        page.on("pageerror", onPageError);
        page.on("requestfailed", onRequestFailed);
        const startedAt = Date.now();
        try {
          const response = await page.goto(`${origin}${route.path}`, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
          await page.waitForTimeout(500);
          const title = await page.title();
          const h1 = await page.locator("h1").allTextContents();
          const body = await page.locator("body").innerText();
          const images = await inspectImages(page);
          const screenshotName = `${viewport.id}_${route.id}.png`;
          await page.screenshot({
            path: path.join(outDir, screenshotName),
            fullPage: true,
            animations: "disabled",
          });
          const visibleImages = images.filter((image) => image.visible);
          cases.push({
            route_id: route.id,
            path: route.path,
            viewport: viewport.id,
            http_status: response?.status() ?? null,
            final_path: new URL(page.url()).pathname,
            duration_ms: Date.now() - startedAt,
            title,
            h1,
            body_text_sha256: sha256(body),
            hard_error_copy: /application error|internal server error|this page could not be found/i.test(body),
            visible_image_count: visibleImages.length,
            failed_visible_image_count: visibleImages.filter((image) => !image.loaded).length,
            visible_image_hosts: [...new Set(visibleImages.map((image) => {
              try { return new URL(image.src).hostname; } catch { return "invalid"; }
            }))].sort(),
            page_errors: pageErrors,
            request_failures: requestFailures,
            screenshot: screenshotName,
            status: response && response.status() < 400 && pageErrors.length === 0
              ? "captured"
              : "failed",
          });
        } catch (error) {
          cases.push({
            route_id: route.id,
            path: route.path,
            viewport: viewport.id,
            duration_ms: Date.now() - startedAt,
            status: "failed",
            error: redactError(error),
            page_errors: pageErrors,
            request_failures: requestFailures,
          });
        } finally {
          page.off("pageerror", onPageError);
          page.off("requestfailed", onRequestFailed);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return {
    schema_version: `${VERSION}_PRODUCT_SNAPSHOT`,
    origin,
    authentication: "signed_out",
    mutation_boundary: "GET navigation and screenshots only",
    route_count: routes.length,
    case_count: cases.length,
    failed_case_count: cases.filter((item) => item.status === "failed").length,
    cases,
  };
}

function keyed(rows, keyBuilder) {
  return new Map(rows.map((row) => [keyBuilder(row), row]));
}

function compareCollections(baselineRows, candidateRows, keyBuilder, changedBuilder = stableJson) {
  const baseline = keyed(baselineRows, keyBuilder);
  const candidate = keyed(candidateRows, keyBuilder);
  const removed = [...baseline.keys()].filter((key) => !candidate.has(key)).sort();
  const added = [...candidate.keys()].filter((key) => !baseline.has(key)).sort();
  const changed = [...baseline.keys()]
    .filter((key) => candidate.has(key) && changedBuilder(baseline.get(key)) !== changedBuilder(candidate.get(key)))
    .sort();
  return { removed, added, changed };
}

function allowedSet(ledger, key) {
  return new Set(Array.isArray(ledger?.[key]) ? ledger[key] : []);
}

export function compareRepositorySnapshots(baseline, candidate, ledger = {}) {
  const findings = [];
  const migrations = compareCollections(baseline.migrations ?? [], candidate.migrations ?? [], (row) => row.path);
  const workflows = compareCollections(baseline.workflows ?? [], candidate.workflows ?? [], (row) => row.path);
  const routes = compareCollections(baseline.web_routes ?? [], candidate.web_routes ?? [], (row) => `${row.kind}:${row.path}`);
  const entrypoints = compareCollections(
    baseline.executable_entrypoints ?? [],
    candidate.executable_entrypoints ?? [],
    (row) => `${row.entrypoint_kind}:${row.path}`,
  );
  const allowedRemovedPaths = allowedSet(ledger, "allowed_removed_paths");
  const allowedChangedWorkflows = allowedSet(ledger, "allowed_changed_workflows");
  for (const item of migrations.removed) findings.push({ severity: "regression", code: "migration_removed", item });
  for (const item of migrations.changed) findings.push({ severity: "regression", code: "migration_mutated", item });
  for (const item of workflows.removed) {
    if (!allowedRemovedPaths.has(item)) findings.push({ severity: "regression", code: "workflow_removed", item });
  }
  for (const item of workflows.changed) {
    if (!allowedChangedWorkflows.has(item)) findings.push({ severity: "regression", code: "workflow_changed_without_ledger", item });
  }
  for (const item of routes.removed) {
    const source = baseline.web_routes.find((row) => `${row.kind}:${row.path}` === item)?.source_path;
    if (!allowedRemovedPaths.has(source)) findings.push({ severity: "regression", code: "web_route_removed", item });
  }
  for (const item of entrypoints.removed) {
    const source = baseline.executable_entrypoints.find((row) => `${row.entrypoint_kind}:${row.path}` === item)?.path;
    if (!allowedRemovedPaths.has(source)) findings.push({ severity: "regression", code: "entrypoint_removed", item });
  }
  return { migrations, workflows, routes, entrypoints, findings };
}

function queryRows(snapshot, queryName) {
  return snapshot?.queries?.[queryName]?.rows ?? [];
}

export function compareDatabaseSnapshots(baseline, candidate, ledger = {}) {
  const findings = [];
  const relationKey = (row) => `${row.schema_name}.${row.relation_name}:${row.relkind}`;
  const functionKey = (row) => `${row.schema_name}.${row.function_name}(${row.identity_arguments})`;
  const policyKey = (row) => `${row.schema_name}.${row.relation_name}:${row.policyname}`;
  const relations = compareCollections(queryRows(baseline, "relations"), queryRows(candidate, "relations"), relationKey);
  const functions = compareCollections(queryRows(baseline, "functions"), queryRows(candidate, "functions"), functionKey);
  const policies = compareCollections(queryRows(baseline, "policies"), queryRows(candidate, "policies"), policyKey);
  const allowedRemovedObjects = allowedSet(ledger, "allowed_removed_database_objects");
  for (const [code, comparison] of [["relation", relations], ["function", functions], ["policy", policies]]) {
    for (const item of comparison.removed) {
      if (!allowedRemovedObjects.has(item)) findings.push({ severity: "regression", code: `${code}_removed`, item });
    }
  }
  const baselineCounts = keyed(queryRows(baseline, "card_prints_by_game"), (row) => `${row.game_code}:${row.identity_domain}`);
  const candidateCounts = keyed(queryRows(candidate, "card_prints_by_game"), (row) => `${row.game_code}:${row.identity_domain}`);
  for (const [key, baselineRow] of baselineCounts) {
    const candidateRow = candidateCounts.get(key);
    if (!candidateRow || Number(candidateRow.row_count) < Number(baselineRow.row_count)) {
      findings.push({ severity: "regression", code: "canonical_card_count_decreased", item: key });
    }
  }
  return { relations, functions, policies, findings };
}

export function compareProductSnapshots(baseline, candidate) {
  const findings = [];
  const keyBuilder = (row) => `${row.viewport}:${row.route_id}`;
  const baselineCases = keyed(baseline?.cases ?? [], keyBuilder);
  const candidateCases = keyed(candidate?.cases ?? [], keyBuilder);
  for (const [key, baselineCase] of baselineCases) {
    const candidateCase = candidateCases.get(key);
    if (!candidateCase) {
      findings.push({ severity: "regression", code: "product_case_missing", item: key });
      continue;
    }
    if (baselineCase.status === "captured" && candidateCase.status !== "captured") {
      findings.push({ severity: "regression", code: "product_case_failed", item: key });
    }
    if ((candidateCase.failed_visible_image_count ?? 0) > (baselineCase.failed_visible_image_count ?? 0)) {
      findings.push({ severity: "regression", code: "visible_image_failures_increased", item: key });
    }
    const allowedDuration = Math.max(Number(baselineCase.duration_ms ?? 0) * 1.5, Number(baselineCase.duration_ms ?? 0) + 2_000);
    if (Number(candidateCase.duration_ms ?? 0) > allowedDuration) {
      findings.push({ severity: "warning", code: "page_duration_regressed", item: key });
    }
  }
  return { findings };
}

export function compareParitySnapshots(baseline, candidate, ledger = {}) {
  const repository = compareRepositorySnapshots(baseline.repository, candidate.repository, ledger);
  const database = compareDatabaseSnapshots(baseline.database, candidate.database, ledger);
  const product = compareProductSnapshots(baseline.product, candidate.product);
  const findings = [...repository.findings, ...database.findings, ...product.findings];
  return {
    schema_version: `${VERSION}_COMPARISON`,
    baseline_authority_sha: baseline.manifest?.authority?.sha ?? null,
    candidate_authority_sha: candidate.manifest?.authority?.sha ?? null,
    repository,
    database,
    product,
    findings,
    regression_count: findings.filter((finding) => finding.severity === "regression").length,
    warning_count: findings.filter((finding) => finding.severity === "warning").length,
    parity_status: findings.some((finding) => finding.severity === "regression") ? "BLOCKED" : "PASS",
  };
}

async function hashArtifacts(outDir) {
  const files = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && entry.name !== "artifact_hashes.json") files.push(absolute);
    }
  }
  await walk(outDir);
  const hashes = {};
  for (const filePath of files.sort()) {
    hashes[posix(path.relative(outDir, filePath))] = sha256(await fs.readFile(filePath));
  }
  return {
    schema_version: `${VERSION}_ARTIFACT_HASHES`,
    artifact_count: Object.keys(hashes).length,
    files: hashes,
    manifest_sha256: sha256(stableJson(hashes)),
  };
}

async function loadSnapshotDirectory(directory) {
  return {
    manifest: await readJson(path.join(directory, "SYSTEM_PARITY_MANIFEST.json")),
    repository: await readJson(path.join(directory, "repository_snapshot.json")),
    database: await readJson(path.join(directory, "database_snapshot.json")),
    runtime: await readJson(path.join(directory, "runtime_snapshot.json")),
    product: await readJson(path.join(directory, "product_snapshot.json")),
  };
}

function reportMarkdown(manifest, summary, comparison = null) {
  const lines = [
    `# System Parity Crawl V1`,
    "",
    `- Capture kind: \`${manifest.capture_kind}\``,
    `- Authority: \`${manifest.authority.ref}\``,
    `- Authority SHA: \`${manifest.authority.sha}\``,
    `- Branch: \`${manifest.producer.branch}\``,
    `- Producer SHA: \`${manifest.producer.sha}\``,
    `- Boundary: read-only external systems; local audit artifacts only`,
    "",
    `## Capture`,
    "",
    `- Tracked files: ${summary.repository.tracked_files}`,
    `- Migrations: ${summary.repository.migrations}`,
    `- Workflows: ${summary.repository.workflows}`,
    `- Web routes: ${summary.repository.web_routes}`,
    `- Entrypoints: ${summary.repository.entrypoints}`,
    `- Database required-query failures: ${summary.database.required_query_failures}`,
    `- Product cases: ${summary.product.case_count}`,
    `- Product capture failures: ${summary.product.failed_case_count}`,
    `- Runtime capture errors: ${summary.runtime.error_count}`,
  ];
  if (comparison) {
    lines.push(
      "",
      "## Parity",
      "",
      `- Status: **${comparison.parity_status}**`,
      `- Regressions: ${comparison.regression_count}`,
      `- Warnings: ${comparison.warning_count}`,
    );
  }
  lines.push(
    "",
    "## Invariants",
    "",
    "- No database writes, auth-user creation, Storage writes, deployments, approvals, or publication changes were authorized or performed.",
    "- Repository inventory was read from the recorded authority ref, not inferred from the working tree.",
    "- Screenshots and browser navigation were signed out and GET-only.",
    "- Secrets are excluded; only referenced environment-variable names are recorded.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

async function capture() {
  const captureKind = argument("mode", "baseline");
  if (!new Set(["baseline", "candidate"]).has(captureKind)) {
    throw new Error("--mode must be baseline or candidate");
  }
  const authority = argument("authority", "origin/main");
  const outRoot = path.resolve(
    ROOT,
    argument("out-dir", `docs/audits/system_parity_crawl_v1/${captureKind}_${stamp()}`),
  );
  const trackedStatus = await git(["status", "--porcelain=v2", "--untracked-files=no"]);
  if (trackedStatus.trim()) throw new Error("Tracked working tree must be clean before capture");
  const producerSha = (await git(["rev-parse", "HEAD"])).trim();
  const producerBranch = (await git(["branch", "--show-current"])).trim();
  const authoritySha = (await git(["rev-parse", `${authority}^{commit}`])).trim();
  const crawlerObject = (await git(["hash-object", posix(path.relative(ROOT, __filename))])).trim();
  await fs.mkdir(outRoot, { recursive: true });
  const manifest = {
    schema_version: `${VERSION}_MANIFEST`,
    capture_kind: captureKind,
    captured_at: new Date().toISOString(),
    authority: { ref: authority, sha: authoritySha },
    producer: {
      branch: producerBranch,
      sha: producerSha,
      crawler_path: posix(path.relative(ROOT, __filename)),
      crawler_object_sha: crawlerObject,
      crawler_version: VERSION,
    },
    boundaries: {
      database: "read_only_transaction",
      github: "read_only_cli",
      browser: "signed_out_get_only",
      repository: "authority_tree_read_only",
      local_writes: "audit_directory_only",
    },
  };
  await writeJson(path.join(outRoot, "SYSTEM_PARITY_MANIFEST.json"), manifest);

  const repository = await buildRepositorySnapshot(authority);
  await fs.writeFile(path.join(outRoot, "repository_tree.jsonl"), repository.treeJsonl);
  await writeJson(path.join(outRoot, "repository_snapshot.json"), repository.snapshot);

  const database = hasFlag("skip-database")
    ? { schema_version: `${VERSION}_DATABASE_SNAPSHOT`, status: "skipped", required_query_failures: ["skipped"] }
    : await buildDatabaseSnapshot(argument("project-ref", EXPECTED_PROJECT_REF));
  await writeJson(path.join(outRoot, "database_snapshot.json"), database);

  const runtime = hasFlag("skip-runtime")
    ? { schema_version: `${VERSION}_RUNTIME_SNAPSHOT`, status: "skipped", errors: [{ component: "all", error: "skipped" }] }
    : await buildRuntimeSnapshot();
  await writeJson(path.join(outRoot, "runtime_snapshot.json"), runtime);

  let product;
  if (hasFlag("skip-product")) {
    product = { schema_version: `${VERSION}_PRODUCT_SNAPSHOT`, status: "skipped", case_count: 0, failed_case_count: 0, cases: [] };
  } else {
    try {
      product = await buildProductSnapshot(outRoot, argument("origin", DEFAULT_ORIGIN));
    } catch (error) {
      product = {
        schema_version: `${VERSION}_PRODUCT_SNAPSHOT`,
        status: "capture_error",
        case_count: 0,
        failed_case_count: 1,
        error: redactError(error),
        cases: [],
      };
    }
  }
  await writeJson(path.join(outRoot, "product_snapshot.json"), product);

  let comparison = null;
  if (captureKind === "candidate") {
    const baselineDir = argument("baseline-dir");
    if (!baselineDir) throw new Error("--baseline-dir is required for candidate mode");
    const baseline = await loadSnapshotDirectory(path.resolve(ROOT, baselineDir));
    const ledgerPath = argument("change-ledger");
    const ledger = ledgerPath ? await readJson(path.resolve(ROOT, ledgerPath)) : {};
    comparison = compareParitySnapshots(baseline, {
      manifest,
      repository: repository.snapshot,
      database,
      runtime,
      product,
    }, ledger);
    await writeJson(path.join(outRoot, "parity_comparison.json"), comparison);
  }

  const summary = {
    schema_version: `${VERSION}_SUMMARY`,
    status: comparison?.parity_status ?? "BASELINE_CAPTURED",
    authority_sha: authoritySha,
    producer_sha: producerSha,
    repository: {
      tracked_files: repository.snapshot.tracked_file_count,
      migrations: repository.snapshot.migration_count,
      workflows: repository.snapshot.workflow_count,
      web_routes: repository.snapshot.web_route_count,
      entrypoints: repository.snapshot.executable_entrypoint_count,
    },
    database: { required_query_failures: database.required_query_failures?.length ?? 0 },
    runtime: { error_count: runtime.errors?.length ?? 0 },
    product: { case_count: product.case_count ?? 0, failed_case_count: product.failed_case_count ?? 0 },
    parity: comparison
      ? { status: comparison.parity_status, regressions: comparison.regression_count, warnings: comparison.warning_count }
      : null,
  };
  await writeJson(path.join(outRoot, "summary.json"), summary);
  await fs.writeFile(path.join(outRoot, "REPORT.md"), reportMarkdown(manifest, summary, comparison));
  await writeJson(path.join(outRoot, "artifact_hashes.json"), await hashArtifacts(outRoot));
  process.stdout.write(`${JSON.stringify({ ...summary, artifact_root: posix(path.relative(ROOT, outRoot)) }, null, 2)}\n`);
  if ((database.required_query_failures?.length ?? 0) > 0) process.exitCode = 1;
  if (comparison?.parity_status === "BLOCKED") process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  capture().catch((error) => {
    console.error(`[system-parity-crawl] ${redactError(error)}`);
    process.exitCode = 1;
  });
}
