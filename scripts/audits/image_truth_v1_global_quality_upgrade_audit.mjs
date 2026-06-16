import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const JSON_OUT = path.join(OUTPUT_DIR, 'image_truth_global_quality_upgrade_audit_v1.json');
const MD_OUT = path.join(OUTPUT_DIR, 'image_truth_global_quality_upgrade_audit_v1.md');
const QUEUE_JSON_OUT = path.join(OUTPUT_DIR, 'image_truth_high_quality_upgrade_queue_v1.json');
const QUEUE_MD_OUT = path.join(OUTPUT_DIR, 'image_truth_high_quality_upgrade_queue_v1.md');

const POKEMONTCG_COMPATIBLE_SET_PATTERN =
  /^(base|gym|neo|ecard|ex|dp|pl|hgss|col|bw|xy|sm|swsh|sv|pop|sma|smp|svp|xyp|bwp|np|det|cel|g|ru|dv|pgo|fut)/;

const FINISH_EXACT_REQUIRED = new Set([
  'reverse',
  'reverse_holo',
  'pokeball',
  'poke_ball_reverse',
  'masterball',
  'master_ball_reverse',
  'rocket_reverse',
  'cosmos',
  'cosmos_holo',
  'cracked_ice',
  'stamped',
]);

const STAMP_OR_MODIFIER_PATTERN =
  /(stamp|stamped|staff|league|winner|prerelease|pokemon_together|play_pokemon|first_edition|1st_edition|championship|professor|pokemon_center|eb_games|gamestop|toys_r_us)/i;

function requireDbUrl() {
  return (
    process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    null
  );
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeNumber(value) {
  const normalized = String(value ?? '').trim();
  if (/^\d+$/.test(normalized)) return String(Number(normalized));
  return normalized;
}

function isTcgdexUrl(url) {
  return String(url ?? '').startsWith('https://assets.tcgdex.net/en/');
}

function isPokemonTcgUrl(url) {
  return String(url ?? '').startsWith('https://images.pokemontcg.io/');
}

function normalizeTcgdexHighUrl(url) {
  const normalized = clean(url);
  if (!normalized || !isTcgdexUrl(normalized)) return null;
  if (normalized.endsWith('/high.webp')) return normalized;
  const withoutKnownFile = normalized.replace(/\/(?:low|high)\.(?:webp|png|jpg|jpeg)$/i, '');
  return `${withoutKnownFile.replace(/\/+$/, '')}/high.webp`;
}

function pokemonTcgHiresUrl(row) {
  const setCode = clean(row.set_code)?.toLowerCase();
  const number = normalizeNumber(row.number_plain ?? row.number);
  if (!setCode || !number) return null;
  if (!POKEMONTCG_COMPATIBLE_SET_PATTERN.test(setCode)) return null;
  if (number.includes('/')) return null;
  return `https://images.pokemontcg.io/${encodeURIComponent(setCode)}/${encodeURIComponent(number)}_hires.png`;
}

function pokemonTcgSmallToHiresUrl(url) {
  const normalized = clean(url);
  if (!normalized || !isPokemonTcgUrl(normalized)) return null;
  if (normalized.includes('_hires.')) return normalized;
  return normalized.replace(/\.png$/i, '_hires.png');
}

function bestCurrentUrl(row, prefix) {
  return clean(row[`${prefix}_image_url`]) ?? clean(row[`${prefix}_image_alt_url`]) ?? null;
}

function classifyCurrentQuality(url) {
  if (!url) return 'missing';
  if (isPokemonTcgUrl(url) && /_hires\.png$/i.test(url)) return 'high_quality';
  if (isPokemonTcgUrl(url)) return 'pokemon_tcg_small';
  if (isTcgdexUrl(url) && /\/high\.webp$/i.test(url)) return 'tcgdex_high_webp';
  if (isTcgdexUrl(url)) return 'tcgdex_non_high';
  if (/\/storage\/v1\/object\//i.test(url)) return 'grookai_storage_asset';
  return 'external_unknown_quality';
}

function parentUpgrade(row) {
  const currentUrl = bestCurrentUrl(row, 'parent');
  const currentQuality = classifyCurrentQuality(currentUrl);
  const ptcgHires = pokemonTcgHiresUrl(row);
  const tcgdexHigh = normalizeTcgdexHighUrl(currentUrl);
  const pokemonTcgHiresFromCurrent = pokemonTcgSmallToHiresUrl(currentUrl);

  if (currentQuality === 'pokemon_tcg_small' && pokemonTcgHiresFromCurrent && pokemonTcgHiresFromCurrent !== currentUrl) {
    return {
      bucket: 'parent_small_to_pokemontcg_hires',
      current_url: currentUrl,
      candidate_url: pokemonTcgHiresFromCurrent,
      candidate_source: 'pokemontcg_hires',
      confidence: 'high_confidence_representative_upgrade',
      reason: 'Current PokemonTCG small image has deterministic _hires counterpart.',
    };
  }

  if (currentQuality === 'tcgdex_non_high' && tcgdexHigh && tcgdexHigh !== currentUrl) {
    return {
      bucket: 'parent_tcgdex_non_high_to_tcgdex_high',
      current_url: currentUrl,
      candidate_url: tcgdexHigh,
      candidate_source: 'tcgdex_high',
      confidence: 'high_confidence_representative_upgrade',
      reason: 'Current TCGdex image can be normalized to high.webp.',
    };
  }

  if (currentQuality === 'tcgdex_high_webp' && ptcgHires) {
    return {
      bucket: 'parent_tcgdex_high_to_pokemontcg_hires_candidate',
      current_url: currentUrl,
      candidate_url: ptcgHires,
      candidate_source: 'pokemontcg_hires',
      confidence: 'candidate_requires_head_probe',
      reason: 'PokemonTCG hires is likely larger for compatible set/number; needs probe before DB update.',
    };
  }

  if (currentQuality === 'missing' && ptcgHires) {
    return {
      bucket: 'parent_missing_to_pokemontcg_hires_candidate',
      current_url: currentUrl,
      candidate_url: ptcgHires,
      candidate_source: 'pokemontcg_hires',
      confidence: 'candidate_requires_head_probe',
      reason: 'Deterministic PokemonTCG hires URL may provide display coverage.',
    };
  }

  return {
    bucket: 'no_parent_quality_upgrade_candidate',
    current_url: currentUrl,
    candidate_url: null,
    candidate_source: null,
    confidence: currentQuality,
    reason: 'No deterministic higher-quality representative candidate identified.',
  };
}

function childExactRequired(row) {
  const finish = normalizeKey(row.finish_key);
  if (FINISH_EXACT_REQUIRED.has(finish)) return true;
  return STAMP_OR_MODIFIER_PATTERN.test(`${row.variant_key ?? ''} ${row.printed_identity_modifier ?? ''} ${row.parent_gv_id ?? ''}`);
}

function classifyChildImage(row) {
  const currentUrl = bestCurrentUrl(row, 'child') ?? bestCurrentUrl(row, 'parent');
  const currentQuality = classifyCurrentQuality(currentUrl);
  const exactRequired = childExactRequired(row);
  const childHasOwnImage = Boolean(bestCurrentUrl(row, 'child') || clean(row.child_image_path));

  if (exactRequired && !childHasOwnImage) {
    return {
      bucket: 'child_exact_required_using_parent_or_missing',
      image_quality_status: currentQuality,
      confidence: 'not_exact_enough',
      reason: 'Child printing is visually distinct and needs exact child imagery, not only parent representative quality.',
    };
  }

  if (childHasOwnImage && currentQuality === 'pokemon_tcg_small') {
    return {
      bucket: 'child_small_to_hires_candidate',
      image_quality_status: currentQuality,
      confidence: 'candidate_requires_exactness_review',
      reason: 'Child image is small; hires counterpart may exist but exact finish/variant authority must be preserved.',
    };
  }

  if (childHasOwnImage && currentQuality === 'tcgdex_non_high') {
    return {
      bucket: 'child_tcgdex_non_high_to_high_candidate',
      image_quality_status: currentQuality,
      confidence: 'candidate_requires_exactness_review',
      reason: 'Child image can be normalized to TCGdex high, but exact child provenance must be preserved.',
    };
  }

  return {
    bucket: childHasOwnImage ? 'child_has_image_no_quality_upgrade_candidate' : 'child_parent_display_ok_for_non_visual_finish',
    image_quality_status: currentQuality,
    confidence: exactRequired ? 'review_required' : 'acceptable_representative_quality_lane',
    reason: exactRequired
      ? 'Exactness requires review.'
      : 'Non-visual child printing can safely use representative parent imagery for display.',
  };
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function topRows(rows, limit = 250) {
  return rows.slice(0, limit).map((row) => ({
    parent_id: row.parent_id,
    child_id: row.child_id,
    gv_id: row.parent_gv_id,
    printing_gv_id: row.printing_gv_id,
    set_code: row.set_code,
    card_name: row.card_name,
    number: row.number,
    finish_key: row.finish_key,
    parent_bucket: row.parent_bucket,
    child_bucket: row.child_bucket,
    current_parent_url: row.current_parent_url,
    candidate_parent_url: row.candidate_parent_url,
    parent_confidence: row.parent_confidence,
    child_confidence: row.child_confidence,
    reason: row.parent_reason,
  }));
}

function uniqueBy(rows, keyFn) {
  const seen = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!seen.has(key)) {
      seen.set(key, row);
    }
  }
  return Array.from(seen.values());
}

async function main() {
  const dbUrl = requireDbUrl();
  if (!dbUrl) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const { rows } = await client.query(`
      select
        cp.id as parent_id,
        cp.gv_id as parent_gv_id,
        cp.name as card_name,
        cp.number,
        cp.number_plain,
        cp.set_code,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.identity_domain,
        cp.image_url as parent_image_url,
        cp.image_alt_url as parent_image_alt_url,
        cp.image_source as parent_image_source,
        cp.image_path as parent_image_path,
        cp.representative_image_url as parent_representative_image_url,
        cp.image_status as parent_image_status,
        cpr.id as child_id,
        cpr.printing_gv_id,
        cpr.finish_key,
        cpr.image_url as child_image_url,
        cpr.image_alt_url as child_image_alt_url,
        cpr.image_source as child_image_source,
        cpr.image_path as child_image_path,
        cpr.image_status as child_image_status
      from card_prints cp
      join card_printings cpr on cpr.card_print_id = cp.id
      where coalesce(cp.identity_domain, 'pokemon_eng_standard') = 'pokemon_eng_standard'
        and coalesce(cp.set_code, '') <> ''
      order by cp.set_code, cp.number_plain nulls last, cp.number, cp.name, cpr.finish_key
    `);

    const classified = rows.map((row) => {
      const parent = parentUpgrade(row);
      const child = classifyChildImage(row);
      return {
        ...row,
        parent_bucket: parent.bucket,
        current_parent_url: parent.current_url,
        candidate_parent_url: parent.candidate_url,
        candidate_parent_source: parent.candidate_source,
        parent_confidence: parent.confidence,
        parent_reason: parent.reason,
        child_bucket: child.bucket,
        child_image_quality_status: child.image_quality_status,
        child_confidence: child.confidence,
        child_reason: child.reason,
      };
    });

    const parentRows = uniqueBy(classified, (row) => row.parent_id);
    const upgradeCandidates = parentRows.filter((row) => row.candidate_parent_url);
    const deterministicNoProbeCandidates = upgradeCandidates.filter((row) =>
      row.parent_bucket === 'parent_small_to_pokemontcg_hires' ||
      row.parent_bucket === 'parent_tcgdex_non_high_to_tcgdex_high'
    );
    const probeRequiredCandidates = upgradeCandidates.filter((row) => row.parent_confidence === 'candidate_requires_head_probe');
    const childExactReviewRows = classified.filter((row) => row.child_bucket === 'child_exact_required_using_parent_or_missing');

    const report = {
      generated_at: new Date().toISOString(),
      mode: 'audit_only_no_db_writes',
      scope: 'english_physical_card_printings',
      totals: {
        child_printing_rows: classified.length,
        parent_rows: parentRows.length,
        parent_quality_upgrade_candidates: upgradeCandidates.length,
        deterministic_no_probe_candidates: deterministicNoProbeCandidates.length,
        probe_required_candidates: probeRequiredCandidates.length,
        child_exact_review_rows: childExactReviewRows.length,
      },
      parent_bucket_counts: countBy(parentRows, 'parent_bucket'),
      child_bucket_counts: countBy(classified, 'child_bucket'),
      parent_quality_counts: countBy(classified, 'parent_confidence'),
      child_confidence_counts: countBy(classified, 'child_confidence'),
      rules: [
        'High-quality representative image upgrades do not prove exact finish or stamp imagery.',
        'Visually distinct child printings remain exact-child-image work even if parent image quality improves.',
        'No parent image overwrite is authorized by this audit.',
        'No DB writes, image uploads, migrations, deletes, merges, or cleanup were performed.',
      ],
      top_parent_upgrade_candidates: topRows(upgradeCandidates, 500),
      top_child_exact_review_rows: topRows(childExactReviewRows, 500),
    };

    const queue = upgradeCandidates.map((row) => ({
      parent_id: row.parent_id,
      gv_id: row.parent_gv_id,
      set_code: row.set_code,
      card_name: row.card_name,
      number: row.number,
      current_parent_url: row.current_parent_url,
      candidate_parent_url: row.candidate_parent_url,
      candidate_parent_source: row.candidate_parent_source,
      bucket: row.parent_bucket,
      confidence: row.parent_confidence,
      required_next_step:
        row.parent_confidence === 'candidate_requires_head_probe'
          ? 'HEAD probe candidate URL, then dry-run parent representative image update package.'
          : 'Build dry-run parent representative image update package.',
    }));

    await fs.writeFile(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(QUEUE_JSON_OUT, `${JSON.stringify(queue, null, 2)}\n`);

    const md = [
      '# Image Truth Global Quality Upgrade Audit V1',
      '',
      `Generated: ${report.generated_at}`,
      '',
      'Mode: audit only. No DB writes. No image uploads. No migrations.',
      '',
      '## Summary',
      '',
      `- child printing rows audited: ${report.totals.child_printing_rows}`,
      `- parent/base high-quality upgrade candidates: ${report.totals.parent_quality_upgrade_candidates}`,
      `- deterministic no-probe candidates: ${report.totals.deterministic_no_probe_candidates}`,
      `- candidates requiring HEAD probe: ${report.totals.probe_required_candidates}`,
      `- visually distinct child rows still needing exact image review: ${report.totals.child_exact_review_rows}`,
      '',
      '## Parent Quality Buckets',
      '',
      '| bucket | rows |',
      '| --- | ---: |',
      ...Object.entries(report.parent_bucket_counts).map(([bucket, count]) => `| ${bucket} | ${count} |`),
      '',
      '## Child Exactness Buckets',
      '',
      '| bucket | rows |',
      '| --- | ---: |',
      ...Object.entries(report.child_bucket_counts).map(([bucket, count]) => `| ${bucket} | ${count} |`),
      '',
      '## Rules',
      '',
      ...report.rules.map((rule) => `- ${rule}`),
      '',
      '## Top Parent Upgrade Candidates',
      '',
      '| set | number | card | bucket | current | candidate |',
      '| --- | --- | --- | --- | --- | --- |',
      ...report.top_parent_upgrade_candidates.slice(0, 100).map((row) =>
        `| ${row.set_code ?? ''} | ${row.number ?? ''} | ${String(row.card_name ?? '').replaceAll('|', '\\|')} | ${row.parent_bucket} | ${row.current_parent_url ?? ''} | ${row.candidate_parent_url ?? ''} |`
      ),
      '',
      '## Important Distinction',
      '',
      'This report improves image quality candidates. It does not mark visually distinct finishes, stamps, or parallels as exact. Those still require exact child-printing image proof.',
      '',
    ].join('\n');

    const queueMd = [
      '# Image Truth High Quality Upgrade Queue V1',
      '',
      `Generated: ${report.generated_at}`,
      '',
      'Mode: audit only. This queue is not an apply plan.',
      '',
      '| set | number | card | bucket | confidence | next step |',
      '| --- | --- | --- | --- | --- | --- |',
      ...queue.slice(0, 500).map((row) =>
        `| ${row.set_code ?? ''} | ${row.number ?? ''} | ${String(row.card_name ?? '').replaceAll('|', '\\|')} | ${row.bucket} | ${row.confidence} | ${row.required_next_step} |`
      ),
      '',
    ].join('\n');

    await fs.writeFile(MD_OUT, `${md}\n`);
    await fs.writeFile(QUEUE_MD_OUT, `${queueMd}\n`);

    console.log(JSON.stringify({
      output: [JSON_OUT, MD_OUT, QUEUE_JSON_OUT, QUEUE_MD_OUT],
      totals: report.totals,
      parent_bucket_counts: report.parent_bucket_counts,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
