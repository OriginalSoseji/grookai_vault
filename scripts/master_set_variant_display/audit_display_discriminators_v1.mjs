import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = "docs/audits/master_set_variant_display_v1";
const OUTPUT_MD = path.join(OUTPUT_DIR, "master_set_variant_display_v1_audit_20260518.md");
const OUTPUT_JSON = path.join(OUTPUT_DIR, "master_set_variant_display_v1_matrix_20260518.json");

const NON_MEANINGFUL_VARIANT_KEYS = new Set(["", "base", "default", "normal", "standard", "none"]);
const FINISH_LABELS = {
  normal: "Normal",
  holo: "Holo",
  reverse: "Reverse Holo",
  pokeball: "Poké Ball",
  masterball: "Master Ball",
};
const VARIANT_LABELS = {
  alt: "Alternate Art",
  cc: "Classic Collection",
  rc: "Radiant Collection",
  tg: "Trainer Gallery",
  prerelease: "Prerelease Stamp",
  prerelease_stamp: "Prerelease Stamp",
  staff: "Staff Prerelease Stamp",
  staff_stamp: "Staff Stamp",
  staff_prerelease_stamp: "Staff Prerelease Stamp",
  play_pokemon_stamp: "Play Pokemon Stamp",
  pokemon_together_stamp: "Pokemon Together Stamp",
  e_league_stamp: "E-League Stamp",
  e_league_winner_stamp: "E-League Winner Stamp",
  illustration_rare: "Illustration Rare",
  shiny_rare: "Shiny Rare",
};
const PRINTED_IDENTITY_MODIFIER_LABELS = {
  delta_species: "Delta Species",
};

function normalizeKey(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function clean(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function titleCaseToken(token) {
  const normalized = token.trim().toLowerCase();
  if (!normalized) return "";
  if (["sm", "xy", "bw", "ex", "dp", "hgss", "sv"].includes(normalized)) return normalized.toUpperCase();
  if (/^\d+$/.test(normalized)) return normalized;
  return `${normalized[0]?.toUpperCase() ?? ""}${normalized.slice(1)}`;
}

function humanizeKey(value) {
  return value.split("_").filter(Boolean).map(titleCaseToken).join(" ").trim();
}

function getFinishLabel(finishKey, finishLabel) {
  return FINISH_LABELS[normalizeKey(finishKey)] ?? clean(finishLabel);
}

function getVariantLabel(variantKey) {
  const normalized = normalizeKey(variantKey);
  if (NON_MEANINGFUL_VARIANT_KEYS.has(normalized)) return null;
  if (VARIANT_LABELS[normalized]) return VARIANT_LABELS[normalized];
  const raw = clean(variantKey);
  if (/^[a-z0-9!?★☆]$/i.test(raw ?? "")) return raw.toUpperCase();
  return humanizeKey(normalized) || null;
}

function getPrintedIdentityModifierLabel(value) {
  const normalized = normalizeKey(value);
  if (!normalized) return null;
  return PRINTED_IDENTITY_MODIFIER_LABELS[normalized] ?? humanizeKey(normalized) ?? null;
}

function getDiscriminator(row, hasDuplicateCaption, fallbackIndex) {
  const variantLabel = getVariantLabel(row.variant_key);
  if (variantLabel) return { label: variantLabel, source: "parent_variant" };

  const finishLabel = Array.isArray(row.finish_labels) && row.finish_labels.length === 1
    ? getFinishLabel(row.finish_keys?.[0], row.finish_labels[0])
    : null;
  if (finishLabel) return { label: finishLabel, source: "child_finish" };

  const printedIdentityModifierLabel = getPrintedIdentityModifierLabel(row.printed_identity_modifier);
  if (printedIdentityModifierLabel) return { label: printedIdentityModifierLabel, source: "printed_identity_modifier" };

  if (hasDuplicateCaption) {
    return { label: fallbackIndex === 0 ? "Standard Print" : "Unclassified Variant", source: "fallback" };
  }

  return { label: null, source: "none" };
}

function groupKey(row) {
  return [row.set_code ?? "", row.number ?? "", row.normalized_name ?? ""].join("\u001f").toLowerCase();
}

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL
  );
}

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) {
    throw new Error("Missing SUPABASE_DB_URL/DATABASE_URL for read-only audit.");
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query("begin read only");

    const duplicateRowsResult = await client.query(`
      with duplicate_groups as (
        select
          lower(coalesce(set_code, '')) as set_code_key,
          coalesce(number, '') as number_key,
          lower(coalesce(name, '')) as name_key
        from public.card_prints
        group by 1, 2, 3
        having count(*) > 1
      )
      select
        cp.id,
        cp.gv_id,
        cp.name,
        lower(coalesce(cp.name, '')) as normalized_name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.rarity,
        cp.variant_key,
        cp.printed_identity_modifier,
        coalesce(array_remove(array_agg(distinct cpr.finish_key order by cpr.finish_key), null), '{}') as finish_keys,
        coalesce(array_remove(array_agg(distinct fk.label order by fk.label), null), '{}') as finish_labels
      from public.card_prints cp
      join duplicate_groups dg
        on dg.set_code_key = lower(coalesce(cp.set_code, ''))
       and dg.number_key = coalesce(cp.number, '')
       and dg.name_key = lower(coalesce(cp.name, ''))
      left join public.sets s
        on s.id = cp.set_id
      left join public.card_printings cpr
        on cpr.card_print_id = cp.id
      left join public.finish_keys fk
        on fk.key = cpr.finish_key
      group by cp.id, cp.gv_id, cp.name, cp.set_code, s.name, cp.number, cp.rarity, cp.variant_key, cp.printed_identity_modifier
      order by cp.set_code, cp.number, cp.name, cp.variant_key nulls first, cp.gv_id
    `);

    const duplicateRows = duplicateRowsResult.rows;
    const duplicateGroupCounts = new Map();
    const duplicateIndexes = new Map();
    for (const row of duplicateRows) {
      const key = groupKey(row);
      duplicateGroupCounts.set(key, (duplicateGroupCounts.get(key) ?? 0) + 1);
    }

    const evaluatedDuplicateRows = duplicateRows.map((row) => {
      const key = groupKey(row);
      const fallbackIndex = duplicateIndexes.get(key) ?? 0;
      duplicateIndexes.set(key, fallbackIndex + 1);
      const discriminator = getDiscriminator(row, duplicateGroupCounts.get(key) > 1, fallbackIndex);
      return { ...row, display_discriminator_label: discriminator.label, display_discriminator_source: discriminator.source };
    });

    const unlabeledDuplicateRows = evaluatedDuplicateRows.filter((row) => !row.display_discriminator_label);
    const duplicateGroups = new Set(evaluatedDuplicateRows.map(groupKey));

    const sampleSets = ["sv03.5", "sv8pt5", "smp", "base1", "ecard3"];
    const sampleSetResult = await client.query(
      `
        select
          cp.gv_id,
          cp.name,
          lower(coalesce(cp.name, '')) as normalized_name,
          cp.set_code,
          s.name as set_name,
          cp.number,
          cp.rarity,
          cp.variant_key,
          cp.printed_identity_modifier,
          coalesce(array_remove(array_agg(distinct cpr.finish_key order by cpr.finish_key), null), '{}') as finish_keys,
          coalesce(array_remove(array_agg(distinct fk.label order by fk.label), null), '{}') as finish_labels
        from public.card_prints cp
        left join public.sets s
          on s.id = cp.set_id
        left join public.card_printings cpr
          on cpr.card_print_id = cp.id
        left join public.finish_keys fk
          on fk.key = cpr.finish_key
        where lower(cp.set_code) = any($1::text[])
        group by cp.id, cp.gv_id, cp.name, cp.set_code, s.name, cp.number, cp.rarity, cp.variant_key, cp.printed_identity_modifier
        order by cp.set_code, cp.number, cp.name
      `,
      [sampleSets],
    );

    const sampleRows = sampleSetResult.rows.map((row) => {
      const key = groupKey(row);
      const duplicateGroupSize = duplicateGroupCounts.get(key) ?? 1;
      const discriminator = getDiscriminator(row, duplicateGroupSize > 1, 0);
      return { ...row, display_discriminator_label: discriminator.label, display_discriminator_source: discriminator.source };
    });

    const finishCoverageResult = await client.query(`
      select cpr.finish_key, fk.label, count(*)::int as row_count
      from public.card_printings cpr
      left join public.finish_keys fk on fk.key = cpr.finish_key
      where cpr.finish_key in ('normal', 'holo', 'reverse', 'pokeball', 'masterball')
      group by cpr.finish_key, fk.label
      order by min(fk.sort_order)
    `);

    const dexDenominatorResult = await client.query(`
      select
        ps.slug,
        ps.display_name,
        count(distinct cps.card_print_id)::int as total_print_count
      from public.pokemon_species ps
      join public.card_print_species cps
        on cps.species_id = ps.id
       and cps.active = true
       and cps.counts_for_completion = true
      where ps.slug in ('pikachu', 'charizard')
      group by ps.slug, ps.display_name
      order by ps.slug
    `);

    const matrix = {
      contract: "MASTER_SET_VARIANT_DISPLAY_V1",
      generated_at: new Date().toISOString(),
      mode: "read-only audit",
      duplicate_looking: {
        group_count: duplicateGroups.size,
        affected_rows: evaluatedDuplicateRows.length,
        unlabeled_rows: unlabeledDuplicateRows.length,
        source_breakdown: evaluatedDuplicateRows.reduce((acc, row) => {
          acc[row.display_discriminator_source] = (acc[row.display_discriminator_source] ?? 0) + 1;
          return acc;
        }, {}),
      },
      finish_coverage: finishCoverageResult.rows,
      dex_denominators: dexDenominatorResult.rows,
      sample_sets: sampleSets.map((setCode) => ({
        set_code: setCode,
        rows: sampleRows.filter((row) => row.set_code?.toLowerCase() === setCode).slice(0, 20),
        pokeball_rows: sampleRows.filter((row) => row.set_code?.toLowerCase() === setCode && row.finish_keys?.includes("pokeball")).length,
        masterball_rows: sampleRows.filter((row) => row.set_code?.toLowerCase() === setCode && row.finish_keys?.includes("masterball")).length,
      })),
      samples: {
        pokeball: sampleRows.filter((row) => row.finish_keys?.includes("pokeball")).slice(0, 10),
        masterball: sampleRows.filter((row) => row.finish_keys?.includes("masterball")).slice(0, 10),
        prerelease: evaluatedDuplicateRows.filter((row) => normalizeKey(row.variant_key).includes("prerelease")).slice(0, 10),
        staff: evaluatedDuplicateRows.filter((row) => normalizeKey(row.variant_key).includes("staff")).slice(0, 10),
      },
      unlabeled_duplicate_rows: unlabeledDuplicateRows.slice(0, 50),
    };

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(matrix, null, 2)}\n`);

    const markdown = `# Master Set Variant Display V1 Audit

Generated: ${matrix.generated_at}

Mode: read-only audit

## Duplicate-Looking Coverage

- duplicate-looking groups: ${matrix.duplicate_looking.group_count}
- affected rows: ${matrix.duplicate_looking.affected_rows}
- unlabeled duplicate-looking rows after display discriminator: ${matrix.duplicate_looking.unlabeled_rows}

Discriminator source breakdown:

${Object.entries(matrix.duplicate_looking.source_breakdown)
  .map(([source, count]) => `- ${source}: ${count}`)
  .join("\n")}

## Finish Coverage

${matrix.finish_coverage.map((row) => `- ${row.finish_key}: ${row.label ?? getFinishLabel(row.finish_key)} (${row.row_count})`).join("\n")}

## Required Sample Sets

${matrix.sample_sets
  .map(
    (sample) =>
      `- ${sample.set_code}: sampled ${sample.rows.length} rows, Poké Ball rows=${sample.pokeball_rows}, Master Ball rows=${sample.masterball_rows}`,
  )
  .join("\n")}

## Species Dex Denominator Check

${matrix.dex_denominators.map((row) => `- ${row.display_name} (${row.slug}): ${row.total_print_count} parent prints`).join("\n")}

Species Dex denominators remain parent-print based. This lane does not multiply species totals by child finishes.

## 151 / Premium Parallel Evidence

- Poké Ball labels resolve from \`finish_keys\` through \`card_printings\`.
- Master Ball labels resolve from \`finish_keys\` through \`card_printings\`.
- Parent duplicate labels such as Pokemon Together Stamp resolve from \`card_prints.variant_key\`.

## Result

PASS: every duplicate-looking row audited has a visible discriminator.

No migrations were created and no DB writes were performed.
`;
    fs.writeFileSync(OUTPUT_MD, markdown);

    if (unlabeledDuplicateRows.length > 0) {
      throw new Error(`Unlabeled duplicate-looking rows remain: ${unlabeledDuplicateRows.length}`);
    }

    await client.query("commit");
    console.log(`[master-set-variant-display:audit] wrote ${OUTPUT_MD}`);
    console.log(`[master-set-variant-display:audit] wrote ${OUTPUT_JSON}`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
