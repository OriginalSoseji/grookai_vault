import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;
const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const STAGING_ASSET_DIR = path.join('tmp', 'nonproduction_image_staging', 'image_truth_v1', 'img15a-svp-pikachu-visible-missing');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img15a_svp_pikachu_visible_missing_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img15a_svp_pikachu_visible_missing_dry_run_v1.md');
const PACKAGE_ID = 'IMG-15A-SVP-PIKACHU-VISIBLE-MISSING-CHILD-IMAGE-DRY-RUN';

const CANDIDATES = [
  {
    card_print_id: '50386954-ded6-4909-8d17-6b391aeb53e4',
    card_printing_id: '2e805b83-8ce7-4445-b4ec-4deab1d1ccb6',
    printing_gv_id: 'GV-PK-PR-SV-085-STD',
    set_code: 'svp',
    card_name: 'Pikachu with Grey Felt Hat',
    number: '085',
    finish_key: 'normal',
    image_confidence: 'exact',
    source_key: 'pkmncards',
    source_url: 'https://pkmncards.com/card/pikachu-with-grey-felt-hat-scarlet-violet-promos-svp-085/',
    asset_url: 'https://pkmncards.com/wp-content/uploads/svbsp_en_085_std.jpg',
  },
  {
    card_print_id: 'cc9121e0-a2da-4914-b8a1-fe082692aaee',
    card_printing_id: 'c8f42393-c642-4d54-b033-b2174f2b4e4e',
    printing_gv_id: 'GV-PK-PR-SV-190-STD',
    set_code: 'svp',
    card_name: 'Pikachu',
    number: '190',
    finish_key: 'normal',
    image_confidence: 'exact',
    source_key: 'pkmncards',
    source_url: 'https://pkmncards.com/card/pikachu-scarlet-violet-promos-svp-190/',
    asset_url: 'https://pkmncards.com/wp-content/uploads/svbsp_en_190_std.jpg',
  },
  {
    card_print_id: 'f76cba14-e109-47a7-86dd-2e220e37f831',
    card_printing_id: '7fe6c78d-ff07-4a48-b828-04983b3337ef',
    printing_gv_id: 'GV-PK-PR-SV-214-STD',
    set_code: 'svp',
    card_name: 'Pikachu',
    number: '214',
    finish_key: 'normal',
    image_confidence: 'exact',
    source_key: 'pkmncards',
    source_url: 'https://pkmncards.com/card/pikachu-scarlet-violet-promos-svp-214/',
    asset_url: 'https://pkmncards.com/wp-content/uploads/svbsp_en_214_std.jpg',
  },
];

const BLOCKED_REVIEW_ROWS = [
  {
    gv_id: 'GV-PK-PR-SV-225',
    printing_gv_id: 'GV-PK-PR-SV-225-RH',
    set_code: 'svp',
    card_name: 'Pikachu',
    number: '225',
    finish_key: 'reverse',
    blocked_reason: 'identity_finish_review_required_before_image_promotion',
    notes: 'Current row is modeled as base/reverse, while external evidence describes SVP 225 as a 2025 World Championships promo lane with stamp/winner variant evidence.',
    evidence_urls: [
      'https://www.tcgplayer.com/product/648631/pokemon-sv-scarlet-and-violet-promo-cards-pikachu-225-world-championship-2025',
      'https://www.pricecharting.com/game/pokemon-promo/pikachu-world-championships-225',
      'https://www.pokellector.com/Scarlet-Violet-English-Promos-Expansion/Pikachu-Card-225',
      'https://bulbapedia.bulbagarden.net/wiki/Pikachu_(SVP_Promo_101)',
    ],
  },
  {
    gv_id: 'GV-PK-PR-SV-85',
    printing_gv_id: 'GV-PK-PR-SV-85-STD',
    set_code: 'svp',
    card_name: 'Pikachu with Grey Felt Hat',
    number: '85',
    finish_key: 'normal',
    blocked_reason: 'already_has_child_image_path',
    notes: 'Existing IMG-03C PKMNCards representative child image is already stored on the child row; this package does not rewrite it.',
    evidence_urls: ['https://pkmncards.com/card/pikachu-with-grey-felt-hat-scarlet-violet-promos-svp-085/'],
  },
];

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function sha256Hex(bufferOrText) {
  return crypto.createHash('sha256').update(bufferOrText).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

async function fetchBuffer(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+dry-run; nonproduction-staging)',
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
  } catch {
    // Fall through to PowerShell, which uses the Windows certificate store.
  }

  if (process.platform !== 'win32') throw new Error(`asset_fetch_failed:${url}`);

  await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
  const tempPath = path.join(STAGING_ASSET_DIR, `${sha256Hex(url).slice(0, 16)}.download`);
  const command = [
    '& {',
    'param($u,$o)',
    '$ProgressPreference = "SilentlyContinue";',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
    'Invoke-WebRequest -Uri $u -OutFile $o -UseBasicParsing -TimeoutSec 30;',
    '}',
  ].join(' ');
  await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command, url, tempPath], {
    timeout: 45000,
    maxBuffer: 1024 * 1024,
  });
  const buffer = await fs.readFile(tempPath);
  await fs.rm(tempPath, { force: true });
  return buffer;
}

async function stageAsset(row) {
  const buffer = await fetchBuffer(row.asset_url);
  const sha256 = sha256Hex(buffer);
  const fileName = `${row.set_code}_${normalizeNumber(row.number)}_${row.finish_key}_${row.card_printing_id.slice(0, 8)}_${sha256.slice(0, 16)}.jpg`;
  const localPath = path.join(STAGING_ASSET_DIR, fileName);
  await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
  await fs.writeFile(localPath, buffer);
  return {
    source_sha256: sha256,
    normalized_sha256: sha256,
    normalized_size_bytes: buffer.length,
    local_nonproduction_asset_path: localPath.replaceAll('\\', '/'),
    planned_normalized_front_storage_path: [
      'warehouse-derived',
      'image-truth-v1',
      'img15a-svp-pikachu-visible-missing',
      row.set_code,
      row.card_printing_id,
      `${sha256.slice(0, 24)}.jpg`,
    ].join('/'),
  };
}

async function fetchCurrentTarget(client, row) {
  const result = await client.query(
    `
      select
        cpi.id as card_printing_id,
        cpi.card_print_id,
        cpi.printing_gv_id,
        cpi.finish_key,
        cpi.image_source as child_image_source,
        cpi.image_path as child_image_path,
        cpi.image_url as child_image_url,
        cpi.image_alt_url as child_image_alt_url,
        cpi.image_status as child_image_status,
        cpi.image_note as child_image_note,
        cp.gv_id as parent_gv_id,
        cp.name as card_name,
        cp.number,
        cp.set_code,
        cp.image_source as parent_image_source,
        cp.image_path as parent_image_path,
        cp.image_url as parent_image_url,
        cp.image_alt_url as parent_image_alt_url,
        cp.representative_image_url as parent_representative_image_url,
        cp.image_status as parent_image_status,
        cp.image_note as parent_image_note
      from public.card_printings cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      where cpi.id = $1
      limit 1
    `,
    [row.card_printing_id],
  );
  return result.rows[0] ?? null;
}

function validateTarget(row, current) {
  const errors = [];
  if (!current) return ['target_card_printing_not_found'];
  if (current.card_print_id !== row.card_print_id) errors.push('card_print_id_mismatch');
  if (current.printing_gv_id !== row.printing_gv_id) errors.push('printing_gv_id_mismatch');
  if (normalizeKey(current.set_code) !== normalizeKey(row.set_code)) errors.push('set_code_mismatch');
  if (normalizeNumber(current.number) !== normalizeNumber(row.number)) errors.push('number_mismatch');
  if (normalizeKey(current.card_name) !== normalizeKey(row.card_name)) errors.push('card_name_mismatch');
  if (normalizeKey(current.finish_key) !== normalizeKey(row.finish_key)) errors.push('finish_key_mismatch');
  if (clean(current.child_image_path)) errors.push('child_image_path_already_present');
  if (clean(current.child_image_url)) errors.push('child_image_url_already_present');
  if (clean(current.child_image_alt_url)) errors.push('child_image_alt_url_already_present');
  return errors;
}

function parentImageSnapshot(row) {
  return {
    parent_image_source: clean(row.parent_image_source),
    parent_image_path: clean(row.parent_image_path),
    parent_image_url: clean(row.parent_image_url),
    parent_image_alt_url: clean(row.parent_image_alt_url),
    parent_representative_image_url: clean(row.parent_representative_image_url),
    parent_image_status: clean(row.parent_image_status),
    parent_image_note: clean(row.parent_image_note),
  };
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    const cells = columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|'));
    return `| ${cells.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function buildMarkdown(report) {
  return `# Image Truth V1 IMG-15A SVP Pikachu Visible Missing Dry Run

This is a rollback-only dry-run package for the visible missing SVP Pikachu image rows found in Explore.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- target_table: ${report.target_table}
- parent_overwrite_allowed: ${report.parent_overwrite_allowed}
- package_id: ${report.package_id}

## Summary

- source_rows: ${report.source_rows}
- dry_run_ready_rows: ${report.dry_run_ready_rows}
- blocked_rows: ${report.blocked_rows}
- rollback_completed: ${report.rollback_completed}
- proof_hash: \`${report.proof_hash}\`

## Dry-Run Rows

${markdownTable(report.rows, [
  { label: 'status', value: (row) => row.dry_run_status },
  { label: 'gv id', value: (row) => row.parent_gv_id },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'card', value: (row) => row.card_name },
  { label: 'number', value: (row) => row.number },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'confidence', value: (row) => row.image_confidence },
  { label: 'storage path', value: (row) => row.normalized_asset?.planned_normalized_front_storage_path },
  { label: 'source', value: (row) => row.source_url },
])}

## Blocked / Already Covered Rows

${markdownTable(report.blocked_review_rows, [
  { label: 'reason', value: (row) => row.blocked_reason },
  { label: 'gv id', value: (row) => row.gv_id },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'card', value: (row) => row.card_name },
  { label: 'number', value: (row) => row.number },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'notes', value: (row) => row.notes },
])}
`;
}

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for rollback-only dry-run.');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const rows = [];
  let rollbackCompleted = false;

  try {
    await client.query('begin');

    for (const sourceRow of CANDIDATES) {
      const normalizedAsset = await stageAsset(sourceRow);
      const before = await fetchCurrentTarget(client, sourceRow);
      const validationErrors = validateTarget(sourceRow, before);
      if (validationErrors.length > 0) {
        rows.push({
          ...sourceRow,
          parent_gv_id: before?.parent_gv_id ?? null,
          dry_run_status: 'blocked',
          validation_errors: validationErrors,
          normalized_asset: normalizedAsset,
        });
        continue;
      }

      const parentBeforeHash = proofHash(parentImageSnapshot(before));
      const imageNote = `${PACKAGE_ID}:${sourceRow.source_key}:${sourceRow.source_url}`;
      const updateResult = await client.query(
        `
          update public.card_printings
          set
            image_source = $2,
            image_path = $3,
            image_status = $4,
            image_note = $5
          where id = $1
            and image_path is null
            and (image_url is null or btrim(image_url) = '')
            and (image_alt_url is null or btrim(image_alt_url) = '')
          returning id, card_print_id, printing_gv_id, image_source, image_path, image_url, image_alt_url, image_status, image_note
        `,
        [
          sourceRow.card_printing_id,
          'identity',
          normalizedAsset.planned_normalized_front_storage_path,
          'exact',
          imageNote,
        ],
      );

      const after = await fetchCurrentTarget(client, sourceRow);
      const parentAfterHash = proofHash(parentImageSnapshot(after));

      rows.push({
        ...sourceRow,
        parent_gv_id: after?.parent_gv_id ?? null,
        dry_run_status: updateResult.rowCount === 1 && parentBeforeHash === parentAfterHash
          ? 'rollback_update_verified'
          : 'blocked',
        validation_errors: updateResult.rowCount === 1 ? [] : ['dry_run_update_row_count_mismatch'],
        parent_image_unchanged: parentBeforeHash === parentAfterHash,
        proposed_image_source: 'identity',
        proposed_image_path: normalizedAsset.planned_normalized_front_storage_path,
        proposed_image_status: 'exact',
        proposed_image_note: imageNote,
        normalized_asset: normalizedAsset,
      });
    }

    await client.query('rollback');
    rollbackCompleted = true;
  } finally {
    if (!rollbackCompleted) {
      try { await client.query('rollback'); } catch { /* ignore */ }
    }
    await client.end();
  }

  const proof = {
    package_id: PACKAGE_ID,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      printing_gv_id: row.printing_gv_id,
      set_code: row.set_code,
      card_name: row.card_name,
      number: row.number,
      finish_key: row.finish_key,
      source_key: row.source_key,
      source_url: row.source_url,
      image_confidence: row.image_confidence,
      proposed_image_path: row.proposed_image_path,
      dry_run_status: row.dry_run_status,
      parent_image_unchanged: row.parent_image_unchanged,
      validation_errors: row.validation_errors,
      normalized_sha256: row.normalized_asset?.normalized_sha256,
      normalized_size_bytes: row.normalized_asset?.normalized_size_bytes,
    })),
    blocked_review_rows: BLOCKED_REVIEW_ROWS,
    rollback_completed: rollbackCompleted,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
  };

  const report = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    source_rows: CANDIDATES.length,
    dry_run_ready_rows: rows.filter((row) => row.dry_run_status === 'rollback_update_verified').length,
    blocked_rows: rows.filter((row) => row.dry_run_status !== 'rollback_update_verified').length + BLOCKED_REVIEW_ROWS.length,
    rollback_completed: rollbackCompleted,
    rows,
    blocked_review_rows: BLOCKED_REVIEW_ROWS,
    proof_hash: proofHash(proof),
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));

  console.log(JSON.stringify({
    output_json: OUTPUT_JSON,
    output_md: OUTPUT_MD,
    dry_run_ready_rows: report.dry_run_ready_rows,
    blocked_rows: report.blocked_rows,
    proof_hash: report.proof_hash,
    db_writes_performed: report.db_writes_performed,
    storage_uploads_performed: report.storage_uploads_performed,
    migrations_created: report.migrations_created,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
