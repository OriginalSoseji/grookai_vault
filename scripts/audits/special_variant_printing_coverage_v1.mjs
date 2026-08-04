import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const pg = require('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false, quiet: true });
}

const VERSION = 'SPECIAL_VARIANT_PRINTING_COVERAGE_V1';
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'special_variant_printing_coverage_v1');
const OUT_JSON = path.join(OUT_DIR, 'special_variant_printing_coverage_v1.json');
const OUT_MD = path.join(OUT_DIR, 'special_variant_printing_coverage_v1.md');
const AUTHORITATIVE_PRINTING_SOURCES = new Set(['tcgdex', 'pokemonapi']);

function getDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clean(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  return clean(value)?.toLowerCase().replace(/[_\s]+/g, '-') ?? '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function finishFromLabel(value) {
  const normalized = normalizeKey(value);
  if (['normal', 'regular', 'unlimited-normal'].includes(normalized)) return 'normal';
  if (['holo', 'holofoil', 'foil', '1st-edition-holofoil', 'unlimited-holofoil'].includes(normalized)) {
    return 'holo';
  }
  if (['reverse', 'reverse-holo', 'reverse-holofoil', 'reverseholofoil'].includes(normalized)) {
    return 'reverse';
  }
  if (['pokeball', 'poke-ball', 'poke-ball-pattern'].includes(normalized)) return 'pokeball';
  if (['masterball', 'master-ball', 'master-ball-pattern'].includes(normalized)) return 'masterball';
  return null;
}

function addObjectKeyEvidence(evidence, source, object, evidenceType) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return;
  for (const [key, value] of Object.entries(object)) {
    if (value === false || value === null || value === undefined) continue;
    const finishKey = finishFromLabel(key);
    if (finishKey) {
      evidence.push({ source, finish_key: finishKey, evidence_type: evidenceType, evidence_ref: key });
    }
  }
}

function extractFinishEvidence(source, payload) {
  const evidence = [];
  const card = payload?.card ?? payload?.data ?? payload;
  if (!card || typeof card !== 'object') return evidence;

  addObjectKeyEvidence(evidence, source, card?.variants, 'variant_flag');
  addObjectKeyEvidence(evidence, source, card?.pricing?.tcgplayer, 'pricing_key');
  addObjectKeyEvidence(evidence, source, card?.tcgplayer?.prices, 'pricing_key');

  const variants = Array.isArray(card?.variants) ? card.variants : [];
  for (const variant of variants) {
    const label = variant?.printing ?? variant?.finish ?? variant?.name ?? variant?.title;
    const finishKey = finishFromLabel(label);
    if (finishKey) {
      evidence.push({
        source,
        finish_key: finishKey,
        evidence_type: 'variant_printing_label',
        evidence_ref: clean(label),
      });
    }
  }

  return evidence;
}

function isAuthoritativeFinishEvidence(evidence) {
  return AUTHORITATIVE_PRINTING_SOURCES.has(normalizeKey(evidence?.source));
}

function classify(row, finishEvidence) {
  const children = Array.isArray(row.children) ? row.children : [];
  const publicChildren = children.filter((child) => child.public_visible === true);
  const publicChildrenWithIdentity = publicChildren.filter((child) => clean(child.printing_gv_id));

  if (publicChildren.length > 0 && publicChildrenWithIdentity.length === publicChildren.length) {
    return { status: 'governed_child_ready', repair_eligible: false };
  }
  if (publicChildren.length > 0) {
    return { status: 'public_child_identity_incomplete', repair_eligible: false };
  }
  if (children.length > 0) {
    return { status: 'child_quarantined_or_inactive', repair_eligible: false };
  }
  if (finishEvidence.some(isAuthoritativeFinishEvidence)) {
    return { status: 'missing_child_authoritative_finish_evidence_available', repair_eligible: true };
  }
  if (finishEvidence.length > 0) {
    return { status: 'missing_child_reference_finish_evidence_review_required', repair_eligible: false };
  }
  return { status: 'missing_child_no_source_finish_evidence', repair_eligible: false };
}

function countBy(rows, selector) {
  return Object.fromEntries(
    [...rows.reduce((map, row) => {
      const key = selector(row);
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function escapeCell(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function table(rows, columns, limit = 100) {
  if (rows.length === 0) return '_None._';
  const visible = rows.slice(0, limit);
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...visible.map((row) => `| ${columns.map((column) => escapeCell(column.value(row))).join(' | ')} |`),
    ...(rows.length > limit ? [`\n_${rows.length - limit} additional rows are preserved in the JSON artifact._`] : []),
  ].join('\n');
}

async function loadRows(client) {
  const result = await client.query(`
    with special_parents as (
      select
        cp.id,
        cp.gv_id,
        cp.name,
        cp.number,
        cp.set_code,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_status
      from public.card_prints cp
      where cp.gv_id like 'GV-PK-%'
        and cp.gv_id not like 'GV-PK-JPN-%'
        and coalesce(nullif(btrim(cp.variant_key), ''), 'base') <> 'base'
    ),
    children as (
      select
        cpr.card_print_id,
        jsonb_agg(
          jsonb_build_object(
            'card_printing_id', cpr.id,
            'printing_gv_id', cpr.printing_gv_id,
            'finish_key', cpr.finish_key,
            'finish_active', coalesce(fk.is_active, false),
            'is_provisional', cpr.is_provisional,
            'provenance_source', cpr.provenance_source,
            'provenance_ref', cpr.provenance_ref,
            'image_status', cpr.image_status,
            'active_truth_review', review.review_status,
            'public_visibility', review.public_visibility,
            'public_visible', coalesce(fk.is_active, false)
              and coalesce(review.public_visibility, '') not in ('hidden_pending_review', 'hidden_unsupported')
          ) order by cpr.finish_key, cpr.printing_gv_id nulls last, cpr.id
        ) as children
      from public.card_printings cpr
      left join public.finish_keys fk on fk.key = cpr.finish_key
      left join lateral (
        select ctr.review_status, ctr.public_visibility
        from public.card_printing_truth_reviews ctr
        where ctr.card_printing_id = cpr.id and ctr.active = true
        order by ctr.created_at desc nulls last, ctr.id desc
        limit 1
      ) review on true
      where cpr.card_print_id in (select id from special_parents)
      group by cpr.card_print_id
    ),
    parent_mappings as (
      select
        em.card_print_id,
        jsonb_agg(jsonb_build_object('source', em.source, 'external_id', em.external_id)
          order by em.source, em.external_id) as mappings
      from public.external_mappings em
      where em.active = true
        and em.card_print_id in (select id from special_parents)
      group by em.card_print_id
    ),
    source_payloads as (
      select
        em.card_print_id,
        jsonb_object_agg(em.source, ri.payload) as payloads
      from public.external_mappings em
      join public.raw_imports ri
        on ri.source = em.source
       and ri.payload->>'_kind' = 'card'
       and ri.payload->>'_external_id' = em.external_id
      where em.active = true
        and em.source in ('tcgdex', 'pokemonapi', 'justtcg')
        and em.card_print_id in (select id from special_parents)
      group by em.card_print_id
    )
    select
      sp.*,
      coalesce(children.children, '[]'::jsonb) as children,
      coalesce(parent_mappings.mappings, '[]'::jsonb) as parent_mappings,
      coalesce(source_payloads.payloads, '{}'::jsonb) as source_payloads
    from special_parents sp
    left join children on children.card_print_id = sp.id
    left join parent_mappings on parent_mappings.card_print_id = sp.id
    left join source_payloads on source_payloads.card_print_id = sp.id
    order by sp.set_code, sp.number, sp.name, sp.variant_key, sp.gv_id
  `);
  return result.rows;
}

async function main() {
  const dbUrl = getDbUrl();
  if (!dbUrl) throw new Error('Missing database URL for read-only printing coverage audit.');

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  let sourceRows;
  try {
    await client.query('begin read only');
    sourceRows = await loadRows(client);
    await client.query('rollback');
  } finally {
    await client.end();
  }

  const rows = sourceRows.map((row) => {
    const finishEvidence = unique(
      Object.entries(row.source_payloads ?? {}).flatMap(([source, payload]) =>
        extractFinishEvidence(source, payload).map((item) => JSON.stringify(item)),
      ),
    ).map((item) => JSON.parse(item));
    const classification = classify(row, finishEvidence);
    const authoritativeFinishEvidence = finishEvidence.filter(isAuthoritativeFinishEvidence);
    const children = Array.isArray(row.children) ? row.children : [];
    const publicChildren = children.filter((child) => child.public_visible === true);

    return {
      card_print_id: row.id,
      gv_id: row.gv_id,
      name: row.name,
      number: row.number,
      set_code: row.set_code,
      variant_key: row.variant_key,
      printed_identity_modifier: row.printed_identity_modifier,
      image_status: row.image_status,
      status: classification.status,
      repair_eligible: classification.repair_eligible,
      child_count: children.length,
      public_child_count: publicChildren.length,
      children,
      parent_mappings: row.parent_mappings ?? [],
      source_finish_evidence: finishEvidence,
      authoritative_finish_evidence: authoritativeFinishEvidence,
      evidence_backed_candidate_finishes: unique(
        authoritativeFinishEvidence.map((item) => item.finish_key),
      ),
      reference_only_candidate_finishes: unique(
        finishEvidence
          .filter((item) => !isAuthoritativeFinishEvidence(item))
          .map((item) => item.finish_key),
      ),
    };
  });

  const target = rows.find((row) => row.gv_id === 'GV-PK-SSP-057-PLAY-POKEMON-STAMP') ?? null;
  const reportBase = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    mode: 'read_only',
    db_writes_performed: false,
    canonical_rows_changed: 0,
    child_rows_changed: 0,
    authority_rule: 'Missing child printings are repair candidates only when an approved printing authority exposes a bounded finish. JustTCG-only finish labels remain review evidence and never authorize a child write.',
    summary: {
      special_variant_parents: rows.length,
      by_status: countBy(rows, (row) => row.status),
      parents_with_public_children: rows.filter((row) => row.public_child_count > 0).length,
      parents_without_children: rows.filter((row) => row.child_count === 0).length,
      evidence_backed_repair_candidates: rows.filter((row) => row.repair_eligible).length,
      target_pikachu_status: target?.status ?? 'not_found',
    },
    target_pikachu: target,
    rows,
  };
  const fingerprint = sha256(JSON.stringify(reportBase.rows));
  const report = { ...reportBase, fingerprint_sha256: fingerprint };

  const followUpRows = rows.filter((row) => row.status !== 'governed_child_ready');
  const markdown = [
    '# Special Variant Printing Coverage V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    '- Mode: read-only',
    '- Database writes: none',
    '- Canonical or child rows changed: none',
    `- Special-variant parents: ${report.summary.special_variant_parents}`,
    `- Parents with public governed children: ${report.summary.parents_with_public_children}`,
    `- Parents without any child: ${report.summary.parents_without_children}`,
    `- Authoritative repair candidates: ${report.summary.evidence_backed_repair_candidates}`,
    `- Fingerprint: \`${fingerprint}\``,
    '',
    '## Status Distribution',
    '',
    ...Object.entries(report.summary.by_status).map(([status, count]) => `- ${status}: ${count}`),
    '',
    '## Pikachu Search Fixture',
    '',
    target
      ? `- \`${target.gv_id}\`: ${target.status}; children=${target.child_count}; public=${target.public_child_count}; source-backed finishes=${target.evidence_backed_candidate_finishes.join(', ') || 'none'}`
      : '- Target not found.',
    '',
    '## Follow-Up Sample',
    '',
    table(followUpRows, [
      { label: 'GV ID', value: (row) => row.gv_id },
      { label: 'Card', value: (row) => `${row.name} ${row.number}` },
      { label: 'Variant', value: (row) => row.variant_key },
      { label: 'Status', value: (row) => row.status },
      { label: 'Evidence finishes', value: (row) => row.evidence_backed_candidate_finishes.join(', ') },
    ]),
    '',
    '## Governed Repair Workflow',
    '',
    '1. Keep canonical parent identity unchanged.',
    '2. Require exact active parent mapping plus stored finish evidence from an approved printing authority.',
    '3. Treat JustTCG-only finish labels as discovery/review evidence; they never authorize a child write.',
    '4. Produce a bounded candidate plan; never infer a finish from a variant label or image alone.',
    '5. Run the existing printing upsert gate in rollback mode and verify parent, finish, printing GV-ID, provenance, and collision checks.',
    '6. Apply only an explicitly approved evidence-backed plan.',
    '7. Read back the child and the public printing-options RPC, then smoke-test selection on web and mobile.',
    '8. Leave no-evidence and reference-only rows quarantined as coverage gaps.',
  ].join('\n');

  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(OUT_MD, `${markdown}\n`),
  ]);

  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
