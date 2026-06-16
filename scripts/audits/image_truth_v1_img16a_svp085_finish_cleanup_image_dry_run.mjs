import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img16a_svp085_finish_cleanup_image_dry_run_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img16a_svp085_finish_cleanup_image_dry_run_v1.md');
const MASTER_PRINTINGS_JSON = 'docs/audits/english_master_index_publishable_v1/sets/svp/printings.json';
const PACKAGE_ID = 'IMG-16A-SVP085-FINISH-CLEANUP-IMAGE-DRY-RUN';

const TARGET = {
  parent_id: '50386954-ded6-4909-8d17-6b391aeb53e4',
  parent_gv_id: 'GV-PK-PR-SV-085',
  card_name: 'Pikachu with Grey Felt Hat',
  set_code: 'svp',
  number: '085',
  supported_child_id: '2e805b83-8ce7-4445-b4ec-4deab1d1ccb6',
  supported_printing_gv_id: 'GV-PK-PR-SV-085-STD',
  supported_finish_key: 'normal',
  unsupported_children: [
    {
      child_id: '03998b41-9da4-437b-a3fd-a38303af28da',
      printing_gv_id: 'GV-PK-PR-SV-085-HOLO',
      finish_key: 'holo',
    },
    {
      child_id: '43e6bc2d-3a11-4a68-ae0c-faf4eb4b48d3',
      printing_gv_id: 'GV-PK-PR-SV-085-RH',
      finish_key: 'reverse',
    },
  ],
  exact_image: {
    source_key: 'pkmncards',
    source_url: 'https://pkmncards.com/card/pikachu-with-grey-felt-hat-scarlet-violet-promos-svp-085/',
    local_nonproduction_asset_path: 'tmp/nonproduction_image_staging/image_truth_v1/img15a-svp-pikachu-visible-missing/svp_85_normal_2e805b83_5d1a419870158d9f.jpg',
    normalized_sha256: '5d1a419870158d9f0544988d8a4352d78d7b1ddb660e5f7af12c2b60481e95c7',
    normalized_size_bytes: 180772,
    planned_storage_path: 'warehouse-derived/image-truth-v1/img15a-svp-pikachu-visible-missing/svp/2e805b83-8ce7-4445-b4ec-4deab1d1ccb6/5d1a419870158d9f0544988d.jpg',
  },
};

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
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

async function verifyLocalAsset() {
  const buffer = await fs.readFile(TARGET.exact_image.local_nonproduction_asset_path);
  const sha = sha256Hex(buffer);
  return {
    exists: true,
    sha256: sha,
    size_bytes: buffer.length,
    matches_expected: sha === TARGET.exact_image.normalized_sha256 && buffer.length === TARGET.exact_image.normalized_size_bytes,
  };
}

async function loadMasterEvidence() {
  const parsed = JSON.parse(await fs.readFile(MASTER_PRINTINGS_JSON, 'utf8'));
  const printings = Array.isArray(parsed.printings) ? parsed.printings : [];
  const greyFeltPrintings = printings.filter((row) =>
    row.set_key === 'svp' &&
    normalizeNumber(row.card_number) === '85' &&
    String(row.card_name ?? '').trim().toLowerCase() === 'pikachu with grey felt hat'
  );

  return {
    source_file: MASTER_PRINTINGS_JSON,
    grey_felt_printings: greyFeltPrintings,
    supports_exactly_normal: greyFeltPrintings.length === 1 && greyFeltPrintings[0]?.finish_key === 'normal',
  };
}

async function fetchCurrentTarget(client) {
  const parent = await client.query(
    `
      select id, gv_id, name, set_code, number, rarity, printed_identity_modifier,
             image_source, image_path, image_url, image_alt_url, representative_image_url, image_status, image_note
      from public.card_prints
      where id = $1
      limit 1
    `,
    [TARGET.parent_id],
  );

  const children = await client.query(
    `
      select id, card_print_id, printing_gv_id, finish_key, image_source, image_path, image_url, image_alt_url, image_status, image_note
      from public.card_printings
      where card_print_id = $1
      order by finish_key, printing_gv_id
    `,
    [TARGET.parent_id],
  );

  return {
    parent: parent.rows[0] ?? null,
    children: children.rows,
  };
}

async function dependencyCounts(client, childIds) {
  const result = await client.query(
    `
      select tc.table_schema, tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and ccu.table_schema = 'public'
        and ccu.table_name = 'card_printings'
        and ccu.column_name = 'id'
      order by tc.table_name, kcu.column_name
    `,
  );

  const counts = [];
  for (const fk of result.rows) {
    const countResult = await client.query(
      `select count(*)::int as count from ${fk.table_schema}.${fk.table_name} where ${fk.column_name} = any($1::uuid[])`,
      [childIds],
    );
    counts.push({ ...fk, count: Number(countResult.rows[0]?.count ?? 0) });
  }
  return counts;
}

function parentSnapshot(parent) {
  return {
    id: parent?.id ?? null,
    gv_id: parent?.gv_id ?? null,
    name: parent?.name ?? null,
    set_code: parent?.set_code ?? null,
    number: parent?.number ?? null,
    rarity: parent?.rarity ?? null,
    printed_identity_modifier: parent?.printed_identity_modifier ?? null,
    image_source: clean(parent?.image_source),
    image_path: clean(parent?.image_path),
    image_url: clean(parent?.image_url),
    image_alt_url: clean(parent?.image_alt_url),
    representative_image_url: clean(parent?.representative_image_url),
    image_status: clean(parent?.image_status),
    image_note: clean(parent?.image_note),
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
  return `# Image Truth V1 IMG-16A SVP085 Finish Cleanup + Image Dry Run

This is a rollback-only dry-run package for the Grey Felt Hat Pikachu \`GV-PK-PR-SV-085\` issue visible in Explore.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- storage_uploads_performed: ${report.storage_uploads_performed}
- migrations_created: ${report.migrations_created}
- parent_writes_performed: ${report.parent_writes_performed}
- rollback_completed: ${report.rollback_completed}

## Summary

- master_supports_exactly_normal: ${report.master_evidence.supports_exactly_normal}
- unsupported_child_delete_candidates: ${report.unsupported_child_delete_candidates}
- unsupported_children_deleted_in_dry_run: ${report.unsupported_children_deleted_in_dry_run}
- supported_child_image_updated_in_dry_run: ${report.supported_child_image_updated_in_dry_run}
- dependency_rows_on_delete_candidates: ${report.dependency_rows_on_delete_candidates}
- proof_hash: \`${report.proof_hash}\`

## Master Evidence

${markdownTable(report.master_evidence.grey_felt_printings, [
  { label: 'set', value: (row) => row.set_key },
  { label: 'number', value: (row) => row.card_number },
  { label: 'card', value: (row) => row.card_name },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'status', value: (row) => row.status },
  { label: 'sources', value: (row) => (row.sources ?? []).join(', ') },
])}

## Unsupported Children

${markdownTable(report.unsupported_children, [
  { label: 'dry run', value: (row) => row.dry_run_status },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'dependencies', value: (row) => row.dependency_count },
])}

## Supported Child Image

${markdownTable([report.supported_child_image], [
  { label: 'dry run', value: (row) => row.dry_run_status },
  { label: 'printing', value: (row) => row.printing_gv_id },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'image status', value: (row) => row.proposed_image_status },
  { label: 'storage path', value: (row) => row.proposed_image_path },
  { label: 'source', value: (row) => row.source_url },
])}
`;
}

async function main() {
  const connectionString = requireDbUrl();
  if (!connectionString) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for rollback-only dry-run.');

  const masterEvidence = await loadMasterEvidence();
  const asset = await verifyLocalAsset();
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let rollbackCompleted = false;
  const unsupportedChildIds = TARGET.unsupported_children.map((row) => row.child_id);
  const unsupportedById = new Map(TARGET.unsupported_children.map((row) => [row.child_id, row]));

  try {
    await client.query('begin');
    const before = await fetchCurrentTarget(client);
    const parentBeforeHash = proofHash(parentSnapshot(before.parent));
    const deps = await dependencyCounts(client, unsupportedChildIds);
    const dependencyRowsOnDeleteCandidates = deps.reduce((sum, row) => sum + row.count, 0);

    const validationErrors = [];
    if (!masterEvidence.supports_exactly_normal) validationErrors.push('master_index_does_not_support_exactly_normal');
    if (!asset.matches_expected) validationErrors.push('local_asset_hash_or_size_mismatch');
    if (!before.parent || before.parent.id !== TARGET.parent_id) validationErrors.push('target_parent_not_found');
    if (before.parent?.gv_id !== TARGET.parent_gv_id) validationErrors.push('target_parent_gv_id_mismatch');
    if (dependencyRowsOnDeleteCandidates !== 0) validationErrors.push('delete_candidate_dependencies_present');

    const currentSupported = before.children.find((row) => row.id === TARGET.supported_child_id);
    if (!currentSupported) validationErrors.push('supported_child_not_found');
    if (currentSupported?.printing_gv_id !== TARGET.supported_printing_gv_id) validationErrors.push('supported_printing_gv_id_mismatch');
    if (currentSupported?.finish_key !== TARGET.supported_finish_key) validationErrors.push('supported_finish_key_mismatch');

    const unsupportedChildren = [];
    for (const childId of unsupportedChildIds) {
      const expected = unsupportedById.get(childId);
      const current = before.children.find((row) => row.id === childId);
      const dependencyCount = deps
        .filter((row) => row.count > 0)
        .reduce((sum, row) => sum + row.count, 0);
      const rowErrors = [];
      if (!current) rowErrors.push('unsupported_child_not_found');
      if (current?.printing_gv_id !== expected.printing_gv_id) rowErrors.push('printing_gv_id_mismatch');
      if (current?.finish_key !== expected.finish_key) rowErrors.push('finish_key_mismatch');
      if (dependencyRowsOnDeleteCandidates !== 0) rowErrors.push('dependency_rows_present');
      unsupportedChildren.push({
        ...expected,
        dependency_count: dependencyCount,
        dry_run_status: rowErrors.length === 0 && validationErrors.length === 0 ? 'ready' : 'blocked',
        validation_errors: rowErrors,
      });
    }

    let deletedCount = 0;
    let imageUpdateCount = 0;
    let supportedChildAfter = null;
    if (validationErrors.length === 0 && unsupportedChildren.every((row) => row.validation_errors.length === 0)) {
      const deleteResult = await client.query(
        `
          delete from public.card_printings
          where id = any($1::uuid[])
          returning id, printing_gv_id, finish_key
        `,
        [unsupportedChildIds],
      );
      deletedCount = deleteResult.rowCount;

      const note = `${PACKAGE_ID}:${TARGET.exact_image.source_key}:${TARGET.exact_image.source_url}`;
      const updateResult = await client.query(
        `
          update public.card_printings
          set image_source = $2,
              image_path = $3,
              image_status = $4,
              image_note = $5
          where id = $1
            and image_path is null
            and (image_url is null or btrim(image_url) = '')
            and (image_alt_url is null or btrim(image_alt_url) = '')
          returning id, printing_gv_id, finish_key, image_source, image_path, image_url, image_alt_url, image_status, image_note
        `,
        [
          TARGET.supported_child_id,
          'identity',
          TARGET.exact_image.planned_storage_path,
          'exact',
          note,
        ],
      );
      imageUpdateCount = updateResult.rowCount;
      supportedChildAfter = updateResult.rows[0] ?? null;
    }

    const after = await fetchCurrentTarget(client);
    const parentAfterHash = proofHash(parentSnapshot(after.parent));
    await client.query('rollback');
    rollbackCompleted = true;

    const supportedChildImage = {
      child_id: TARGET.supported_child_id,
      printing_gv_id: TARGET.supported_printing_gv_id,
      finish_key: TARGET.supported_finish_key,
      dry_run_status: imageUpdateCount === 1 && parentBeforeHash === parentAfterHash ? 'rollback_update_verified' : 'blocked',
      proposed_image_source: 'identity',
      proposed_image_path: TARGET.exact_image.planned_storage_path,
      proposed_image_status: 'exact',
      source_url: TARGET.exact_image.source_url,
      local_asset: asset,
    };

    const proof = {
      package_id: PACKAGE_ID,
      master_evidence: masterEvidence,
      unsupported_children: unsupportedChildren.map((row) => ({
        child_id: row.child_id,
        printing_gv_id: row.printing_gv_id,
        finish_key: row.finish_key,
        dry_run_status: row.dry_run_status,
        validation_errors: row.validation_errors,
      })),
      supported_child_image: supportedChildImage,
      unsupported_children_deleted_in_dry_run: deletedCount,
      supported_child_image_updated_in_dry_run: imageUpdateCount,
      parent_unchanged: parentBeforeHash === parentAfterHash,
      validation_errors: validationErrors,
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
      parent_writes_performed: false,
      rollback_completed: rollbackCompleted,
      master_evidence: masterEvidence,
      local_asset: asset,
      unsupported_child_delete_candidates: TARGET.unsupported_children.length,
      unsupported_children_deleted_in_dry_run: deletedCount,
      supported_child_image_updated_in_dry_run: imageUpdateCount,
      dependency_rows_on_delete_candidates: dependencyRowsOnDeleteCandidates,
      dependency_counts: deps,
      parent_unchanged_in_dry_run: parentBeforeHash === parentAfterHash,
      validation_errors: validationErrors,
      unsupported_children: unsupportedChildren.map((row) => ({
        ...row,
        dry_run_status: deletedCount === TARGET.unsupported_children.length && row.dry_run_status === 'ready'
          ? 'rollback_delete_verified'
          : row.dry_run_status,
      })),
      supported_child_image: supportedChildImage,
      supported_child_after_dry_run: supportedChildAfter,
      proof_hash: proofHash(proof),
    };

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      unsupported_children_deleted_in_dry_run: report.unsupported_children_deleted_in_dry_run,
      supported_child_image_updated_in_dry_run: report.supported_child_image_updated_in_dry_run,
      dependency_rows_on_delete_candidates: report.dependency_rows_on_delete_candidates,
      proof_hash: report.proof_hash,
      db_writes_performed: report.db_writes_performed,
      storage_uploads_performed: report.storage_uploads_performed,
      migrations_created: report.migrations_created,
    }, null, 2));
  } finally {
    if (!rollbackCompleted) {
      try { await client.query('rollback'); } catch { /* ignore */ }
    }
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
