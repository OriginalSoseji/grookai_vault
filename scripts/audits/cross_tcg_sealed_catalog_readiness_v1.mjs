import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import pg from "pg";

import {
  classifyCrossTcgSealedProductV1,
  CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1,
  SEALED_CLASSIFICATIONS_V1,
} from "../../backend/pricing/cross_tcg_sealed_product_identity_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_VERSION = "CROSS_TCG_SEALED_CATALOG_READINESS_AUDIT_V1";
const REQUIRED_PORTFOLIOS = [
  "Magic: The Gathering",
  "Pokemon",
  "Pokemon Japan",
  "One Piece Card Game",
];

function parseArgs(argv) {
  const args = {
    outDir: null,
    pageSize: 5000,
    sampleLimit: 5,
    connectionString:
      process.env.SUPABASE_DB_URL ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      null,
  };
  for (const arg of argv) {
    if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--page-size=")) args.pageSize = Number.parseInt(arg.slice(12), 10);
    else if (arg.startsWith("--sample-limit=")) args.sampleLimit = Number.parseInt(arg.slice(15), 10);
  }
  if (!args.connectionString) {
    throw new Error("SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL is required");
  }
  if (!Number.isInteger(args.pageSize) || args.pageSize < 100 || args.pageSize > 20000) {
    throw new Error("--page-size must be an integer from 100 through 20000");
  }
  if (!Number.isInteger(args.sampleLimit) || args.sampleLimit < 1 || args.sampleLimit > 20) {
    throw new Error("--sample-limit must be an integer from 1 through 20");
  }
  return args;
}

function git(args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function timestampSegment(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, "-");
}

function addCount(object, key, amount = 1) {
  object[key] = (object[key] ?? 0) + amount;
}

function sourceCategoryName(row) {
  return String(row.display_name ?? row.name ?? `category_${row.category_id}`).trim();
}

function stableSampleKey(row, classification) {
  return sha256(`${row.category_id}:${row.product_id}:${classification}`);
}

function boundedSampleInsert(bucket, sample, limit) {
  bucket.push(sample);
  bucket.sort((a, b) => a.sample_key.localeCompare(b.sample_key));
  if (bucket.length > limit) bucket.length = limit;
}

function compactSample(row, result) {
  return {
    sample_key: stableSampleKey(row, result.classification),
    source_category_id: row.category_id,
    source_category_name: row.category_display_name ?? row.category_name,
    source_group_id: row.group_id,
    source_group_name: row.group_name,
    source_product_id: row.product_id,
    source_product_name: row.name,
    classification: result.classification,
    confidence: result.confidence,
    package_form: result.candidate_identity.package_form,
    language_region: result.candidate_identity.language_region,
    edition_wave: result.candidate_identity.edition_wave,
    quantity_contents: result.candidate_identity.quantity_contents,
    release_presale_state: result.candidate_identity.release_presale_state,
    evidence: result.evidence,
    reasons: result.reasons,
    authority: {
      candidate_only: result.candidate_only,
      canonical_authority: result.canonical_authority,
      publication_authority: result.publication_authority,
      card_print_write_authority: result.card_print_write_authority,
    },
  };
}

async function readPortfolio(args) {
  const client = new Client({
    connectionString: args.connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: "grookai-cross-tcg-sealed-readiness-v1",
  });
  await client.connect();

  let transactionOpen = false;
  try {
    await client.query("begin transaction read only");
    transactionOpen = true;
    await client.query("set local statement_timeout = '180s'");
    const proofResult = await client.query(`
      select
        current_setting('transaction_read_only') as transaction_read_only,
        current_database() as database_name,
        current_user as database_user,
        now() as database_recorded_at
    `);
    const proof = proofResult.rows[0];
    if (proof?.transaction_read_only !== "on") {
      throw new Error("Production warehouse transaction is not read-only");
    }

    const categoryResult = await client.query(`
      with product_counts as materialized (
        select
          category_id,
          count(*)::int as product_count,
          count(*) filter (where source_active)::int as active_product_count,
          count(*) filter (where catalog_metadata_status = 'historical_price_only')::int
            as historical_only_product_count
        from public.tcgcsv_source_products
        group by category_id
      )
      select
        category.category_id,
        category.name,
        category.display_name,
        category.sealed_label,
        category.non_sealed_label,
        category.source_active,
        coalesce(product_counts.product_count, 0)::int as product_count,
        coalesce(product_counts.active_product_count, 0)::int as active_product_count,
        coalesce(product_counts.historical_only_product_count, 0)::int
          as historical_only_product_count
      from public.tcgcsv_source_categories category
      left join product_counts using (category_id)
      order by category.category_id
    `);

    const categoryById = new Map(categoryResult.rows.map((row) => [Number(row.category_id), row]));
    const overall = {
      active_products_classified: 0,
      classifications: Object.fromEntries(SEALED_CLASSIFICATIONS_V1.map((value) => [value, 0])),
      package_forms: {},
      presale_products: 0,
    };
    const categories = new Map();
    const samples = {};
    const ambiguityReasons = {};
    let cursor = 0;

    while (true) {
      const result = await client.query(
        `select
           product.product_id,
           product.category_id,
           product.group_id,
           product.name,
           product.clean_name,
           product.source_url,
           product.presale_info,
           product.extended_data,
           category.name as category_name,
           category.display_name as category_display_name,
           category.non_sealed_label,
           source_group.name as group_name
         from public.tcgcsv_source_products product
         join public.tcgcsv_source_categories category
           on category.category_id = product.category_id
         left join public.tcgcsv_source_groups source_group
           on source_group.group_id = product.group_id
         where product.source_active
           and product.product_id > $1
         order by product.product_id
         limit $2`,
        [cursor, args.pageSize],
      );
      if (result.rows.length === 0) break;

      for (const row of result.rows) {
        cursor = Number(row.product_id);
        const classification = classifyCrossTcgSealedProductV1(row);
        const categoryName = sourceCategoryName(
          categoryById.get(Number(row.category_id)) ?? row,
        );
        if (!categories.has(categoryName)) {
          const source = categoryById.get(Number(row.category_id)) ?? {};
          categories.set(categoryName, {
            source_category_id: Number(row.category_id),
            source_category_name: categoryName,
            source_active: source.source_active ?? null,
            source_product_count: Number(source.product_count ?? 0),
            source_active_product_count: Number(source.active_product_count ?? 0),
            classifications: Object.fromEntries(
              SEALED_CLASSIFICATIONS_V1.map((value) => [value, 0]),
            ),
            package_forms: {},
            presale_products: 0,
          });
        }

        const categorySummary = categories.get(categoryName);
        overall.active_products_classified += 1;
        overall.classifications[classification.classification] += 1;
        categorySummary.classifications[classification.classification] += 1;
        const packageForm = classification.candidate_identity.package_form;
        if (packageForm) {
          addCount(overall.package_forms, packageForm);
          addCount(categorySummary.package_forms, packageForm);
        }
        if (classification.candidate_identity.release_presale_state.is_presale) {
          overall.presale_products += 1;
          categorySummary.presale_products += 1;
        }
        if (classification.classification === "ambiguous_review") {
          addCount(ambiguityReasons, classification.reasons[0] ?? "unspecified");
        }

        const sampleBucket = `${categoryName}:${classification.classification}`;
        samples[sampleBucket] ??= [];
        boundedSampleInsert(
          samples[sampleBucket],
          compactSample(row, classification),
          args.sampleLimit,
        );
      }

      if (overall.active_products_classified % 50000 < result.rows.length) {
        process.stderr.write(
          `[sealed-readiness] classified=${overall.active_products_classified} cursor=${cursor}\n`,
        );
      }
    }

    await client.query("commit");
    transactionOpen = false;
    return {
      read_only_proof: {
        transaction_read_only: proof.transaction_read_only,
        database_name: proof.database_name,
        database_user: proof.database_user,
        database_recorded_at: proof.database_recorded_at,
        transaction_closed_before_artifact_output: true,
      },
      source_categories: categoryResult.rows.map((row) => ({
        source_category_id: Number(row.category_id),
        source_category_name: sourceCategoryName(row),
        source_active: row.source_active,
        sealed_label: row.sealed_label,
        non_sealed_label: row.non_sealed_label,
        product_count: Number(row.product_count),
        active_product_count: Number(row.active_product_count),
        historical_only_product_count: Number(row.historical_only_product_count),
      })),
      overall,
      category_classifications: [...categories.values()].sort(
        (a, b) => a.source_category_id - b.source_category_id,
      ),
      ambiguity_reasons: Object.entries(ambiguityReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
      deterministic_samples: Object.fromEntries(
        Object.entries(samples)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, values]) => [key, values]),
      ),
    };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("rollback");
      } catch {
        // Preserve the original failure.
      }
    }
    throw error;
  } finally {
    await client.end();
  }
}

function portfolioRows(result) {
  return REQUIRED_PORTFOLIOS.map((name) => {
    const row = result.category_classifications.find(
      (candidate) => candidate.source_category_name === name,
    );
    if (!row) throw new Error(`Required portfolio is missing: ${name}`);
    return row;
  });
}

function reportMarkdown(summary) {
  const rows = summary.required_portfolios;
  return `${[
    "# Cross-TCG Sealed Catalog Readiness V1",
    "",
    `- Audit: \`${summary.audit_version}\``,
    `- Policy: \`${summary.policy_version}\``,
    `- Producer commit: \`${summary.repository.producer_commit_sha}\``,
    `- Branch: \`${summary.repository.branch}\``,
    `- Source transaction read-only: \`${summary.read_only_proof.transaction_read_only}\``,
    `- Active products classified: \`${summary.overall.active_products_classified}\``,
    `- Database mutations: \`0\``,
    `- Canonical/publication authority: \`false\``,
    "",
    "## Portfolio Summary",
    "",
    "| Portfolio | Active products | Sealed candidates | Cards | Ambiguous | Excluded |",
    "|---|---:|---:|---:|---:|---:|",
    ...rows.map((row) =>
      `| ${row.source_category_name} | ${row.source_active_product_count} | ${row.classifications.sealed_candidate} | ${row.classifications.nonsealed_card} | ${row.classifications.ambiguous_review} | ${row.classifications.excluded_non_tcg_product} |`,
    ),
    "",
    "## Entire Warehouse",
    "",
    ...SEALED_CLASSIFICATIONS_V1.map(
      (value) => `- \`${value}\`: ${summary.overall.classifications[value]}`,
    ),
    `- Presale source products: ${summary.overall.presale_products}`,
    `- Source categories represented: ${summary.source_category_count}`,
    "",
    "## Package Forms",
    "",
    ...Object.entries(summary.overall.package_forms)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([form, count]) => `- \`${form}\`: ${count}`),
    "",
    "## Ambiguity",
    "",
    `- Total review queue: ${summary.overall.classifications.ambiguous_review}`,
    ...summary.ambiguity_reasons.slice(0, 10).map(
      (entry) => `- ${entry.count}: ${entry.reason}`,
    ),
    "",
    "An absent card number is not sealed evidence. Individual-card fields take precedence over package-like words, including One Piece DON!! cards and promotional card suffixes. Generic packaging words and retailer/custom groupings stay in review.",
    "",
    "## Boundaries",
    "",
    "- Source access used one explicit read-only transaction and closed before artifact output.",
    "- No migration, canonical mapping, Storage operation, image change, price publication, app visibility, release action, or Vault action occurred.",
    "- Sealed candidates remain separate from card-print identity.",
    "- Samples are deterministic and bounded; the audit does not copy the full warehouse.",
    "",
    "## Decision",
    "",
    "This gate proves source classification readiness only. It does not authorize a canonical sealed-domain schema or publication.",
    "",
    "Exact next gate: design a bounded canonical sealed-domain schema and migration plan, then review it before any canary apply.",
  ].join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const producerCommitSha = git(["rev-parse", "HEAD"]);
  const branch = git(["branch", "--show-current"]);
  const recordedAt = new Date().toISOString();
  const outDir =
    args.outDir ??
    path.join(
      ROOT,
      "docs",
      "audits",
      "pricing",
      "cross_tcg_sealed_catalog_readiness_v1",
      `${timestampSegment()}_read_only_portfolio`,
    );

  const result = await readPortfolio(args);
  const requiredPortfolios = portfolioRows(result);
  const samplesLogicalBody = `${JSON.stringify(
    {
      sample_schema_version: "CROSS_TCG_SEALED_CLASSIFICATION_SAMPLES_V1",
      sample_limit_per_category_and_classification: args.sampleLimit,
      samples: result.deterministic_samples,
    },
    null,
    2,
  )}\n`;
  const samplesGzip = gzipSync(Buffer.from(samplesLogicalBody, "utf8"), {
    level: 9,
    mtime: 0,
  });

  const summary = {
    audit_version: AUDIT_VERSION,
    policy_version: CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1,
    recorded_at: recordedAt,
    repository: { producer_commit_sha: producerCommitSha, branch },
    mode: "read_only_source_warehouse_portfolio_audit",
    read_only_proof: result.read_only_proof,
    source_category_count: result.source_categories.length,
    source_categories: result.source_categories,
    overall: result.overall,
    category_classifications: result.category_classifications,
    required_portfolios: requiredPortfolios,
    ambiguity_reasons: result.ambiguity_reasons,
    sample_artifact: {
      file: "deterministic_samples.json.gz",
      logical_sha256: sha256(samplesLogicalBody),
      logical_bytes: Buffer.byteLength(samplesLogicalBody),
      compressed_sha256: sha256(samplesGzip),
      compressed_bytes: samplesGzip.byteLength,
    },
    authority: {
      candidate_only: true,
      canonical_authority: false,
      publication_authority: false,
      card_print_write_authority: false,
    },
    boundaries: {
      database_mutations: false,
      migrations: false,
      storage_or_network_acquisition: false,
      image_changes: false,
      pricing_publication: false,
      app_visibility: false,
      release_changes: false,
      vault_actions: false,
      deployment: false,
      active_mtg_ingestion_changes: false,
    },
    next_gate: "bounded_canonical_sealed_domain_schema_and_migration_plan",
  };

  const runPlan = {
    audit_version: AUDIT_VERSION,
    producer_commit_sha: producerCommitSha,
    branch,
    exact_policy_version: CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1,
    mode: "read_only",
    page_size: args.pageSize,
    sample_limit_per_category_and_classification: args.sampleLimit,
    required_portfolios: REQUIRED_PORTFOLIOS,
    boundaries: summary.boundaries,
  };

  await fs.mkdir(outDir, { recursive: true });
  const artifacts = new Map();
  const addJson = (name, value) => {
    const body = `${JSON.stringify(value, null, 2)}\n`;
    artifacts.set(name, Buffer.from(body, "utf8"));
  };
  addJson("run_plan.json", runPlan);
  addJson("summary.json", summary);
  addJson("classification_counts_by_category.json", {
    policy_version: CROSS_TCG_SEALED_PRODUCT_IDENTITY_POLICY_V1,
    categories: result.category_classifications,
  });
  addJson("ambiguity_summary.json", {
    total: result.overall.classifications.ambiguous_review,
    reasons: result.ambiguity_reasons,
  });
  artifacts.set("deterministic_samples.json.gz", samplesGzip);
  artifacts.set("REPORT.md", Buffer.from(reportMarkdown(summary), "utf8"));

  for (const [name, body] of artifacts) {
    await fs.writeFile(path.join(outDir, name), body);
  }

  const hashManifest = {
    hash_algorithm: "sha256",
    producer_commit_sha: producerCommitSha,
    artifacts: Object.fromEntries(
      [...artifacts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, body]) => [name, { sha256: sha256(body), bytes: body.byteLength }]),
    ),
  };
  const manifestBody = `${JSON.stringify(hashManifest, null, 2)}\n`;
  await fs.writeFile(path.join(outDir, "artifact_hashes.json"), manifestBody, "utf8");

  process.stdout.write(
    `${JSON.stringify({
      out_dir: outDir,
      producer_commit_sha: producerCommitSha,
      active_products_classified: result.overall.active_products_classified,
      classifications: result.overall.classifications,
      compressed_sample_bytes: samplesGzip.byteLength,
      next_gate: summary.next_gate,
    })}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
