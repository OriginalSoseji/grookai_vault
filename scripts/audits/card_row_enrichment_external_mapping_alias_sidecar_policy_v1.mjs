import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const TRIAGE_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_duplicate_triage_v1.json';
const READINESS_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_duplicate_readiness_v1.json';
const OUTPUT_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_policy_v1.json';
const OUTPUT_MD = 'docs/audits/card_row_enrichment_v1/external_mapping_alias_sidecar_policy_v1.md';

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

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function splitExternalId(externalId) {
  const raw = String(externalId ?? '').trim();
  const match = raw.match(/^([A-Za-z0-9.]+)-(.+)$/);
  if (!match) return { setToken: null, numberToken: null, raw };
  return { setToken: match[1].toLowerCase(), numberToken: match[2].toLowerCase(), raw };
}

function isPokemonApiSuffixAlias(group) {
  if (group.source !== 'pokemonapi') return false;
  const parentNumber = normalizeNumber(group.number ?? group.number_plain);
  const tokens = group.external_ids.map((id) => normalizeNumber(splitExternalId(id).numberToken));
  return tokens.some((token) => token === parentNumber)
    && tokens.some((token) => token !== parentNumber && token.replace(/[a-z]+$/, '') === parentNumber.replace(/[a-z]+$/, ''));
}

function isTcgdexSuffixAlias(group) {
  if (group.source !== 'tcgdex') return false;
  const parentNumber = normalizeNumber(group.number ?? group.number_plain);
  const tokens = group.external_ids.map((id) => normalizeNumber(splitExternalId(id).numberToken));
  return tokens.some((token) => token === parentNumber) && tokens.some((token) => token !== parentNumber);
}

function isJustTcgProductAlias(group) {
  if (group.source !== 'justtcg') return false;
  return group.external_ids.some((id) => /battle-academy|prize-pack|miscellaneous-cards-products|nintendo-promos|prerelease|league|winner|stamped-promo/.test(id));
}

function isJustTcgTextAlias(group) {
  if (group.source !== 'justtcg') return false;
  const joined = group.external_ids.join('|');
  return /ghastly/.test(joined) && /gastly/.test(joined);
}

function isJustTcgSecretRareAlias(group) {
  if (group.source !== 'justtcg') return false;
  return group.external_ids.every((id) => /secret/.test(id))
    && group.external_ids.some((id) => /rainbow-rare/.test(id))
    && group.external_ids.some((id) => /secret-secret-rare/.test(id));
}

function classifySidecarPolicy(group) {
  if (group.identity_domain === 'tcg_pocket_excluded') {
    return {
      governance_class: 'pocket_alias_blocked',
      alias_kind: 'pocket_product_alias',
      recommended_action: 'defer_to_pocket_product_governance',
      sidecar_required_before_cleanup: true,
      reason: 'Pocket aliases are outside English physical canon and need Pocket-specific product governance.',
    };
  }
  if (isPokemonApiSuffixAlias(group)) {
    return {
      governance_class: 'suffix_alias_review',
      alias_kind: 'suffix_alias',
      recommended_action: 'adjudicate_source_owner_before_any_deactivation',
      sidecar_required_before_cleanup: true,
      reason: 'PokemonAPI suffix/base identifiers may reflect distinct printed identity or alternate source routing.',
    };
  }
  if (isTcgdexSuffixAlias(group)) {
    return {
      governance_class: 'suffix_alias_review',
      alias_kind: 'suffix_alias',
      recommended_action: 'adjudicate_source_owner_before_any_deactivation',
      sidecar_required_before_cleanup: true,
      reason: 'TCGdex suffix/base identifiers need exact owner policy before cleanup.',
    };
  }
  if (isJustTcgProductAlias(group)) {
    return {
      governance_class: 'preserve_until_sidecar',
      alias_kind: 'product_alias',
      recommended_action: 'preserve_in_product_alias_sidecar_before_deactivation',
      sidecar_required_before_cleanup: true,
      reason: 'JustTCG product, deck, prize-pack, prerelease, league, winner, or stamped slugs are useful product intelligence.',
    };
  }
  if (isJustTcgTextAlias(group)) {
    return {
      governance_class: 'text_alias_review',
      alias_kind: 'text_alias',
      recommended_action: 'confirm_source_slug_policy_before_deactivation',
      sidecar_required_before_cleanup: true,
      reason: 'Text or spelling aliases can be useful search/source recovery signals.',
    };
  }
  if (isJustTcgSecretRareAlias(group)) {
    return {
      governance_class: 'terminology_alias_review',
      alias_kind: 'terminology_alias',
      recommended_action: 'preserve_source_terminology_alias_before_deactivation',
      sidecar_required_before_cleanup: true,
      reason: 'Secret/rainbow rare duplicate slugs are source terminology aliases, not proven junk.',
    };
  }
  return {
    governance_class: 'manual_source_specific_review',
    alias_kind: 'manual_review_alias',
    recommended_action: 'manual_review_before_any_deactivation',
    sidecar_required_before_cleanup: true,
    reason: 'No deterministic source-specific policy matched.',
  };
}

function sampleRows(rows, limit = 25) {
  return rows.slice(0, limit).map((row) => ({
    source: row.source,
    set_code: row.set_code,
    card_name: row.card_name,
    number: row.number ?? row.number_plain,
    gv_id: row.gv_id,
    active_mapping_count: row.active_mapping_count,
    external_ids: row.external_ids,
    governance_class: row.governance_class,
    alias_kind: row.alias_kind,
    recommended_action: row.recommended_action,
    reason: row.reason,
  }));
}

async function main() {
  const triage = JSON.parse(await fs.readFile(TRIAGE_JSON, 'utf8'));
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));

  const groups = triage.groups.map((group) => ({
    ...group,
    ...classifySidecarPolicy(group),
  }));

  const report = {
    version: 'EXTERNAL_MAPPING_ALIAS_SIDECAR_POLICY_V1',
    generated_at: new Date().toISOString(),
    contract: 'docs/contracts/EXTERNAL_MAPPING_ALIAS_GOVERNANCE_CONTRACT_V1.md',
    source_reports: {
      triage: TRIAGE_JSON,
      readiness: READINESS_JSON,
    },
    scope: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      sidecar_created: false,
    },
    current_state: {
      duplicate_groups: groups.length,
      write_ready_groups: readiness.totals?.write_ready_groups ?? null,
      blocked_or_preserve_groups: readiness.totals?.blocked_or_preserve_groups ?? null,
      preflight_debt_name: 'external_mappings_source_card_duplicates',
    },
    by_governance_class: countBy(groups, (group) => group.governance_class),
    by_alias_kind: countBy(groups, (group) => group.alias_kind),
    by_source: countBy(groups, (group) => group.source),
    sidecar_policy: {
      canonical_external_mappings_role: 'one active canonical source ownership bridge per source/card owner unless a source contract explicitly permits more',
      alias_storage_role: 'store useful non-owner source identifiers, product/deck/prize-pack/stamp aliases, suffix/base aliases, and terminology aliases outside canonical ownership mappings',
      future_storage_shape: [
        'canonical_card_print_id',
        'canonical_external_mapping_id',
        'source',
        'alias_external_id',
        'alias_kind',
        'alias_status',
        'source_domain',
        'evidence_reason',
        'preserved_from_mapping_id',
        'created_from_audit',
        'active',
      ],
      allowed_cleanup_without_sidecar: ['formatting_duplicate_ready'],
      blocked_cleanup_until_sidecar: [
        'preserve_until_sidecar',
        'suffix_alias_review',
        'terminology_alias_review',
        'text_alias_review',
        'pocket_alias_blocked',
        'manual_source_specific_review',
      ],
    },
    samples_by_class: Object.fromEntries(
      Object.keys(countBy(groups, (group) => group.governance_class))
        .map((className) => [className, sampleRows(groups.filter((group) => group.governance_class === className), 10)]),
    ),
    recommended_next_step: 'design_source_alias_sidecar_schema_or_accept_this_as_deferred_preflight_debt',
  };

  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    current_state: report.current_state,
    by_governance_class: report.by_governance_class,
    by_alias_kind: report.by_alias_kind,
    by_source: report.by_source,
  }));

  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const classRows = Object.entries(report.by_governance_class).map(([governance_class, groupsCount]) => ({ governance_class, groupsCount }));
  const aliasRows = Object.entries(report.by_alias_kind).map(([alias_kind, groupsCount]) => ({ alias_kind, groupsCount }));
  const sourceRows = Object.entries(report.by_source).map(([source, groupsCount]) => ({ source, groupsCount }));

  const md = [
    '# External Mapping Alias Sidecar Policy V1',
    '',
    'Audit-only governance report for the remaining source-card duplicate `external_mappings` groups.',
    '',
    '## Safety',
    '',
    '- DB writes performed: false',
    '- Migrations created: false',
    '- Cleanup performed: false',
    '- Sidecar created: false',
    '',
    '## Current State',
    '',
    markdownTable(Object.entries(report.current_state).map(([metric, value]) => ({ metric, value })), [
      { label: 'metric', value: (row) => row.metric },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## Governance Classes',
    '',
    markdownTable(classRows, [
      { label: 'class', value: (row) => row.governance_class },
      { label: 'groups', value: (row) => row.groupsCount },
    ]),
    '',
    '## Alias Kinds',
    '',
    markdownTable(aliasRows, [
      { label: 'alias kind', value: (row) => row.alias_kind },
      { label: 'groups', value: (row) => row.groupsCount },
    ]),
    '',
    '## Sources',
    '',
    markdownTable(sourceRows, [
      { label: 'source', value: (row) => row.source },
      { label: 'groups', value: (row) => row.groupsCount },
    ]),
    '',
    '## Policy',
    '',
    '`external_mappings` is the canonical source ownership bridge. Product, deck, prize-pack, suffix/base, terminology, text, and Pocket aliases should move to a sidecar before any destructive cleanup.',
    '',
    'Allowed cleanup without sidecar:',
    '',
    report.sidecar_policy.allowed_cleanup_without_sidecar.map((item) => `- ${item}`).join('\n'),
    '',
    'Blocked cleanup until sidecar or explicit adjudication:',
    '',
    report.sidecar_policy.blocked_cleanup_until_sidecar.map((item) => `- ${item}`).join('\n'),
    '',
    '## Future Sidecar Shape',
    '',
    '```text',
    ...report.sidecar_policy.future_storage_shape,
    '```',
    '',
    '## Sample Groups',
    '',
    ...Object.entries(report.samples_by_class).flatMap(([className, rows]) => [
      `### ${className}`,
      '',
      markdownTable(rows, [
        { label: 'source', value: (row) => row.source },
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number },
        { label: 'name', value: (row) => row.card_name },
        { label: 'alias kind', value: (row) => row.alias_kind },
        { label: 'action', value: (row) => row.recommended_action },
      ]),
      '',
    ]),
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
    current_state: report.current_state,
    by_governance_class: report.by_governance_class,
    recommended_next_step: report.recommended_next_step,
  }, null, 2));
}

await main();
