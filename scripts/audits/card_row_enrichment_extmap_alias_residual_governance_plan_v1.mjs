import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/card_row_enrichment_v1';
const TRIAGE_JSON = path.join(OUTPUT_DIR, 'external_mapping_duplicate_triage_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'external_mapping_alias_residual_governance_plan_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'external_mapping_alias_residual_governance_plan_v1.md');

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function trailingSourceNumber(source, externalId) {
  if (source === 'pokemonapi' || source === 'tcgdex') {
    const match = String(externalId).match(/-([a-z]*\d+[a-z]?\d?)$/i);
    return match?.[1]?.toLowerCase() ?? null;
  }
  return null;
}

function classifyJusttcg(group) {
  const ids = group.external_ids.map((value) => String(value).toLowerCase());
  if (group.identity_domain === 'tcg_pocket_excluded') {
    return {
      proposed_rule: 'blocked_pocket_alias_governance',
      proposed_alias_kind: 'pocket_product_alias',
      actionability: 'blocked',
      reason: 'Pocket product aliases must be handled under Pocket-specific governance, not English physical source cleanup.',
    };
  }
  if (ids.every((id) => id.includes('secret-rainbow-rare') || id.includes('secret-secret-rare'))) {
    const keep = group.external_ids.find((id) => String(id).toLowerCase().includes('secret-rainbow-rare'));
    return {
      proposed_rule: 'justtcg_secret_rare_terminology_alias',
      proposed_alias_kind: 'terminology_alias',
      actionability: keep ? 'candidate_after_sidecar_dry_run' : 'blocked',
      reason: keep
        ? 'Rows differ by JustTCG rare terminology only; keep the more specific secret-rainbow-rare route and preserve secret-secret-rare as terminology alias.'
        : 'Rows differ by JustTCG rare terminology but no secret-rainbow-rare canonical route was found.',
      exact_external_id_to_keep: keep ? [keep] : [],
      alias_external_ids: keep ? group.external_ids.filter((id) => id !== keep) : [],
    };
  }
  if (ids.some((id) => id.includes('ghastly')) && ids.some((id) => id.includes('gastly'))) {
    const keep = group.external_ids.find((id) => String(id).toLowerCase().includes('gastly') && !String(id).toLowerCase().includes('ghastly'));
    return {
      proposed_rule: 'justtcg_text_spelling_alias',
      proposed_alias_kind: 'text_alias',
      actionability: keep ? 'candidate_after_sidecar_dry_run' : 'blocked',
      reason: keep
        ? 'Rows differ by source spelling alias for Gastly/Ghastly; keep the source route matching the printed card name.'
        : 'Rows differ by source spelling alias for Gastly/Ghastly but no printed-name matching route was found.',
      exact_external_id_to_keep: keep ? [keep] : [],
      alias_external_ids: keep ? group.external_ids.filter((id) => id !== keep) : [],
    };
  }
  if (ids.some((id) => id.includes('prize-pack') || id.includes('battle-academy') || id.includes('prerelease') || id.includes('league'))) {
    return {
      proposed_rule: 'justtcg_remaining_product_alias',
      proposed_alias_kind: 'product_alias',
      actionability: 'blocked',
      reason: 'All active JustTCG routes in this residual group are product/deck/prize/stamp aliases; no canonical non-product owner route exists to preserve aliases against.',
    };
  }
  return {
    proposed_rule: 'manual_source_specific_review',
    proposed_alias_kind: 'manual_review_alias',
    actionability: 'blocked',
    reason: 'No deterministic JustTCG residual rule matched.',
  };
}

async function loadSuffixOwnerFacts(client, group) {
  if (group.source !== 'pokemonapi' && group.source !== 'tcgdex') return [];
  const sourceNumbers = group.external_ids.map((externalId) => ({
    external_id: externalId,
    source_number: trailingSourceNumber(group.source, externalId),
  }));
  const result = await client.query(
    `with source_numbers as (
       select *
       from jsonb_to_recordset($1::jsonb) as s(external_id text, source_number text)
     )
     select
       s.external_id,
       s.source_number,
       cp.id::text as owner_card_print_id,
       cp.gv_id as owner_gv_id,
       cp.set_code,
       cp.number,
       cp.name,
       cp.identity_domain
     from source_numbers s
     left join public.card_prints cp
       on lower(cp.set_code) = lower($2)
      and lower(cp.number) = lower(s.source_number)
      and coalesce(cp.identity_domain, '') = coalesce($3, '')
     order by s.external_id, cp.gv_id nulls last`,
    [JSON.stringify(sourceNumbers), group.set_code, group.identity_domain],
  );
  return result.rows;
}

function classifySuffixGroup(group, ownerFacts) {
  const number = String(group.number).toLowerCase();
  const ids = group.external_ids.map((externalId) => ({
    external_id: externalId,
    source_number: trailingSourceNumber(group.source, externalId),
  }));
  const exact = ids.filter((row) => row.source_number === number);
  const nonExact = ids.filter((row) => row.source_number !== number);
  const nonExactWithOtherOwner = nonExact.filter((row) => ownerFacts.some((fact) => fact.external_id === row.external_id && fact.owner_card_print_id && fact.owner_card_print_id !== group.card_print_id));
  const nonExactWithoutOtherOwner = nonExact.filter((row) => !ownerFacts.some((fact) => fact.external_id === row.external_id && fact.owner_card_print_id && fact.owner_card_print_id !== group.card_print_id));

  if (exact.length !== 1) {
    return {
      proposed_rule: `${group.source}_suffix_alias_manual_review`,
      proposed_alias_kind: 'suffix_alias',
      actionability: 'blocked',
      reason: `Expected exactly one source ID matching printed number ${group.number}; found ${exact.length}.`,
      exact_external_id_to_keep: exact.map((row) => row.external_id),
      alias_external_ids: nonExact.map((row) => row.external_id),
    };
  }

  if (nonExactWithOtherOwner.length > 0) {
    return {
      proposed_rule: `${group.source}_suffix_owner_transfer_required`,
      proposed_alias_kind: 'suffix_alias',
      actionability: 'blocked_pending_owner_transfer_design',
      reason: 'One or more non-matching suffix IDs appears to have a different same-set owner and needs transfer/deactivation design, not alias-only cleanup.',
      exact_external_id_to_keep: [exact[0].external_id],
      alias_external_ids: nonExactWithoutOtherOwner.map((row) => row.external_id),
      transfer_candidate_external_ids: nonExactWithOtherOwner.map((row) => row.external_id),
    };
  }

  return {
    proposed_rule: `${group.source}_suffix_alias_preservation`,
    proposed_alias_kind: 'suffix_alias',
    actionability: 'candidate_after_sidecar_dry_run',
    reason: `Exactly one ${group.source} ID matches printed number ${group.number}; non-matching source IDs can be preserved as suffix/base aliases before deactivation.`,
    exact_external_id_to_keep: [exact[0].external_id],
    alias_external_ids: nonExact.map((row) => row.external_id),
  };
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for residual governance audit.');

  const triage = JSON.parse(await fs.readFile(TRIAGE_JSON, 'utf8'));
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const groups = [];
    for (const group of triage.groups) {
      const ownerFacts = await loadSuffixOwnerFacts(client, group);
      const classification = group.source === 'justtcg'
        ? classifyJusttcg(group)
        : classifySuffixGroup(group, ownerFacts);
      groups.push({
        ...group,
        owner_facts: ownerFacts,
        ...classification,
      });
    }

    const candidateGroups = groups.filter((group) => group.actionability === 'candidate_after_sidecar_dry_run');
    const blockedGroups = groups.filter((group) => group.actionability !== 'candidate_after_sidecar_dry_run');
    const report = {
      version: 'EXTERNAL_MAPPING_ALIAS_RESIDUAL_GOVERNANCE_PLAN_V1',
      generated_at: new Date().toISOString(),
      scope: {
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        groups_reviewed: groups.length,
      },
      totals: {
        residual_duplicate_groups: groups.length,
        deterministic_candidate_groups: candidateGroups.length,
        blocked_groups: blockedGroups.length,
        projected_alias_rows_before_deactivation: candidateGroups.reduce((sum, group) => sum + (group.alias_external_ids?.length ?? 0), 0),
        projected_transfer_design_rows: groups.reduce((sum, group) => sum + (group.transfer_candidate_external_ids?.length ?? 0), 0),
      },
      by_actionability: countBy(groups, (group) => group.actionability),
      by_proposed_rule: countBy(groups, (group) => group.proposed_rule),
      by_source: countBy(groups, (group) => group.source),
      candidate_groups: candidateGroups,
      blocked_groups: blockedGroups,
      recommended_next_step: candidateGroups.length > 0
        ? 'Build a guarded sidecar-preservation dry-run for deterministic residual alias candidates; keep owner-transfer and Pocket groups blocked.'
        : 'No deterministic residual candidates remain; source-specific manual adjudication is required.',
      fingerprint_sha256: sha256(stableJson(groups)),
    };

    await writeJson(OUTPUT_JSON, report);

    const md = [
      '# External Mapping Alias Residual Governance Plan V1',
      '',
      'Audit-only residual governance plan after the product alias sidecar lane.',
      '',
      '## Safety',
      '',
      '- DB writes performed: false',
      '- Migrations created: false',
      '- Cleanup performed: false',
      '',
      '## Totals',
      '',
      markdownTable(Object.entries(report.totals).map(([metric, value]) => ({ metric, value })), [
        { label: 'metric', value: (row) => row.metric },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## By Actionability',
      '',
      markdownTable(Object.entries(report.by_actionability).map(([actionability, groups]) => ({ actionability, groups })), [
        { label: 'actionability', value: (row) => row.actionability },
        { label: 'groups', value: (row) => row.groups },
      ]),
      '',
      '## By Proposed Rule',
      '',
      markdownTable(Object.entries(report.by_proposed_rule).map(([rule, groups]) => ({ rule, groups })), [
        { label: 'rule', value: (row) => row.rule },
        { label: 'groups', value: (row) => row.groups },
      ]),
      '',
      '## Candidate Groups',
      '',
      markdownTable(candidateGroups.slice(0, 80), [
        { label: 'source', value: (row) => row.source },
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number },
        { label: 'name', value: (row) => row.card_name },
        { label: 'rule', value: (row) => row.proposed_rule },
        { label: 'keep', value: (row) => (row.exact_external_id_to_keep ?? []).join(', ') },
        { label: 'aliases', value: (row) => (row.alias_external_ids ?? []).join(', ') },
      ]),
      '',
      '## Blocked Groups',
      '',
      markdownTable(blockedGroups.slice(0, 80), [
        { label: 'source', value: (row) => row.source },
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number },
        { label: 'name', value: (row) => row.card_name },
        { label: 'actionability', value: (row) => row.actionability },
        { label: 'reason', value: (row) => row.reason },
      ]),
      '',
      '## Recommended Next Step',
      '',
      report.recommended_next_step,
      '',
      `Fingerprint: \`${report.fingerprint_sha256}\``,
      '',
    ].join('\n');

    await writeText(OUTPUT_MD, md);
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      totals: report.totals,
      by_actionability: report.by_actionability,
      fingerprint_sha256: report.fingerprint_sha256,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
