import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const REPORT_JSON = path.join(REPORT_DIR, 'image_truth_img17a_svp085_duplicate_parent_cleanup_result_v1.json');
const REPORT_MD = path.join(REPORT_DIR, 'image_truth_img17a_svp085_duplicate_parent_cleanup_result_v1.md');

const PACKAGE = 'IMG-17A-SVP085-DUPLICATE-PARENT-CLEANUP';
const CANONICAL_GV_ID = 'GV-PK-PR-SV-085';
const DUPLICATE_GV_ID = 'GV-PK-PR-SV-85';

const APPLY = process.argv.includes('--apply');
const FINGERPRINT_ARG = getArgValue('--fingerprint');

const ALLOWED_PARENT_DEPENDENCIES = new Set([
  'public.card_print_identity.card_print_id',
  'public.card_print_species.card_print_id',
  'public.card_print_traits.card_print_id',
  'public.card_printings.card_print_id',
  'public.external_mappings.card_print_id',
]);

const ALLOWED_CHILD_DEPENDENCIES = new Set([]);

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function qident(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function countDependency(client, schema, table, column, id) {
  const sql = `select count(*)::int as count from ${qident(schema)}.${qident(table)} where ${qident(column)} = $1`;
  const { rows } = await client.query(sql, [id]);
  return rows[0]?.count ?? 0;
}

async function getForeignKeyDependencies(client, targetTable) {
  const { rows } = await client.query(
    `
      select
        ns.nspname as schema_name,
        rel.relname as table_name,
        att.attname as column_name
      from pg_constraint con
      join pg_class target on target.oid = con.confrelid
      join pg_namespace target_ns on target_ns.oid = target.relnamespace
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
      join unnest(con.conkey) with ordinality as keys(attnum, ord) on true
      join pg_attribute att on att.attrelid = rel.oid and att.attnum = keys.attnum
      where con.contype = 'f'
        and target_ns.nspname = 'public'
        and target.relname = $1
      order by ns.nspname, rel.relname, att.attname
    `,
    [targetTable],
  );
  return rows;
}

async function collectDependencyCounts(client, tableName, id) {
  const dependencies = await getForeignKeyDependencies(client, tableName);
  const counts = [];
  for (const dependency of dependencies) {
    const count = await countDependency(
      client,
      dependency.schema_name,
      dependency.table_name,
      dependency.column_name,
      id,
    );
    if (count > 0) {
      counts.push({
        key: `${dependency.schema_name}.${dependency.table_name}.${dependency.column_name}`,
        schema_name: dependency.schema_name,
        table_name: dependency.table_name,
        column_name: dependency.column_name,
        count,
      });
    }
  }
  return counts;
}

async function fetchParents(client) {
  const { rows } = await client.query(
    `
      select id, gv_id, name, set_code, number, number_plain, external_ids
      from public.card_prints
      where gv_id = any($1::text[])
      order by gv_id
      for update
    `,
    [[CANONICAL_GV_ID, DUPLICATE_GV_ID]],
  );
  return {
    canonical: rows.find((row) => row.gv_id === CANONICAL_GV_ID),
    duplicate: rows.find((row) => row.gv_id === DUPLICATE_GV_ID),
    rows,
  };
}

function assertParentShape(canonical, duplicate) {
  const blockers = [];
  if (!canonical) blockers.push(`missing canonical parent ${CANONICAL_GV_ID}`);
  if (!duplicate) blockers.push(`missing duplicate parent ${DUPLICATE_GV_ID}`);
  if (!canonical || !duplicate) return blockers;
  if (canonical.name !== duplicate.name) blockers.push('parent names differ');
  if (canonical.set_code !== 'svp' || duplicate.set_code !== 'svp') blockers.push('expected both parents in svp');
  if (canonical.number !== '085') blockers.push(`canonical number is ${canonical.number}, expected 085`);
  if (duplicate.number !== '85') blockers.push(`duplicate number is ${duplicate.number}, expected 85`);
  return blockers;
}

async function transferExternalMappings(client, duplicateId, canonicalId) {
  const before = await client.query(
    `
      select id, source, external_id, meta, active
      from public.external_mappings
      where card_print_id = $1
      order by source, external_id
    `,
    [duplicateId],
  );

  const transferred = [];
  const skipped = [];
  for (const mapping of before.rows) {
    const conflict = await client.query(
      `
        select id
        from public.external_mappings
        where source = $1 and external_id = $2 and card_print_id <> $3
        limit 1
      `,
      [mapping.source, mapping.external_id, duplicateId],
    );
    if (conflict.rowCount > 0) {
      skipped.push({ ...mapping, reason: 'source_external_id_already_owned' });
      continue;
    }
    await client.query(
      `
        update public.external_mappings
        set card_print_id = $1
        where id = $2
      `,
      [canonicalId, mapping.id],
    );
    transferred.push(mapping);
  }

  return { transferred, skipped };
}

async function transferTraits(client, duplicateId, canonicalId) {
  const { rows } = await client.query(
    `
      select *
      from public.card_print_traits
      where card_print_id = $1
      order by trait_type, trait_value, source
    `,
    [duplicateId],
  );

  const inserted = [];
  const duplicates = [];
  for (const trait of rows) {
    const insert = await client.query(
      `
        insert into public.card_print_traits
          (card_print_id, trait_type, trait_value, source, confidence, hp, national_dex, types, rarity, supertype, card_category, legacy_rarity)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        on conflict (card_print_id, trait_type, trait_value, source) do nothing
        returning id, trait_type, trait_value, source
      `,
      [
        canonicalId,
        trait.trait_type,
        trait.trait_value,
        trait.source,
        trait.confidence,
        trait.hp,
        trait.national_dex,
        trait.types,
        trait.rarity,
        trait.supertype,
        trait.card_category,
        trait.legacy_rarity,
      ],
    );
    if (insert.rowCount > 0) inserted.push(insert.rows[0]);
    else duplicates.push({ trait_type: trait.trait_type, trait_value: trait.trait_value, source: trait.source });
  }

  await client.query('delete from public.card_print_traits where card_print_id = $1', [duplicateId]);
  return { inserted, duplicates, source_count: rows.length };
}

async function transferSpecies(client, duplicateId, canonicalId) {
  const { rows } = await client.query(
    `
      select *
      from public.card_print_species
      where card_print_id = $1
      order by species_id, role
    `,
    [duplicateId],
  );

  const inserted = [];
  const duplicates = [];
  for (const species of rows) {
    const insert = await client.query(
      `
        insert into public.card_print_species
          (card_print_id, species_id, role, counts_for_completion, source, confidence, evidence, active)
        values
          ($1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (card_print_id, species_id, role) where active = true do nothing
        returning id, species_id, role
      `,
      [
        canonicalId,
        species.species_id,
        species.role,
        species.counts_for_completion,
        species.source,
        species.confidence,
        species.evidence,
        species.active,
      ],
    );
    if (insert.rowCount > 0) inserted.push(insert.rows[0]);
    else duplicates.push({ species_id: species.species_id, role: species.role });
  }

  await client.query('delete from public.card_print_species where card_print_id = $1', [duplicateId]);
  return { inserted, duplicates, source_count: rows.length };
}

async function cleanupDuplicate(client, duplicateId) {
  const childRows = await client.query(
    `
      select id, printing_gv_id, finish_key, image_status, image_source, image_path
      from public.card_printings
      where card_print_id = $1
      order by printing_gv_id
    `,
    [duplicateId],
  );
  const identityRows = await client.query(
    `
      select id, identity_domain, set_code_identity, printed_number, is_active
      from public.card_print_identity
      where card_print_id = $1
      order by is_active desc, created_at
    `,
    [duplicateId],
  );

  await client.query('delete from public.card_printings where card_print_id = $1', [duplicateId]);
  await client.query('delete from public.card_print_identity where card_print_id = $1', [duplicateId]);
  const parentDelete = await client.query('delete from public.card_prints where id = $1', [duplicateId]);

  return {
    child_rows_deleted: childRows.rowCount,
    deleted_children: childRows.rows,
    identity_rows_deleted: identityRows.rowCount,
    deleted_identities: identityRows.rows,
    parent_rows_deleted: parentDelete.rowCount,
  };
}

async function main() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const result = {
    package: PACKAGE,
    mode: APPLY ? 'apply' : 'dry_run',
    canonical_gv_id: CANONICAL_GV_ID,
    duplicate_gv_id: DUPLICATE_GV_ID,
    db_writes_performed: false,
    migrations_created: false,
    parent_overwrite_performed: false,
    blockers: [],
  };

  try {
    await client.query('begin');

    const { canonical, duplicate } = await fetchParents(client);
    result.parents = { canonical, duplicate };
    result.blockers.push(...assertParentShape(canonical, duplicate));

    if (canonical && duplicate) {
      const duplicateParentDependencies = await collectDependencyCounts(client, 'card_prints', duplicate.id);
      const duplicateChildren = await client.query('select id from public.card_printings where card_print_id = $1', [duplicate.id]);
      const duplicateChildDependencies = [];
      for (const child of duplicateChildren.rows) {
        const counts = await collectDependencyCounts(client, 'card_printings', child.id);
        duplicateChildDependencies.push({ child_printing_id: child.id, counts });
      }

      result.dependency_counts = {
        duplicate_parent: duplicateParentDependencies,
        duplicate_children: duplicateChildDependencies,
      };

      const unexpectedParentDependencies = duplicateParentDependencies.filter(
        (entry) => !ALLOWED_PARENT_DEPENDENCIES.has(entry.key),
      );
      const unexpectedChildDependencies = duplicateChildDependencies.flatMap((child) =>
        child.counts
          .filter((entry) => !ALLOWED_CHILD_DEPENDENCIES.has(entry.key))
          .map((entry) => ({ child_printing_id: child.child_printing_id, ...entry })),
      );

      if (unexpectedParentDependencies.length > 0) {
        result.blockers.push('unexpected duplicate parent dependencies');
        result.unexpected_parent_dependencies = unexpectedParentDependencies;
      }
      if (unexpectedChildDependencies.length > 0) {
        result.blockers.push('unexpected duplicate child dependencies');
        result.unexpected_child_dependencies = unexpectedChildDependencies;
      }

      if (result.blockers.length === 0) {
        result.external_mappings = await transferExternalMappings(client, duplicate.id, canonical.id);
        if (result.external_mappings.skipped.length > 0) {
          result.blockers.push('external mapping conflict during transfer');
        }

        result.traits = await transferTraits(client, duplicate.id, canonical.id);
        result.species = await transferSpecies(client, duplicate.id, canonical.id);
        result.cleanup = await cleanupDuplicate(client, duplicate.id);

        const post = await client.query(
          `
            select
              count(*) filter (where gv_id = $1)::int as canonical_parent_rows,
              count(*) filter (where gv_id = $2)::int as duplicate_parent_rows
            from public.card_prints
            where gv_id = any($3::text[])
          `,
          [CANONICAL_GV_ID, DUPLICATE_GV_ID, [CANONICAL_GV_ID, DUPLICATE_GV_ID]],
        );
        const childPost = await client.query(
          `
            select printing_gv_id, finish_key, image_status, image_source
            from public.card_printings
            where card_print_id = $1
            order by printing_gv_id
          `,
          [canonical.id],
        );
        result.post_verify = {
          ...post.rows[0],
          canonical_children: childPost.rows,
        };
      }
    }

    const proofPayload = {
      package: result.package,
      canonical_gv_id: result.canonical_gv_id,
      duplicate_gv_id: result.duplicate_gv_id,
      blockers: result.blockers,
      external_mappings_transferred: result.external_mappings?.transferred?.length ?? 0,
      traits_inserted: result.traits?.inserted?.length ?? 0,
      species_inserted: result.species?.inserted?.length ?? 0,
      child_rows_deleted: result.cleanup?.child_rows_deleted ?? 0,
      identity_rows_deleted: result.cleanup?.identity_rows_deleted ?? 0,
      parent_rows_deleted: result.cleanup?.parent_rows_deleted ?? 0,
      post_verify: result.post_verify ?? null,
    };
    result.proof_hash = sha256(proofPayload);

    if (APPLY) {
      if (!FINGERPRINT_ARG) {
        result.blockers.push('missing --fingerprint for apply');
      } else if (FINGERPRINT_ARG !== result.proof_hash) {
        result.blockers.push('fingerprint mismatch');
        result.expected_fingerprint = result.proof_hash;
        result.provided_fingerprint = FINGERPRINT_ARG;
      }
    }

    if (result.blockers.length > 0) {
      await client.query('rollback');
    } else if (APPLY) {
      await client.query('commit');
      result.db_writes_performed = true;
    } else {
      await client.query('rollback');
    }
  } catch (error) {
    await client.query('rollback').catch(() => {});
    result.blockers.push(error.message);
    result.error = {
      message: error.message,
      stack: error.stack,
    };
  } finally {
    await client.end();
  }

  const status = result.blockers.length === 0 ? (APPLY ? 'APPLIED' : 'DRY_RUN_READY') : 'BLOCKED';
  result.status = status;

  await fs.writeFile(REPORT_JSON, `${JSON.stringify(result, null, 2)}\n`);
  await fs.writeFile(
    REPORT_MD,
    [
      `# ${PACKAGE}`,
      '',
      `Status: ${status}`,
      `Mode: ${result.mode}`,
      `Canonical: ${CANONICAL_GV_ID}`,
      `Duplicate: ${DUPLICATE_GV_ID}`,
      `Proof hash: ${result.proof_hash ?? 'n/a'}`,
      '',
      '## Result',
      '',
      `- DB writes performed: ${result.db_writes_performed}`,
      `- Migrations created: ${result.migrations_created}`,
      `- Parent overwrite performed: ${result.parent_overwrite_performed}`,
      `- External mappings transferred: ${result.external_mappings?.transferred?.length ?? 0}`,
      `- Traits inserted on canonical: ${result.traits?.inserted?.length ?? 0}`,
      `- Species inserted on canonical: ${result.species?.inserted?.length ?? 0}`,
      `- Duplicate child rows deleted: ${result.cleanup?.child_rows_deleted ?? 0}`,
      `- Duplicate identity rows deleted: ${result.cleanup?.identity_rows_deleted ?? 0}`,
      `- Duplicate parent rows deleted: ${result.cleanup?.parent_rows_deleted ?? 0}`,
      '',
      '## Blockers',
      '',
      ...(result.blockers.length > 0 ? result.blockers.map((item) => `- ${item}`) : ['- none']),
      '',
    ].join('\n'),
  );

  console.log(JSON.stringify(result, null, 2));
  if (result.blockers.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
