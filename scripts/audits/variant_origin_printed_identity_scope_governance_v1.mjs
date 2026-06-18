import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const IN_GAPS_JSON = path.join(ROOT, 'docs', 'audits', 'variant_origin_index_v1', 'variant_origin_source_gaps_v1.json');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'variant_origin_index_v1');
const OUT_JSON = path.join(OUT_DIR, 'variant_origin_printed_identity_scope_governance_v1.json');
const OUT_MD = path.join(OUT_DIR, 'variant_origin_printed_identity_scope_governance_v1.md');

const VERSION = 'VARIANT_ORIGIN_PRINTED_IDENTITY_SCOPE_GOVERNANCE_V1';

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function tokenFor(row) {
  return String(row.variant_key || row.printed_identity_modifier || '').trim();
}

function classify(row) {
  const token = tokenFor(row);
  const lower = token.toLowerCase();
  const modifier = String(row.printed_identity_modifier ?? '').toLowerCase();
  const number = String(row.number ?? '');

  if (lower === 'alt') {
    return {
      governance_bucket: 'artwork_treatment_needs_source',
      target_system: 'artwork_intelligence_or_rarity_art_identity',
      public_origin_copy_status: 'blocked',
      why_it_is_not_origin_copy: 'Alternate-art labels describe an artwork treatment or market naming lane, not a product/campaign origin by themselves.',
      required_next_step: 'Acquire card-level source evidence for the exact alternate-art treatment before writing public explanatory copy.',
    };
  }

  if (modifier.startsWith('trainer_subject:')) {
    return {
      governance_bucket: 'trainer_subject_disambiguator',
      target_system: 'search_and_display_identity',
      public_origin_copy_status: 'not_origin_copy',
      why_it_is_not_origin_copy: 'Trainer-subject modifiers distinguish cards with shared generic names such as Boss’s Orders or Professor’s Research.',
      required_next_step: 'Keep as identity/search metadata; do not publish as a special variant origin unless a separate distribution variant exists.',
    };
  }

  if (modifier.startsWith('name_suffix:')) {
    return {
      governance_bucket: 'name_suffix_disambiguator',
      target_system: 'search_and_display_identity',
      public_origin_copy_status: 'not_origin_copy',
      why_it_is_not_origin_copy: 'Name suffix modifiers disambiguate printed card identity and are not campaign, stamp, error, or print-run origins.',
      required_next_step: 'Keep as identity/search metadata; do not publish as a special variant origin.',
    };
  }

  if (modifier.startsWith('number_prefix:')) {
    return {
      governance_bucket: 'printed_number_prefix',
      target_system: 'printed_identity_documentation',
      public_origin_copy_status: 'not_origin_copy',
      why_it_is_not_origin_copy: 'Printed number prefixes are checklist/namespace identity, not an origin story by themselves.',
      required_next_step: 'Document in printed identity rules and only add origin copy if the prefix maps to a sourced subset or campaign.',
    };
  }

  if (row.set_code === 'exu' && row.name === 'Unown' && /^[A-Z!?]$/i.test(token)) {
    return {
      governance_bucket: 'printed_character_identity',
      target_system: 'printed_identity_documentation',
      public_origin_copy_status: 'not_origin_copy',
      why_it_is_not_origin_copy: 'Unown letter and punctuation lanes are printed card identities, not special distribution origins.',
      required_next_step: 'Document as printed identity/card-number behavior rather than variant-origin educational copy.',
    };
  }

  if (/^[a-z]$/i.test(token) || /[0-9][a-z]$/i.test(number)) {
    return {
      governance_bucket: 'printed_number_suffix',
      target_system: 'printed_identity_documentation',
      public_origin_copy_status: 'not_origin_copy',
      why_it_is_not_origin_copy: 'Letter suffixes usually distinguish printed card numbers or checklist slots, not campaign or error origins.',
      required_next_step: 'Move to printed identity governance; add origin copy only if a sourced product or error reason exists.',
    };
  }

  if (/^xy[a-z]?$/i.test(token) || /^xy[0-9]+[a-z]?$/i.test(number)) {
    return {
      governance_bucket: 'promo_number_namespace',
      target_system: 'printed_identity_documentation',
      public_origin_copy_status: 'not_origin_copy',
      why_it_is_not_origin_copy: 'XY promo namespace tokens identify promo numbering, not a special-origin story by themselves.',
      required_next_step: 'Document as promo numbering identity and keep out of variant-origin public copy.',
    };
  }

  return {
    governance_bucket: 'manual_scope_review',
    target_system: 'manual_governance_review',
    public_origin_copy_status: 'blocked',
    why_it_is_not_origin_copy: 'This row still lacks enough classification to decide whether it is origin copy, printed identity, or display/search metadata.',
    required_next_step: 'Review source evidence and assign a governance bucket before public copy is shown.',
  };
}

function markdownTable(headers, rows) {
  const clean = (value) => String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${headers.map((header) => clean(row[header])).join(' | ')} |`),
  ].join('\n');
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] ?? 'unknown';
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function renderMarkdown(report) {
  const bucketRows = Object.entries(report.summary.by_governance_bucket)
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => b.count - a.count || a.bucket.localeCompare(b.bucket));

  const lines = [
    '# Variant Origin Printed Identity Scope Governance V1',
    '',
    'Read-only governance report for rows that should not be treated as campaign/error/stamp origin copy without a separate rule.',
    '',
    '```text',
    `db_writes_performed: ${report.db_writes_performed}`,
    `migrations_created: ${report.migrations_created}`,
    `cleanup_performed: ${report.cleanup_performed}`,
    `quarantine_performed: ${report.quarantine_performed}`,
    '```',
    '',
    '## Summary',
    '',
    `- Rows reviewed: ${report.summary.rows_reviewed}`,
    `- Not-origin-copy rows: ${report.summary.not_origin_copy_rows}`,
    `- Blocked rows: ${report.summary.blocked_rows}`,
    `- Manual review rows: ${report.summary.manual_review_rows}`,
    `- Fingerprint: \`${report.fingerprint_sha256}\``,
    '',
    '## Governance Buckets',
    '',
    markdownTable(['bucket', 'count'], bucketRows),
    '',
    '## Policy',
    '',
    '- Printed number suffixes are identity/checklist facts, not origin stories.',
    '- Trainer-subject and name-suffix modifiers are search/display disambiguators unless separate distribution evidence exists.',
    '- Alternate-art labels remain blocked from origin copy until exact source-backed art-treatment evidence exists.',
    '- None of these classifications authorize DB writes, cleanup, inserts, deletes, or public copy promotion by themselves.',
    '',
    '## Rows',
    '',
    markdownTable(
      ['gv_id', 'card', 'token', 'governance_bucket', 'public_origin_copy_status', 'target_system'],
      report.rows.map((row) => ({
        gv_id: row.gv_id,
        card: `${row.name} ${row.set_code} ${row.number}`,
        token: row.token,
        governance_bucket: row.governance_bucket,
        public_origin_copy_status: row.public_origin_copy_status,
        target_system: row.target_system,
      })),
    ),
    '',
  ];

  return `${lines.join('\n')}\n`;
}

async function main() {
  const gapReport = JSON.parse(await fs.readFile(IN_GAPS_JSON, 'utf8'));
  const rows = (gapReport.rows ?? [])
    .filter((row) => row.family_key === 'letter_or_suffix_identity_needs_scope_decision'
      || row.family_key === 'unclassified_special_identity')
    .map((row) => {
      const classification = classify(row);
      return {
        ...row,
        token: tokenFor(row),
        ...classification,
      };
    });

  const report = {
    generated_at: new Date().toISOString(),
    version: VERSION,
    mode: 'read_only_scope_governance',
    db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    input_gap_fingerprint_sha256: gapReport.fingerprint_sha256,
    summary: {
      rows_reviewed: rows.length,
      not_origin_copy_rows: rows.filter((row) => row.public_origin_copy_status === 'not_origin_copy').length,
      blocked_rows: rows.filter((row) => row.public_origin_copy_status === 'blocked').length,
      manual_review_rows: rows.filter((row) => row.governance_bucket === 'manual_scope_review').length,
      by_governance_bucket: countBy(rows, 'governance_bucket'),
      by_target_system: countBy(rows, 'target_system'),
    },
    rows,
  };
  report.fingerprint_sha256 = sha256(report);

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    rows_reviewed: report.summary.rows_reviewed,
    not_origin_copy_rows: report.summary.not_origin_copy_rows,
    blocked_rows: report.summary.blocked_rows,
    manual_review_rows: report.summary.manual_review_rows,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
