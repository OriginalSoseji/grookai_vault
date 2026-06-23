import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", quiet: true });
loadDotenv({ path: ".env", quiet: true });

const OUT_DIR = "docs/audits/image_truth_v1";
const JSON_OUT = path.join(OUT_DIR, "image_surface_consistency_scan_v1.json");
const MD_OUT = path.join(OUT_DIR, "image_surface_consistency_scan_v1.md");

const SURFACE_FILES = [
  "apps/web/src/app/page.tsx",
  "apps/web/src/app/vault/page.tsx",
  "apps/web/src/app/wall/page.tsx",
  "apps/web/src/lib/getPublicCardByGvId.ts",
  "apps/web/src/lib/getAdjacentPublicCardsByGvId.ts",
  "apps/web/src/lib/getSharedCardsBySlug.ts",
  "apps/web/src/lib/cards/getPublicCardsByGvIds.ts",
  "apps/web/src/lib/explore/getExploreRows.ts",
  "apps/web/src/lib/cards/getFeaturedExploreCards.ts",
  "apps/web/src/lib/network/getCardStreamRows.ts",
  "apps/web/src/lib/network/getUserCardInteractions.ts",
  "apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts",
];

const UI_FALLBACK_FILES = [
  "apps/web/src/app/card/[gv_id]/page.tsx",
  "apps/web/src/components/compare/CompareWorkspace.tsx",
  "apps/web/src/components/explore/ExploreDiscoverySections.tsx",
  "apps/web/src/components/explore/ExploreCardGridItem.tsx",
  "apps/web/src/components/explore/ExploreCardListItem.tsx",
  "apps/web/src/components/explore/ExploreCardDetailsRow.tsx",
];

function requiredEnv(nameCandidates) {
  for (const name of nameCandidates) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required env var: ${nameCandidates.join(" or ")}`);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasParentImageEvidence(row) {
  return Boolean(
    hasText(row.image_path) ||
      hasText(row.image_url) ||
      hasText(row.image_alt_url) ||
      hasText(row.representative_image_url),
  );
}

function hasChildImageEvidence(row) {
  return Boolean(
    hasText(row.image_path) ||
      hasText(row.image_url) ||
      hasText(row.image_alt_url),
  );
}

async function fetchAll(supabase, table, select, orderColumn) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderColumn, { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`${table} scan failed: ${error.message}`);
    }

    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function scoreSurfaceCoverage() {
  const helperPath = "apps/web/src/lib/cards/childDisplayImageFallbacks.ts";
  const helperExists = existsSync(helperPath);
  const surfaces = Object.fromEntries(
    SURFACE_FILES.map((file) => {
      const source = existsSync(file) ? readFileSync(file, "utf8") : "";
      return [file, source.includes("getChildDisplayImageFallbacks")];
    }),
  );
  const uiFallbacks = Object.fromEntries(
    UI_FALLBACK_FILES.map((file) => {
      const source = existsSync(file) ? readFileSync(file, "utf8") : "";
      return [file, source.includes("display_image_fallback_url")];
    }),
  );

  return {
    helper_exists: helperExists,
    data_surfaces: surfaces,
    ui_fallback_surfaces: uiFallbacks,
    passed:
      helperExists &&
      Object.values(surfaces).every(Boolean) &&
      Object.values(uiFallbacks).every(Boolean),
  };
}

function buildMarkdown(report) {
  const topSets = report.parent_missing_child_available.by_set
    .slice(0, 12)
    .map((row) => `| ${row.set_code} | ${row.count} |`)
    .join("\n");
  const examples = report.parent_missing_child_available.examples
    .slice(0, 25)
    .map(
      (row) =>
        `| ${row.gv_id} | ${row.name} | ${row.set_code} | ${row.number} | ${row.child_count} |`,
    )
    .join("\n");

  return `# Image Surface Consistency Scan V1

Generated: ${report.generated_at}

## Summary

- Parent identities scanned: ${report.parent_rows_scanned}
- Child printings scanned: ${report.child_rows_scanned}
- Parent identities with no parent image evidence but at least one child image: ${report.parent_missing_child_available.count}
- Surface coverage gate: ${report.surface_coverage.passed ? "PASS" : "FAIL"}
- Known Oshawott case covered: ${report.known_cases["GV-PK-MEP-051"] ? "YES" : "NO"}

## Surface Coverage

| Surface | Uses shared child fallback |
| --- | --- |
${Object.entries(report.surface_coverage.data_surfaces)
  .map(([file, passed]) => `| ${file} | ${passed ? "yes" : "no"} |`)
  .join("\n")}

## Top Sets

| Set code | Count |
| --- | ---: |
${topSets || "| none | 0 |"}

## Examples

| GV ID | Name | Set | Number | Child images |
| --- | --- | --- | --- | ---: |
${examples || "| none | none | none | none | 0 |"}
`;
}

const supabase = createClient(
  requiredEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]),
  requiredEnv([
    "SUPABASE_SECRET_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]),
  { auth: { persistSession: false } },
);

const parentRows = await fetchAll(
  supabase,
  "card_prints",
  "id,gv_id,name,set_code,number,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note",
  "id",
);
const childRows = await fetchAll(
  supabase,
  "card_printings",
  "id,card_print_id,printing_gv_id,finish_key,image_url,image_alt_url,image_source,image_path,image_status,image_note",
  "id",
);

const childrenWithImagesByParent = new Map();
for (const child of childRows.filter(hasChildImageEvidence)) {
  if (!child.card_print_id) continue;
  const existing = childrenWithImagesByParent.get(child.card_print_id) ?? [];
  existing.push(child);
  childrenWithImagesByParent.set(child.card_print_id, existing);
}

const parentMissingChildAvailable = parentRows
  .filter((row) => row.gv_id && !hasParentImageEvidence(row))
  .map((row) => ({
    ...row,
    children: childrenWithImagesByParent.get(row.id) ?? [],
  }))
  .filter((row) => row.children.length > 0)
  .sort((left, right) => {
    const setCompare = String(left.set_code ?? "").localeCompare(
      String(right.set_code ?? ""),
    );
    if (setCompare !== 0) return setCompare;
    return String(left.number ?? "").localeCompare(String(right.number ?? ""));
  });

const bySetMap = new Map();
for (const row of parentMissingChildAvailable) {
  const setCode = row.set_code ?? "unknown";
  bySetMap.set(setCode, (bySetMap.get(setCode) ?? 0) + 1);
}

const report = {
  contract: "IMAGE_SURFACE_CONSISTENCY_SCAN_V1",
  generated_at: new Date().toISOString(),
  parent_rows_scanned: parentRows.length,
  child_rows_scanned: childRows.length,
  surface_coverage: scoreSurfaceCoverage(),
  known_cases: {
    "GV-PK-MEP-051": parentMissingChildAvailable.some(
      (row) => row.gv_id === "GV-PK-MEP-051",
    ),
  },
  parent_missing_child_available: {
    count: parentMissingChildAvailable.length,
    by_set: Array.from(bySetMap.entries())
      .map(([set_code, count]) => ({ set_code, count }))
      .sort((left, right) => right.count - left.count || left.set_code.localeCompare(right.set_code)),
    examples: parentMissingChildAvailable.slice(0, 100).map((row) => ({
      gv_id: row.gv_id,
      name: row.name,
      set_code: row.set_code,
      number: row.number,
      image_status: row.image_status,
      child_count: row.children.length,
      first_child_printing_gv_id: row.children[0]?.printing_gv_id ?? null,
      first_child_finish_key: row.children[0]?.finish_key ?? null,
    })),
  },
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(MD_OUT, buildMarkdown(report));

console.log(JSON.stringify({
  json: JSON_OUT,
  markdown: MD_OUT,
  parent_missing_child_available: report.parent_missing_child_available.count,
  surface_coverage_passed: report.surface_coverage.passed,
  known_oshawott_case_covered: report.known_cases["GV-PK-MEP-051"],
}, null, 2));

if (!report.surface_coverage.passed) {
  process.exitCode = 1;
}
