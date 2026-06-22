import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const OUT_DIR = path.join(
  ROOT,
  'docs/audits/english_master_index_source_exhaustion_v1/stamped_special_manual_review_packet_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'stamped_special_manual_review_packet_v1.json');
const OUT_MD = path.join(OUT_DIR, 'stamped_special_manual_review_packet_v1.md');

const PKMNGG_REPORT = path.join(
  ROOT,
  'docs/audits/english_master_index_source_exhaustion_v1/pkmngg_stamped_finish_acquisition_v1/pkmngg_stamped_finish_acquisition_v1.json',
);
const PKMNGG_DELTA = path.join(
  ROOT,
  'docs/audits/english_master_index_source_exhaustion_v1/source_delta_audit_v1/pkmngg_stamped_finish_source_delta_audit_v1.json',
);
const POKECARDVALUES_REPORT = path.join(
  ROOT,
  'docs/audits/english_master_index_source_exhaustion_v1/pokecardvalues_stamped_finish_acquisition_v1/pokecardvalues_stamped_finish_acquisition_v1.json',
);
const QUEUE = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json',
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function countBy(rows, keyFn) {
  const out = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function pickRow(row) {
  return {
    status: row.status,
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    finish_key: row.finish_key,
    source_url: row.source_url,
    http_status: row.http_status,
    reason: row.reason || row.notes,
  };
}

function pkmnggConflict(row) {
  return {
    ...pickRow(row),
    candidate_facts: (row.candidate_facts || []).map((fact) => ({
      label: fact.label,
      subtype: fact.subtype,
      finish_key: fact.finish_key,
      tcgplayer_id: fact.tcgPlayerId,
    })),
  };
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._\n';
  const header = `| ${columns.map((c) => c.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    return `| ${columns.map((c) => String(c.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`;
  });
  return [header, sep, ...body].join('\n') + '\n';
}

const pkmngg = readJson(PKMNGG_REPORT);
const pkmnggDelta = readJson(PKMNGG_DELTA);
const pokecardvalues = readJson(POKECARDVALUES_REPORT);
const queue = readJson(QUEUE);

const pkmnggRows = pkmngg.results || [];
const pokecardvaluesRows = pokecardvalues.results || [];

const usefulDelta = pkmnggDelta.useful_matches || [];
const pkmnggAccepted = pkmnggRows.filter((row) => row.status === 'accepted_exact_pkmngg_variant_finish');
const pkmnggConflicts = pkmnggRows.filter((row) => row.status === 'blocked_conflicting_pkmngg_finish_matches');
const pkmnggNoExactVariant = pkmnggRows.filter((row) => row.status === 'blocked_no_pkmngg_variant_finish_match');
const pkmnggUnavailable = pkmnggRows.filter((row) =>
  row.status === 'blocked_pkmngg_fetch_failed' || row.status === 'blocked_pkmngg_url_unmapped',
);

const pokecardvaluesAccepted = pokecardvaluesRows.filter((row) => row.status === 'accepted_exact_finish_match');
const pokecardvaluesMultiVariant = pokecardvaluesRows.filter(
  (row) => row.status === 'blocked_multiple_matching_stamp_variants',
);

const queueSummary = queue.summary || {};
const packet = {
  version: 'stamped_special_manual_review_packet_v1',
  generated_at: new Date().toISOString(),
  audit_only: true,
  db_writes_performed: false,
  migrations_created: false,
  cleanup_performed: false,
  quarantine_performed: false,
  purpose:
    'Preserve exact stamped/special source findings that are not safe to promote automatically, and route them into manual adjudication buckets.',
  inputs: {
    pkmngg_report: path.relative(ROOT, PKMNGG_REPORT).replaceAll('\\', '/'),
    pkmngg_delta: path.relative(ROOT, PKMNGG_DELTA).replaceAll('\\', '/'),
    pokecardvalues_report: path.relative(ROOT, POKECARDVALUES_REPORT).replaceAll('\\', '/'),
    current_queue: path.relative(ROOT, QUEUE).replaceAll('\\', '/'),
  },
  summary: {
    current_queue_open_rows: queueSummary.open_rows ?? queueSummary.total_rows ?? null,
    current_queue_write_ready_now: queueSummary.write_ready_now ?? 0,
    pkmngg_exact_records_preserved: pkmnggAccepted.length,
    pkmngg_useful_delta_matches: usefulDelta.length,
    pkmngg_already_mastered_evidence: pkmnggDelta.summary?.already_in_current_index ?? 0,
    pkmngg_no_exact_variant_match: pkmnggNoExactVariant.length,
    pkmngg_unavailable_or_unmapped: pkmnggUnavailable.length,
    pkmngg_conflicting_finish_rows: pkmnggConflicts.length,
    pokecardvalues_exact_records_preserved: pokecardvaluesAccepted.length,
    pokecardvalues_multi_variant_blockers: pokecardvaluesMultiVariant.length,
    write_ready_created: 0,
  },
  promotion_rule:
    'This packet does not make rows write-ready. Rows require exact set + number + name + variant/stamp + active finish evidence and must pass the normal rollback-only dry-run lifecycle before any apply.',
  useful_review_evidence: usefulDelta,
  pkmngg_conflicts: pkmnggConflicts.map(pkmnggConflict),
  pkmngg_unavailable_or_unmapped_sample: pkmnggUnavailable.slice(0, 25).map(pickRow),
  pkmngg_no_exact_variant_match_by_set: countBy(pkmnggNoExactVariant, (row) => `${row.set_key}|${row.set_name}`),
  pkmngg_no_exact_variant_match_by_stamp: countBy(pkmnggNoExactVariant, (row) => row.stamp_label),
  pokecardvalues_multi_variant_blockers: pokecardvaluesMultiVariant.map(pickRow),
  accepted_evidence_summary: {
    pkmngg_by_finish: countBy(pkmnggAccepted, (row) => row.finish_key),
    pkmngg_by_set: countBy(pkmnggAccepted, (row) => `${row.set_key}|${row.set_name}`),
    pokecardvalues_by_finish: countBy(pokecardvaluesAccepted, (row) => row.finish_key),
    pokecardvalues_by_set: countBy(pokecardvaluesAccepted, (row) => `${row.set_key}|${row.set_name}`),
  },
  recommended_next_actions: [
    'Manually adjudicate Team Rocket’s Mimikyu SV10 #087 staff prerelease holo as review evidence only; do not promote solely from the suppressed structured claim lane.',
    'Do not promote Klefki XY4 #66 until placement-specific League variants are modeled because pkmn.gg has reverse and holo finish rows under separate placements.',
    'Keep PokéCardValues multi-variant rows blocked until variant labels are exact enough to select one card identity.',
    'Use preserved exact records only as additive evidence; do not reset or weaken existing Master Index evidence.',
  ],
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(packet, null, 2) + '\n');

const md = `# Stamped/Special Manual Review Packet V1

Generated: ${packet.generated_at}

This is an audit-only manual review packet. It preserves source evidence discovered during stamped/special acquisition without making any row write-ready.

## Safety

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_created: 0

## Summary

- Current queue open rows: ${packet.summary.current_queue_open_rows ?? 'unknown'}
- Current queue write-ready now: ${packet.summary.current_queue_write_ready_now}
- pkmn.gg exact records preserved: ${packet.summary.pkmngg_exact_records_preserved}
- pkmn.gg useful delta matches: ${packet.summary.pkmngg_useful_delta_matches}
- pkmn.gg already-mastered evidence rows: ${packet.summary.pkmngg_already_mastered_evidence}
- pkmn.gg no exact variant match: ${packet.summary.pkmngg_no_exact_variant_match}
- pkmn.gg unavailable/unmapped rows: ${packet.summary.pkmngg_unavailable_or_unmapped}
- pkmn.gg conflicting finish rows: ${packet.summary.pkmngg_conflicting_finish_rows}
- PokéCardValues exact records preserved: ${packet.summary.pokecardvalues_exact_records_preserved}
- PokéCardValues multi-variant blockers: ${packet.summary.pokecardvalues_multi_variant_blockers}

## Useful Review Evidence

${markdownTable(packet.useful_review_evidence, [
  { label: 'Set', value: (r) => `${r.set_key} / ${r.set_name}` },
  { label: 'Card', value: (r) => `${r.card_number} ${r.card_name}` },
  { label: 'Finish', value: (r) => r.finish_key },
  { label: 'Delta Status', value: (r) => r.delta_status },
  { label: 'Evidence', value: (r) => r.evidence_label },
  { label: 'URL', value: (r) => r.candidate_url },
])}

## pkmn.gg Conflicts

${markdownTable(packet.pkmngg_conflicts, [
  { label: 'Set', value: (r) => `${r.set_key} / ${r.set_name}` },
  { label: 'Card', value: (r) => `${r.card_number} ${r.card_name}` },
  { label: 'Stamp', value: (r) => r.stamp_label },
  { label: 'Candidate Finishes', value: (r) => [...new Set((r.candidate_facts || []).map((f) => `${f.label}: ${f.finish_key}`))].join('; ') },
  { label: 'URL', value: (r) => r.source_url },
])}

## PokéCardValues Multi-Variant Blockers

${markdownTable(packet.pokecardvalues_multi_variant_blockers, [
  { label: 'Set', value: (r) => `${r.set_key} / ${r.set_name}` },
  { label: 'Card', value: (r) => `${r.card_number} ${r.card_name}` },
  { label: 'Stamp', value: (r) => r.stamp_label },
  { label: 'URL', value: (r) => r.source_url },
])}

## pkmn.gg No Exact Variant Match By Stamp

${markdownTable(Object.entries(packet.pkmngg_no_exact_variant_match_by_stamp).map(([stamp, count]) => ({ stamp, count })), [
  { label: 'Stamp', value: (r) => r.stamp },
  { label: 'Rows', value: (r) => r.count },
])}

## Recommended Next Actions

${packet.recommended_next_actions.map((action) => `- ${action}`).join('\n')}
`;

fs.writeFileSync(OUT_MD, md);

console.log(JSON.stringify({
  wrote: [path.relative(ROOT, OUT_JSON), path.relative(ROOT, OUT_MD)],
  summary: packet.summary,
}, null, 2));
