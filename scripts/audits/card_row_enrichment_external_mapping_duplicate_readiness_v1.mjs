import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const INPUT_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_duplicate_triage_v1.json';
const OUTPUT_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_duplicate_readiness_v1.json';
const OUTPUT_MD = 'docs/audits/card_row_enrichment_v1/external_mapping_duplicate_readiness_v1.md';

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
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^0+(?=\d)/, '');
}

function splitExternalId(externalId) {
  const raw = String(externalId ?? '').trim();
  const match = raw.match(/^([A-Za-z0-9.]+)-(.+)$/);
  if (!match) return { setToken: null, numberToken: null, raw };
  return { setToken: match[1].toLowerCase(), numberToken: match[2].toLowerCase(), raw };
}

function isPokemonApiZeroPaddingAlias(group) {
  if (group.source !== 'pokemonapi') return false;
  const tokens = group.external_ids.map((id) => splitExternalId(id).numberToken);
  const normalizedTokens = new Set(tokens.map(normalizeNumber));
  return normalizedTokens.size === 1 && tokens.length > 1;
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
  return tokens.some((token) => token === parentNumber)
    && tokens.some((token) => token !== parentNumber);
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

function classifyReadiness(group) {
  if (group.identity_domain === 'tcg_pocket_excluded') {
    return {
      readiness_class: 'pocket_product_alias_blocked',
      write_ready: false,
      reason: 'Pocket is excluded from physical canon; handle only under Pocket/product governance.',
    };
  }
  if (isPokemonApiZeroPaddingAlias(group)) {
    return {
      readiness_class: 'pokemonapi_zero_padding_alias_ready',
      write_ready: true,
      reason: 'External IDs differ only by leading-zero number formatting.',
    };
  }
  if (isPokemonApiSuffixAlias(group)) {
    return {
      readiness_class: 'pokemonapi_suffix_alias_review',
      write_ready: false,
      reason: 'External IDs differ by suffix/base number and may represent distinct printed identities.',
    };
  }
  if (isTcgdexSuffixAlias(group)) {
    return {
      readiness_class: 'tcgdex_suffix_alias_review',
      write_ready: false,
      reason: 'TCGdex suffix/base aliases require exact owner policy before deactivation.',
    };
  }
  if (isJustTcgProductAlias(group)) {
    return {
      readiness_class: 'justtcg_product_alias_preserve_until_sidecar',
      write_ready: false,
      reason: 'JustTCG product/deck/prize-pack aliases may be useful product intelligence; preserve until sidecar/alias table exists.',
    };
  }
  if (isJustTcgTextAlias(group)) {
    return {
      readiness_class: 'justtcg_text_alias_review',
      write_ready: false,
      reason: 'Looks like a spelling/text alias; choose canonical slug only after source-specific confirmation.',
    };
  }
  if (isJustTcgSecretRareAlias(group)) {
    return {
      readiness_class: 'justtcg_secret_rare_synonym_review',
      write_ready: false,
      reason: 'Looks like source terminology duplication for secret/rainbow rare; preserve until canonical JustTCG slug policy exists.',
    };
  }
  return {
    readiness_class: 'manual_source_specific_review',
    write_ready: false,
    reason: 'No deterministic source-specific rule matched.',
  };
}

async function main() {
  const triage = JSON.parse(await fs.readFile(INPUT_JSON, 'utf8'));
  const groups = triage.groups.map((group) => ({
    ...group,
    ...classifyReadiness(group),
  }));
  const readyGroups = groups.filter((group) => group.write_ready);
  const blockedGroups = groups.filter((group) => !group.write_ready);
  const report = {
    version: 'EXTERNAL_MAPPING_DUPLICATE_READINESS_V1',
    generated_at: new Date().toISOString(),
    source_report: INPUT_JSON,
    scope: {
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
    },
    principle: 'Do not deactivate product aliases or suffix/base aliases until the source-specific owner policy is explicit.',
    totals: {
      duplicate_groups: groups.length,
      write_ready_groups: readyGroups.length,
      blocked_or_preserve_groups: blockedGroups.length,
      ready_mapping_rows_in_groups: readyGroups.reduce((sum, group) => sum + group.active_mapping_count, 0),
    },
    by_readiness_class: countBy(groups, (group) => group.readiness_class),
    by_source: countBy(groups, (group) => group.source),
    ready_groups: readyGroups,
    blocked_group_samples: blockedGroups.slice(0, 100),
    recommended_next_step: readyGroups.length > 0
      ? 'prepare_guarded_dry_run_for_pokemonapi_zero_padding_alias_deactivation_only'
      : 'create_product_alias_sidecar_policy_before_deactivation',
  };
  report.fingerprint_sha256 = sha256(stableJson({
    version: report.version,
    totals: report.totals,
    by_readiness_class: report.by_readiness_class,
  }));

  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    '# External Mapping Duplicate Readiness V1',
    '',
    'Audit-only readiness plan for the `external_mappings_source_card_duplicates` debt.',
    '',
    '## Safety',
    '',
    '- DB writes performed: false',
    '- Migrations created: false',
    '- Cleanup performed: false',
    '',
    '## Principle',
    '',
    report.principle,
    '',
    '## Totals',
    '',
    markdownTable(Object.entries(report.totals).map(([key, value]) => ({ key, value })), [
      { label: 'metric', value: (row) => row.key },
      { label: 'value', value: (row) => row.value },
    ]),
    '',
    '## By Readiness Class',
    '',
    markdownTable(Object.entries(report.by_readiness_class).map(([readiness_class, groups]) => ({ readiness_class, groups })), [
      { label: 'readiness class', value: (row) => row.readiness_class },
      { label: 'groups', value: (row) => row.groups },
    ]),
    '',
    '## Write-Ready Groups',
    '',
    markdownTable(readyGroups.slice(0, 100), [
      { label: 'source', value: (row) => row.source },
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number ?? row.number_plain },
      { label: 'name', value: (row) => row.card_name },
      { label: 'class', value: (row) => row.readiness_class },
      { label: 'reason', value: (row) => row.reason },
    ]),
    '',
    '## Blocked / Preserve Samples',
    '',
    markdownTable(blockedGroups.slice(0, 100), [
      { label: 'source', value: (row) => row.source },
      { label: 'set', value: (row) => row.set_code },
      { label: 'number', value: (row) => row.number ?? row.number_plain },
      { label: 'name', value: (row) => row.card_name },
      { label: 'class', value: (row) => row.readiness_class },
    ]),
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
    by_readiness_class: report.by_readiness_class,
    recommended_next_step: report.recommended_next_step,
  }, null, 2));
}

await main();
