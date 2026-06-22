import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { DEFAULT_OUTPUT_DIR, markdownTable, normalizeText } from './verified_master_set_index_v1/shared.mjs';

const ROOT = process.cwd();
const execFileAsync = promisify(execFile);
const AUDIT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1');
const INPUT_JSON = path.join(AUDIT_DIR, 'english_master_index_stamped_special_evidence_acquisition_packet_v1.json');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'english_master_index_source_exhaustion_v1', 'collexy_bw_holofoil_source_acquisition_v1');
const OUT_JSON = path.join(OUT_DIR, 'collexy_bw_holofoil_source_acquisition_v1.json');
const OUT_MD = path.join(OUT_DIR, 'collexy_bw_holofoil_source_acquisition_v1.md');
const SOURCE_URL = 'https://insights.collexy.com/database-insight-holofoil-overview-black-white-era/';

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

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&#8220;|&ldquo;/g, '"')
    .replace(/&#8221;|&rdquo;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#038;/g, '&');
}

function stripTags(value) {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function comparable(value) {
  return normalizeText(String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, ''))
    .replace(/\bpok[eé]mon\b/g, 'pokemon')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardNameMatches(sentence, row) {
  return comparable(sentence).includes(comparable(row.card_name));
}

function setMatches(context, row) {
  return comparable(context).includes(comparable(row.set_name));
}

function detectFinish(context, sentence) {
  const text = comparable(`${context} ${sentence}`);
  if (text.includes('reverse holofoil') || text.includes('reverse holo')) return 'reverse';
  if (text.includes('cosmos holofoil') || text.includes('cosmos holo')) return 'cosmos';
  if (text.includes('holofoil') || /\bholo\b/.test(text)) return 'holo';
  if (text.includes('non holo') || text.includes('normal')) return 'normal';
  return null;
}

function rowVariantTerms(row) {
  const text = comparable(`${row.variant_key ?? ''} ${row.stamp_label ?? ''}`);
  return {
    league: text.includes('league'),
    playPokemon: text.includes('play pokemon'),
    playerRewards: text.includes('player rewards') || text.includes('crosshatch'),
    championship: text.includes('championship'),
    staff: text.includes('staff'),
    professor: text.includes('professor'),
    prerelease: text.includes('prerelease'),
  };
}

function sourceVariantTerms(sentence) {
  const text = comparable(sentence);
  return {
    pokemonLeagueStamp: text.includes('pokemon league stamp') || text.includes('from the pokemon league'),
    playPokemonLogo: text.includes('play pokemon logo'),
    playerRewards: text.includes('player rewards program'),
    nationalChampionships: text.includes('national championships'),
    regionalChampionships: text.includes('regional championships'),
    staff: text.includes('staff'),
    professor: text.includes('professor program') || text.includes('professor'),
    prerelease: text.includes('prerelease'),
  };
}

function classifyVariantBinding(row, sentence) {
  const rowTerms = rowVariantTerms(row);
  const sourceTerms = sourceVariantTerms(sentence);
  const sourceText = comparable(sentence);

  if (rowTerms.league && (sourceTerms.pokemonLeagueStamp || sourceTerms.playPokemonLogo || sourceTerms.playerRewards)) {
    return sourceTerms.pokemonLeagueStamp
      ? 'finish_bound_variant_synonym_review'
      : 'finish_bound_league_family_synonym_review';
  }
  if (rowTerms.playPokemon && sourceTerms.playPokemonLogo) return 'finish_bound_variant_synonym_review';
  if (rowTerms.playerRewards && sourceTerms.playerRewards) return 'finish_bound_variant_synonym_review';
  if (rowTerms.championship && sourceText.includes('championships')) {
    if (rowTerms.staff === sourceTerms.staff || (!rowTerms.staff && !sourceTerms.staff)) return 'finish_bound_variant_synonym_review';
    return 'finish_bound_variant_label_mismatch';
  }
  if (rowTerms.professor && sourceTerms.professor) return 'finish_bound_variant_synonym_review';
  if (rowTerms.prerelease && sourceTerms.prerelease) return 'finish_bound_variant_synonym_review';
  return 'finish_bound_card_match_variant_mismatch';
}

async function fetchSource() {
  try {
    const response = await fetch(SOURCE_URL, {
      headers: {
        'user-agent': 'GrookaiVaultAudit/1.0 (+https://grookaivault.com)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    return {
      fetch_method: 'node_fetch',
      status: response.status,
      html: await response.text(),
    };
  } catch (error) {
    if (!String(error?.cause?.code ?? error?.message ?? '').includes('UNABLE_TO_VERIFY')) throw error;
    const command = [
      '$ProgressPreference = "SilentlyContinue";',
      '$Headers = @{ "User-Agent" = "GrookaiVaultAudit/1.0 (+https://grookaivault.com)"; "Accept" = "text/html,application/xhtml+xml" };',
      `$Response = Invoke-WebRequest -Uri ${JSON.stringify(SOURCE_URL)} -UseBasicParsing -Headers $Headers -TimeoutSec 60;`,
      'Write-Output ("__STATUS__" + [int]$Response.StatusCode);',
      'Write-Output $Response.Content;',
    ].join(' ');
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], {
      cwd: ROOT,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 90_000,
    });
    const marker = stdout.match(/^__STATUS__(\d+)\r?\n/);
    return {
      fetch_method: 'powershell_invoke_webrequest_tls_fallback',
      status: marker ? Number(marker[1]) : 200,
      html: marker ? stdout.slice(marker[0].length) : stdout,
    };
  }
}

function parseEvidenceSentences(html) {
  const normalized = decodeEntities(html);
  const detailBlocks = [...normalized.matchAll(/<details[\s\S]*?<\/details>/gi)].map((match) => match[0]);
  const blocks = detailBlocks.length ? detailBlocks : [normalized];
  const sentences = [];

  for (const block of blocks) {
    const contextText = stripTags(block);
    const setMatch = contextText.match(/\bIn\s+([^,.]+),|\bFor\s+([^,.]+),/i);
    const contextSet = setMatch?.[1] ?? setMatch?.[2] ?? null;
    for (const li of block.matchAll(/<li[\s\S]*?<\/li>/gi)) {
      const text = stripTags(li[0]);
      if (!/\bvariant\b/i.test(text)) continue;
      if (!/(stamp|league|championship|professor|prerelease|player rewards|play!? pokemon)/i.test(text)) continue;
      sentences.push({
        context_set: contextSet,
        context_text: contextText.slice(0, 700),
        evidence_text: text,
        source_url: SOURCE_URL,
      });
    }
  }
  return sentences;
}

function evaluateRow(row, sentences) {
  const matches = [];
  for (const sentence of sentences) {
    if (!cardNameMatches(sentence.evidence_text, row)) continue;
    const setOk = setMatches(`${sentence.context_set ?? ''} ${sentence.context_text}`, row);
    if (!setOk) continue;
    const finish = detectFinish(sentence.context_text, sentence.evidence_text);
    if (!finish) continue;
    const classification = classifyVariantBinding(row, sentence.evidence_text);
    matches.push({
      source_key: 'collexy_bw_holofoil_overview',
      source_kind: 'collector_reference',
      source_url: sentence.source_url,
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      finish_key: finish,
      evidence_type: 'finish_presence_review',
      evidence_label: sentence.evidence_text.length > 240
        ? `${sentence.evidence_text.slice(0, 237)}...`
        : sentence.evidence_text,
      context_set: sentence.context_set,
      source_classification: classification,
      promotable: false,
      reason_not_promotable: classification.includes('mismatch')
        ? 'Collexy sentence proves a card-level finish variant, but source stamp wording does not match the queued variant closely enough.'
        : 'Collexy is a strong review source, but queued stamp-label synonym governance must be approved before promotion.',
    });
  }
  return matches;
}

function renderMarkdown(report) {
  const rows = report.rows.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.stamp_label ?? row.variant_key,
    row.finish_key,
    row.source_classification,
    row.evidence_label,
  ]);

  return [
    '# Collexy BW Holofoil Source Acquisition V1',
    '',
    `Generated: ${report.generated_at}`,
    '',
    'Audit-only. No DB writes, no migrations, no apply.',
    '',
    'This pass checks the current stamped/special source-acquisition packet against Collexy\'s Black & White holofoil overview. Collexy can provide card-level finish context for some League / Play Pokemon / Player Rewards variants, but this report does not promote rows automatically.',
    '',
    '## Summary',
    '',
    markdownTable(['metric', 'value'], [
      ['target_rows', report.summary.target_rows],
      ['source_sentences', report.summary.source_sentences],
      ['matched_rows', report.summary.matched_rows],
      ['candidate_records', report.summary.candidate_records],
      ['promotable_rows', report.summary.promotable_rows],
      ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
    ]),
    '',
    '## By Classification',
    '',
    markdownTable(['classification', 'count'], Object.entries(report.summary.by_classification)),
    '',
    '## Candidate Records',
    '',
    rows.length
      ? markdownTable(['set', 'number', 'card', 'stamp/variant', 'finish', 'classification', 'evidence label'], rows)
      : 'No current rows matched Collexy finish evidence.',
    '',
    '## Guardrail',
    '',
    'Rows are review-only until exact stamp-label synonym governance is approved and a source-delta guard confirms the candidate closes a current gap without creating conflicts.',
    '',
  ].join('\n');
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rows = input.rows ?? [];
  const fetched = await fetchSource();
  const sentences = parseEvidenceSentences(fetched.html);
  const candidateRecords = rows.flatMap((row) => evaluateRow(row, sentences));
  const matchedRows = new Set(candidateRecords.map((row) => `${row.set_key}|${row.card_number}|${row.card_name}|${row.variant_key}`));

  const report = {
    package_id: 'COLLEXY-BW-HOLOFOIL-SOURCE-ACQUISITION-V1',
    generated_at: new Date().toISOString(),
    input_artifact: rel(INPUT_JSON),
    input_fingerprint_sha256: input.fingerprint_sha256 ?? null,
    source: {
      source_key: 'collexy_bw_holofoil_overview',
      source_kind: 'collector_reference',
      source_url: SOURCE_URL,
      fetch_method: fetched.fetch_method,
      http_status: fetched.status,
    },
    safety: {
      db_writes_performed: false,
      migrations_created: false,
      apply_performed: false,
      cleanup_performed: false,
      promotable_records_written: 0,
    },
    summary: {
      target_rows: rows.length,
      source_sentences: sentences.length,
      matched_rows: matchedRows.size,
      candidate_records: candidateRecords.length,
      promotable_rows: 0,
      by_classification: countBy(candidateRecords, (row) => row.source_classification),
      by_finish: countBy(candidateRecords, (row) => row.finish_key),
      by_set: countBy(candidateRecords, (row) => row.set_key),
    },
    rows: candidateRecords,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    package_id: report.package_id,
    input_fingerprint_sha256: report.input_fingerprint_sha256,
    summary: report.summary,
    rows: report.rows.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      finish_key: row.finish_key,
      source_classification: row.source_classification,
      evidence_label: row.evidence_label,
    })),
  }));

  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    output_json: rel(OUT_JSON),
    output_md: rel(OUT_MD),
    fingerprint_sha256: report.fingerprint_sha256,
    summary: report.summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
