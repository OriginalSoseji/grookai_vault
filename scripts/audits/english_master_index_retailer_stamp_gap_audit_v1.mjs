import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const EMI_DIR = path.join(ROOT, "docs", "audits", "verified_master_set_index_v1", "english_master_index_v1");
const OUT_DIR = path.join(EMI_DIR, "retailer_stamp_gap_audit_v1");
const OUT_JSON = path.join(OUT_DIR, "retailer_stamp_gap_audit_v1.json");
const OUT_MD = path.join(OUT_DIR, "retailer_stamp_gap_audit_v1.md");

const RETAILER_VARIANTS = new Set(["build_a_bear_workshop_stamp", "toys_r_us_stamp"]);
const RETAILER_TEXT_PATTERN = /(build.?a.?bear|toys.?r.?us|toy.?s.?r.?us)/i;

dotenv.config({ path: path.join(ROOT, ".env.local") });
dotenv.config({ path: path.join(ROOT, "apps", "web", ".env.local") });
dotenv.config({ path: path.join(ROOT, ".env") });

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(EMI_DIR, relativePath), "utf8"));
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKeyText(value) {
  return normalizeText(value).toLowerCase();
}

function detectRetailerVariant(row) {
  const variantKey = normalizeKeyText(row.variant_key);
  if (RETAILER_VARIANTS.has(variantKey)) {
    return variantKey;
  }

  const stampLabel = normalizeKeyText(row.stamp_label);
  if (stampLabel.includes("build") && stampLabel.includes("bear")) {
    return "build_a_bear_workshop_stamp";
  }
  if (stampLabel.includes("toy") && stampLabel.includes("us")) {
    return "toys_r_us_stamp";
  }

  const blob = JSON.stringify(row);
  if (/build.?a.?bear/i.test(blob)) {
    return "build_a_bear_workshop_stamp";
  }
  if (/toys.?r.?us|toy.?s.?r.?us/i.test(blob)) {
    return "toys_r_us_stamp";
  }
  return null;
}

function candidateKey(row, variantKey) {
  return [
    normalizeKeyText(row.set_key ?? row.set_code),
    normalizeKeyText(row.card_number ?? row.number),
    normalizeKeyText(row.card_name ?? row.name),
    variantKey,
  ].join("|");
}

function rowToCandidate(row, sourceBucket) {
  const variantKey = detectRetailerVariant(row);
  if (!variantKey) {
    return null;
  }

  const evidenceUrls = [
    ...(Array.isArray(row.evidence_urls) ? row.evidence_urls : []),
    ...(Array.isArray(row.preserved_evidence_urls) ? row.preserved_evidence_urls : []),
    ...(row.source_url ? [row.source_url] : []),
  ]
    .map(normalizeText)
    .filter(Boolean);

  const evidenceLabels = [
    ...(Array.isArray(row.evidence_labels) ? row.evidence_labels : []),
    ...(Array.isArray(row.preserved_evidence_labels) ? row.preserved_evidence_labels : []),
    row.evidence_label,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return {
    key: candidateKey(row, variantKey),
    source_bucket: sourceBucket,
    set_key: normalizeKeyText(row.set_key ?? row.set_code),
    set_name: normalizeText(row.set_name),
    card_number: normalizeText(row.card_number ?? row.number),
    card_name: normalizeText(row.card_name ?? row.name),
    variant_key: variantKey,
    stamp_label:
      variantKey === "build_a_bear_workshop_stamp" ? "Build-A-Bear Workshop Stamp" : "Toys R Us Stamp",
    finish_key: normalizeText(row.finish_key) || null,
    status: normalizeText(row.status ?? row.routing_status ?? row.readiness_status ?? row.classification) || null,
    sources: Array.isArray(row.sources) ? row.sources.map(normalizeText).filter(Boolean) : [],
    evidence_urls: Array.from(new Set(evidenceUrls)),
    evidence_labels: Array.from(new Set(evidenceLabels)),
    raw_snapshot_ref: normalizeText(row.raw_snapshot_ref) || null,
  };
}

function mergeCandidate(existing, next) {
  return {
    ...existing,
    source_buckets: Array.from(new Set([...(existing.source_buckets ?? [existing.source_bucket]), next.source_bucket])),
    statuses: Array.from(new Set([...(existing.statuses ?? [existing.status].filter(Boolean)), next.status].filter(Boolean))),
    sources: Array.from(new Set([...(existing.sources ?? []), ...(next.sources ?? [])])),
    evidence_urls: Array.from(new Set([...(existing.evidence_urls ?? []), ...(next.evidence_urls ?? [])])),
    evidence_labels: Array.from(new Set([...(existing.evidence_labels ?? []), ...(next.evidence_labels ?? [])])),
    raw_snapshot_refs: Array.from(
      new Set([...(existing.raw_snapshot_refs ?? [existing.raw_snapshot_ref].filter(Boolean)), next.raw_snapshot_ref].filter(Boolean)),
    ),
  };
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase service credentials for read-only audit.");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function fetchDbRows(candidates) {
  const supabase = getSupabaseClient();
  const setCodes = Array.from(new Set(candidates.map((row) => row.set_key).filter(Boolean)));
  if (setCodes.length === 0) {
    return [];
  }

  const rows = [];
  for (let index = 0; index < setCodes.length; index += 50) {
    const batch = setCodes.slice(index, index + 50);
    const { data, error } = await supabase
      .from("card_prints")
      .select(
        "id,gv_id,set_code,name,number,variant_key,printed_identity_modifier,card_printings(id,finish_key,printing_gv_id)",
      )
      .in("set_code", batch);
    if (error) {
      throw new Error(`[retailer-stamp-gap] DB read failed: ${error.message}`);
    }
    rows.push(...(data ?? []));
  }

  return rows;
}

function buildDbLookup(dbRows) {
  const byCandidateKey = new Map();
  for (const row of dbRows) {
    const variantKey = detectRetailerVariant(row) ?? detectRetailerVariant({ variant_key: row.printed_identity_modifier });
    if (!variantKey) {
      continue;
    }
    const key = candidateKey(
      {
        set_key: row.set_code,
        card_number: row.number,
        card_name: row.name,
      },
      variantKey,
    );
    const bucket = byCandidateKey.get(key) ?? [];
    bucket.push({
      card_print_id: row.id,
      gv_id: row.gv_id,
      set_code: row.set_code,
      name: row.name,
      number: row.number,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      child_printings: row.card_printings ?? [],
    });
    byCandidateKey.set(key, bucket);
  }
  return byCandidateKey;
}

function buildMasterLookup(printings) {
  const byCandidateKey = new Map();
  for (const row of printings) {
    const variantKey = detectRetailerVariant(row);
    if (!variantKey) {
      continue;
    }
    const key = candidateKey(row, variantKey);
    const bucket = byCandidateKey.get(key) ?? [];
    bucket.push({
      status: row.status,
      finish_key: row.finish_key,
      source_count: row.source_count,
      sources: row.sources ?? [],
      evidence_urls: row.evidence_urls ?? [],
    });
    byCandidateKey.set(key, bucket);
  }
  return byCandidateKey;
}

function summarizeBy(rows, field) {
  const out = {};
  for (const row of rows) {
    const value = row[field] ?? "unknown";
    out[value] = (out[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort(([left], [right]) => left.localeCompare(right)));
}

function getClassification(candidate) {
  if (candidate.db_rows.length > 0) {
    return "already_in_db";
  }
  if (candidate.master_index_rows.length > 0) {
    const hasOnlyLegacyStampedFinish = candidate.master_index_rows.every(
      (row) => normalizeKeyText(row.finish_key) === "stamped",
    );
    if (hasOnlyLegacyStampedFinish) {
      return "master_index_legacy_stamped_finish_requires_active_finish";
    }
    return "in_master_index_missing_from_db";
  }
  if (candidate.finish_key) {
    return "source_backed_ready_for_package_review";
  }
  if (candidate.evidence_urls.some((url) => /bulbapedia\.bulbagarden\.net/i.test(url))) {
    return "needs_active_finish_route_from_bulbapedia";
  }
  return "needs_active_finish_second_source";
}

async function main() {
  const [stampedReadiness, pricechartingLabels, masterPrintings] = await Promise.all([
    readJson("english_master_index_stamped_identity_readiness_v1.json"),
    readJson("english_master_index_pkg17i4_pricecharting_stamp_label_readiness_v1.json"),
    readJson("english_master_index_printings_v1.json"),
  ]);

  const rawCandidates = [
    ...((stampedReadiness.rows ?? []).map((row) => rowToCandidate(row, "stamped_identity_readiness"))),
    ...((pricechartingLabels.rows ?? pricechartingLabels.candidates ?? []).map((row) =>
      rowToCandidate(row, "pricecharting_stamp_label_readiness"),
    )),
  ].filter(Boolean);

  const candidatesByKey = new Map();
  for (const candidate of rawCandidates) {
    const existing = candidatesByKey.get(candidate.key);
    candidatesByKey.set(candidate.key, existing ? mergeCandidate(existing, candidate) : { ...candidate, source_buckets: [candidate.source_bucket] });
  }

  const candidates = Array.from(candidatesByKey.values()).sort((left, right) =>
    [left.variant_key, left.set_key, left.card_number, left.card_name].join("|").localeCompare(
      [right.variant_key, right.set_key, right.card_number, right.card_name].join("|"),
    ),
  );
  const [dbRows, masterLookup] = await Promise.all([
    fetchDbRows(candidates),
    Promise.resolve(buildMasterLookup(masterPrintings.printings ?? [])),
  ]);
  const dbLookup = buildDbLookup(dbRows);

  const rows = candidates.map((candidate) => {
    const enriched = {
      ...candidate,
      master_index_rows: masterLookup.get(candidate.key) ?? [],
      db_rows: dbLookup.get(candidate.key) ?? [],
    };
    return {
      ...enriched,
      classification: getClassification(enriched),
    };
  });

  const summary = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    total_candidates: rows.length,
    by_variant_key: summarizeBy(rows, "variant_key"),
    by_classification: summarizeBy(rows, "classification"),
  };
  const payload = {
    version: "retailer_stamp_gap_audit_v1",
    ...summary,
    sources_used: [
      "english_master_index_stamped_identity_readiness_v1",
      "english_master_index_pkg17i4_pricecharting_stamp_label_readiness_v1",
      "english_master_index_printings_v1",
      "live_read_only_card_prints",
    ],
    rows,
  };
  payload.fingerprint_sha256 = crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);

  const lines = [
    "# Retailer Stamp Gap Audit V1",
    "",
    `Generated: ${summary.generated_at}`,
    "",
    "Audit-only. No DB writes, migrations, cleanup, quarantine, or apply actions were performed.",
    "",
    "## Summary",
    "",
    `- Total retailer stamp candidates: ${summary.total_candidates}`,
    `- Build-A-Bear Workshop candidates: ${summary.by_variant_key.build_a_bear_workshop_stamp ?? 0}`,
    `- Toys R Us candidates: ${summary.by_variant_key.toys_r_us_stamp ?? 0}`,
    `- Fingerprint: ${payload.fingerprint_sha256}`,
    "",
    "## Classification Counts",
    "",
    ...Object.entries(summary.by_classification).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Candidate Rows",
    "",
    "| set | number | card | stamp | classification | evidence |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => {
      const evidence = row.evidence_urls.slice(0, 3).join("<br>");
      return `| ${row.set_key} | ${row.card_number} | ${row.card_name} | ${row.stamp_label} | ${row.classification} | ${evidence} |`;
    }),
    "",
    "## Safety",
    "",
    "- db_writes_performed: false",
    "- migrations_created: false",
    "- cleanup_performed: false",
    "- quarantine_performed: false",
  ];
  await fs.writeFile(OUT_MD, `${lines.join("\n")}\n`);

  console.log(JSON.stringify({ summary, report: OUT_MD, json: OUT_JSON }, null, 2));
  if ((summary.by_classification.needs_active_finish_second_source ?? 0) > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
