import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const READINESS_JSON = 'docs/audits/card_row_enrichment_v1/external_mapping_duplicate_readiness_v1.json';
const APPROVED_FINGERPRINT = 'b4730cd8855bfe00578e26b310805c519686cc56cea1ca4c673fc72b0d71df0a';
const APPROVED_PROOF = '03240951eea3bc47a15f1000a90f251b7dc2b4c09918282624b8a938eab7cd1c';

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

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function numberToken(externalId) {
  return String(externalId).split('-').slice(1).join('-');
}

function chooseTarget(group) {
  const ids = group.external_ids;
  const parentNumber = String(group.number ?? group.number_plain ?? '').trim();
  const keepExternalId = ids.find((id) => numberToken(id).toLowerCase() === parentNumber.toLowerCase())
    ?? ids.slice().sort((a, b) => numberToken(a).length - numberToken(b).length || a.localeCompare(b))[0];
  const deactivateExternalIds = ids.filter((id) => id !== keepExternalId);
  if (deactivateExternalIds.length !== group.external_ids.length - 1) {
    throw new Error(`zero_padding_target_selection_failed:${group.card_print_id}`);
  }
  return {
    card_print_id: group.card_print_id,
    source: group.source,
    set_code: group.set_code,
    number: group.number,
    card_name: group.card_name,
    keep_external_id: keepExternalId,
    deactivate_external_ids: deactivateExternalIds,
  };
}

async function main() {
  const realApply = process.argv.includes('--apply');
  const outputJson = realApply
    ? 'docs/audits/card_row_enrichment_v1/enrich32a_pokemonapi_zero_padding_mapping_real_apply_v1.json'
    : 'docs/audits/card_row_enrichment_v1/enrich32a_pokemonapi_zero_padding_mapping_dry_run_v1.json';
  const outputMd = realApply
    ? 'docs/audits/card_row_enrichment_v1/enrich32a_pokemonapi_zero_padding_mapping_real_apply_v1.md'
    : 'docs/audits/card_row_enrichment_v1/enrich32a_pokemonapi_zero_padding_mapping_dry_run_v1.md';
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));
  const targets = readiness.ready_groups
    .filter((group) => group.readiness_class === 'pokemonapi_zero_padding_alias_ready')
    .map(chooseTarget)
    .sort((a, b) => `${a.set_code}|${a.number}|${a.card_name}`.localeCompare(`${b.set_code}|${b.number}|${b.card_name}`));

  if (targets.length !== 26) throw new Error(`unexpected_target_count:${targets.length}`);

  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL for guarded dry-run.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const fingerprint = sha256(stableJson({
      targets,
      readiness_fingerprint: readiness.fingerprint_sha256,
    }));
    if (realApply && fingerprint !== APPROVED_FINGERPRINT) {
      throw new Error(`approved_fingerprint_mismatch:${fingerprint}`);
    }
    const targetsJson = JSON.stringify(targets.flatMap((target) => target.deactivate_external_ids.map((externalId) => ({
      card_print_id: target.card_print_id,
      source: target.source,
      external_id: externalId,
    }))));

    let proof = null;
    await client.query('begin');
    let committed = false;
    try {
      const beforeResult = await client.query(`
        with targets as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(card_print_id uuid, source text, external_id text)
        )
        select count(*)::int as rows
        from public.external_mappings em
        join targets t
          on t.card_print_id = em.card_print_id
         and t.source = em.source
         and t.external_id = em.external_id
        where em.active is true
      `, [targetsJson]);

      const updatedResult = await client.query(`
        with targets as (
          select * from jsonb_to_recordset($1::jsonb)
          as x(card_print_id uuid, source text, external_id text)
        )
        update public.external_mappings em
           set active = false
        from targets t
        where t.card_print_id = em.card_print_id
          and t.source = em.source
          and t.external_id = em.external_id
          and em.active is true
        returning em.id
      `, [targetsJson]);

      const afterDebtResult = await client.query(`
        select count(*)::int as rows
        from (
          select source, card_print_id
          from public.external_mappings
          where active = true
          group by source, card_print_id
          having count(*) > 1
        ) dupes
      `);

      if (beforeResult.rows[0].rows !== targets.length) throw new Error('target_active_count_mismatch');
      if (updatedResult.rowCount !== targets.length) throw new Error('deactivated_count_mismatch');

      proof = {
        target_groups: targets.length,
        target_mapping_rows_active_before: beforeResult.rows[0].rows,
        mappings_deactivated: updatedResult.rowCount,
        remaining_source_card_duplicate_groups_after_transient_update: afterDebtResult.rows[0].rows,
      };
      const proofHash = sha256(stableJson(proof));
      if (realApply && proofHash !== APPROVED_PROOF) {
        throw new Error(`approved_proof_mismatch:${proofHash}`);
      }
      if (realApply) {
        await client.query('commit');
        committed = true;
      }
    } finally {
      if (!committed) await client.query('rollback');
    }

    const proofHash = sha256(stableJson(proof));
    const report = {
      version: realApply
        ? 'ENRICH32A_POKEMONAPI_ZERO_PADDING_MAPPING_REAL_APPLY_V1'
        : 'ENRICH32A_POKEMONAPI_ZERO_PADDING_MAPPING_DRY_RUN_V1',
      generated_at: new Date().toISOString(),
      scope: {
        rollback_only: !realApply,
        db_writes_persisted: realApply,
        migrations_created: false,
        source: 'pokemonapi',
        readiness_class: 'pokemonapi_zero_padding_alias_ready',
      },
      fingerprint_sha256: fingerprint,
      proof_sha256: proofHash,
      proof,
      targets,
      recommended_approval_phrase: `Approve real ENRICH-32A-POKEMONAPI-ZERO-PADDING-MAPPING-DEACTIVATION apply only. Fingerprint: ${fingerprint}. Dry-run proof: ${proofHash}. Scope: ${targets.length} PokemonAPI leading-zero duplicate mapping deactivations. No card_print writes. No child writes. No deletes. No migrations. No image writes. No global apply.`,
    };
    await fs.mkdir(path.dirname(outputJson), { recursive: true });
    await fs.writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);

    const md = [
      realApply
        ? '# ENRICH-32A PokemonAPI Zero Padding Mapping Real Apply V1'
        : '# ENRICH-32A PokemonAPI Zero Padding Mapping Dry Run V1',
      '',
      realApply
        ? 'Real apply report for deactivating only PokemonAPI duplicate external mappings where the duplicate is leading-zero formatting.'
        : 'Rollback-only proof for deactivating only PokemonAPI duplicate external mappings where the duplicate is leading-zero formatting.',
      '',
      '## Safety',
      '',
      `- Rollback only: ${!realApply}`,
      `- DB writes persisted: ${realApply}`,
      '- Migrations created: false',
      '- Card/child/image rows touched: false',
      '',
      '## Proof',
      '',
      markdownTable(Object.entries(proof).map(([key, value]) => ({ key, value })), [
        { label: 'metric', value: (row) => row.key },
        { label: 'value', value: (row) => row.value },
      ]),
      '',
      '## Targets',
      '',
      markdownTable(targets, [
        { label: 'set', value: (row) => row.set_code },
        { label: 'number', value: (row) => row.number },
        { label: 'name', value: (row) => row.card_name },
        { label: 'keep', value: (row) => row.keep_external_id },
        { label: 'deactivate', value: (row) => row.deactivate_external_ids.join(', ') },
      ]),
      '',
      `Fingerprint: \`${fingerprint}\``,
      '',
      `Dry-run proof: \`${proofHash}\``,
      '',
      '## Approval Phrase',
      '',
      `\`${report.recommended_approval_phrase}\``,
      '',
    ].join('\n');
    await fs.writeFile(outputMd, md);
    console.log(JSON.stringify({
      output_json: outputJson,
      output_md: outputMd,
      fingerprint_sha256: fingerprint,
      proof_sha256: proofHash,
      proof,
    }, null, 2));
  } finally {
    await client.end();
  }
}

await main();
