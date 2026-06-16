import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const TRIAGE_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_duplicate_triage_v1.json';
const POLICY_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_policy_v1.json';
const OUTPUT_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_readiness_v1.json';
const OUTPUT_MD = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_readiness_v1.md';

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

function isProductAliasExternalId(externalId) {
  return /battle-academy|prize-pack|miscellaneous-cards-products|nintendo-promos|prerelease|league|winner|stamped-promo/.test(String(externalId ?? ''));
}

function detectProductAliasKind(externalId) {
  const id = String(externalId ?? '');
  if (/battle-academy/.test(id)) return 'battle_academy_alias';
  if (/prize-pack/.test(id)) return 'prize_pack_alias';
  if (/prerelease/.test(id)) return 'prerelease_alias';
  if (/league/.test(id)) return 'league_alias';
  if (/winner/.test(id)) return 'winner_alias';
  if (/stamped-promo/.test(id)) return 'product_stamp_alias';
  if (/nintendo-promos|miscellaneous-cards-products/.test(id)) return 'product_alias';
  return 'product_alias';
}

function classifyGroup(group) {
  if (group.identity_domain === 'tcg_pocket_excluded') {
    return {
      sidecar_readiness: 'blocked_pocket_domain',
      reason: 'Pocket product aliases require Pocket-specific sidecar governance.',
    };
  }
  if (group.source !== 'justtcg') {
    return {
      sidecar_readiness: 'blocked_source_owner_policy_needed',
      reason: 'This source requires source-specific suffix/terminology owner policy before sidecar projection.',
    };
  }
  const productAliases = group.external_ids.filter(isProductAliasExternalId);
  if (productAliases.length === 0) {
    return {
      sidecar_readiness: 'blocked_not_product_alias',
      reason: 'No deterministic product alias marker found.',
    };
  }
  const canonicalCandidates = group.external_ids.filter((id) => !isProductAliasExternalId(id));
  if (canonicalCandidates.length !== 1) {
    return {
      sidecar_readiness: 'blocked_canonical_source_id_not_unique',
      reason: `Expected exactly one non-product canonical source id; found ${canonicalCandidates.length}.`,
    };
  }
  return {
    sidecar_readiness: 'sidecar_ready_product_alias',
    reason: 'Exactly one non-product source id can remain the canonical active mapping while product aliases are preserved in sidecar.',
    canonical_external_id_to_keep: canonicalCandidates[0],
  };
}

function buildAliasRowsForGroup(group, classification) {
  if (classification.sidecar_readiness !== 'sidecar_ready_product_alias') return [];
  return group.external_ids
    .map((externalId, index) => ({
      source: group.source,
      canonical_card_print_id: group.card_print_id,
      canonical_gv_id: group.gv_id,
      set_code: group.set_code,
      card_name: group.card_name,
      card_number: group.number ?? group.number_plain,
      canonical_external_id_to_keep: classification.canonical_external_id_to_keep,
      alias_external_id: externalId,
      preserved_from_mapping_id: group.mapping_ids?.[index] ?? null,
      alias_kind: detectProductAliasKind(externalId),
      alias_status: 'sidecar_ready_preserve_before_deactivation',
      source_domain: group.identity_domain,
      evidence_reason: classification.reason,
      created_from_audit: 'external_mapping_alias_sidecar_readiness_v1',
    }))
    .filter((row) => row.alias_external_id !== classification.canonical_external_id_to_keep);
}

async function main() {
  const triage = JSON.parse(await fs.readFile(TRIAGE_JSON, 'utf8'));
  const policy = JSON.parse(await fs.readFile(POLICY_JSON, 'utf8'));

  const groupReadiness = triage.groups.map((group) => {
    const classification = classifyGroup(group);
    const aliasRows = buildAliasRowsForGroup(group, classification);
    return {
      source: group.source,
      card_print_id: group.card_print_id,
      gv_id: group.gv_id,
      set_code: group.set_code,
      set_name: group.set_name,
      card_name: group.card_name,
      number: group.number ?? group.number_plain,
      active_mapping_count: group.active_mapping_count,
      external_ids: group.external_ids,
      mapping_ids: group.mapping_ids,
      ...classification,
      projected_alias_row_count: aliasRows.length,
    };
  });

  const projectedAliasRows = groupReadiness.flatMap((group) => {
    const original = triage.groups.find((candidate) => candidate.card_print_id === group.card_print_id && candidate.source === group.source);
    return buildAliasRowsForGroup(original, group);
  });

  const readyGroups = groupReadiness.filter((group) => group.sidecar_readiness === 'sidecar_ready_product_alias');
  const blockedGroups = groupReadiness.filter((group) => group.sidecar_readiness !== 'sidecar_ready_product_alias');

  const report = {
    version: 'EXTERNAL_MAPPING_ALIAS_SIDECAR_READINESS_V1',
    generated_at: new Date().toISOString(),
    contract: policy.contract,
    source_reports: {
      triage: TRIAGE_JSON,
      policy: POLICY_JSON,
    },
    scope: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      sidecar_created: false,
    },
    totals: {
      duplicate_groups: groupReadiness.length,
      sidecar_ready_groups: readyGroups.length,
      blocked_groups: blockedGroups.length,
      projected_sidecar_alias_rows: projectedAliasRows.length,
      projected_canonical_mapping_deactivations_after_sidecar: projectedAliasRows.length,
    },
    by_sidecar_readiness: countBy(groupReadiness, (group) => group.sidecar_readiness),
    by_alias_kind: countBy(projectedAliasRows, (row) => row.alias_kind),
    by_source: countBy(groupReadiness, (group) => group.source),
    ready_group_samples: readyGroups.slice(0, 50),
    blocked_group_samples: blockedGroups.slice(0, 50),
    projected_alias_rows: projectedAliasRows,
    guardrails: [
      'Do not create schema in this pass.',
      'Do not deactivate external_mappings until projected alias rows are preserved.',
      'Do not project suffix/base aliases without source-specific owner policy.',
      'Do not project Pocket aliases into English physical sidecar.',
      'Do not treat product aliases as canonical card identity.',
    ],
    recommended_next_step: projectedAliasRows.length > 0
      ? 'prepare_no-write_sidecar_schema_migration_plan_and_guarded_dry_run_for_product_alias_preservation'
      : 'keep_remaining_duplicate_mapping_debt_deferred_until_source_specific_adjudication',
  };

  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    totals: report.totals,
    by_sidecar_readiness: report.by_sidecar_readiness,
    by_alias_kind: report.by_alias_kind,
  }));

  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    '# External Mapping Alias Sidecar Readiness V1',
    '',
    'Audit-only projection for preserving useful source aliases before any future external mapping deactivation.',
    '',
    '## Safety',
    '',
    '- DB writes performed: false',
    '- Migrations created: false',
    '- Cleanup performed: false',
    '- Sidecar created: false',
    '',
    '## Totals',
    '',
    markdownTable(Object.entries(report.totals).map(([metric, value]) => ({ metric, value })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Sidecar Readiness',
    '',
    markdownTable(Object.entries(report.by_sidecar_readiness).map(([readiness, groups]) => ({ readiness, groups })), [
      { label: 'readiness', value: (row) => row.readiness },
      { label: 'groups', value: (row) => row.groups },
    ]),
    '',
    '## Projected Alias Kinds',
    '',
    markdownTable(Object.entries(report.by_alias_kind).map(([aliasKind, rows]) => ({ aliasKind, rows })), [
      { label: 'alias kind', value: (row) => row.aliasKind },
      { label: 'projected rows', value: (row) => row.rows },
    ]),
    '',
    '## Ready Group Samples',
    '',
    markdownTable(readyGroups.slice(0, 50), [
      { label: 'source', value: (row) => row.source },
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number },
      { label: 'name', value: (row) => row.card_name },
      { label: 'keep active', value: (row) => row.canonical_external_id_to_keep },
      { label: 'alias rows', value: (row) => row.projected_alias_row_count },
    ]),
    '',
    '## Blocked Group Samples',
    '',
    markdownTable(blockedGroups.slice(0, 50), [
      { label: 'source', value: (row) => row.source },
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number },
      { label: 'name', value: (row) => row.card_name },
      { label: 'readiness', value: (row) => row.sidecar_readiness },
      { label: 'reason', value: (row) => row.reason },
    ]),
    '',
    '## Guardrails',
    '',
    ...report.guardrails.map((guardrail) => `- ${guardrail}`),
    '',
    `Recommended next step: \`${report.recommended_next_step}\``,
    '',
    `Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
  ].join('\n');
  await fs.writeFile(OUTPUT_MD, md);

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    fingerprint_sha256: report.fingerprint_sha256,
    totals: report.totals,
    by_sidecar_readiness: report.by_sidecar_readiness,
    by_alias_kind: report.by_alias_kind,
    recommended_next_step: report.recommended_next_step,
  }, null, 2));
}

await main();
