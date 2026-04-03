import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const OUTPUT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'identity_verify_v1.json',
);

function ensureOutputDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'identity_verify_v1',
  });

  await client.connect();

  try {
    const [
      totalActiveRowsResult,
      countsByDomainResult,
      duplicateCardPrintGroupsResult,
      duplicateDomainHashGroupsResult,
      nullRequiredFieldsResult,
      tcgPocketIdentityRowsResult,
      parentDomainMismatchRowsResult,
      sampleRowsResult,
    ] = await Promise.all([
      client.query(`
        select count(*)::int as active_row_count
        from public.card_print_identity
        where is_active = true
      `),
      client.query(`
        select
          identity_domain,
          count(*)::int as row_count
        from public.card_print_identity
        where is_active = true
        group by identity_domain
        order by identity_domain
      `),
      client.query(`
        select
          card_print_id,
          count(*)::int as row_count
        from public.card_print_identity
        where is_active = true
        group by card_print_id
        having count(*) > 1
        order by row_count desc, card_print_id
      `),
      client.query(`
        select
          identity_domain,
          identity_key_hash,
          count(*)::int as row_count
        from public.card_print_identity
        where is_active = true
        group by identity_domain, identity_key_hash
        having count(*) > 1
        order by row_count desc, identity_domain, identity_key_hash
      `),
      client.query(`
        select
          sum(case when card_print_id is null then 1 else 0 end)::int as null_card_print_id_count,
          sum(case when identity_domain is null then 1 else 0 end)::int as null_identity_domain_count,
          sum(case when printed_number is null then 1 else 0 end)::int as null_printed_number_count,
          sum(case when set_code_identity is null then 1 else 0 end)::int as null_set_code_identity_count,
          sum(case when identity_key_version is null then 1 else 0 end)::int as null_identity_key_version_count,
          sum(case when identity_key_hash is null then 1 else 0 end)::int as null_identity_key_hash_count
        from public.card_print_identity
        where is_active = true
      `),
      client.query(`
        select count(*)::int as tcg_pocket_identity_row_count
        from public.card_print_identity
        where is_active = true
          and identity_domain = 'tcg_pocket_excluded'
      `),
      client.query(`
        select
          cpi.card_print_id,
          cp.gv_id,
          cp.identity_domain as card_print_identity_domain,
          cpi.identity_domain as active_identity_domain
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cp.identity_domain is distinct from cpi.identity_domain
        order by cpi.card_print_id
      `),
      client.query(`
        select
          cpi.card_print_id,
          cp.gv_id,
          cp.name,
          cp.identity_domain as card_print_identity_domain,
          cpi.identity_domain as active_identity_domain,
          cpi.set_code_identity,
          cpi.printed_number,
          cpi.identity_key_version,
          cpi.identity_key_hash,
          s.printed_set_abbrev
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        left join public.sets s
          on s.id = cp.set_id
        where cpi.is_active = true
        order by cpi.card_print_id
        limit 25
      `),
    ]);

    const totalActiveRows = totalActiveRowsResult.rows[0]?.active_row_count ?? 0;
    const nullRequiredFields = nullRequiredFieldsResult.rows[0] ?? {};
    const tcgPocketIdentityRowCount =
      tcgPocketIdentityRowsResult.rows[0]?.tcg_pocket_identity_row_count ?? 0;
    const parentDomainMismatchCount = parentDomainMismatchRowsResult.rows.length;
    const duplicateCardPrintCount = duplicateCardPrintGroupsResult.rows.length;
    const duplicateDomainHashCount = duplicateDomainHashGroupsResult.rows.length;
    const totalNullRequiredFieldCount = Object.values(nullRequiredFields).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0,
    );

    const output = {
      generated_at: new Date().toISOString(),
      total_active_identity_rows: totalActiveRows,
      counts_by_identity_domain: countsByDomainResult.rows,
      duplicate_active_card_print_groups: duplicateCardPrintGroupsResult.rows,
      duplicate_active_domain_hash_groups: duplicateDomainHashGroupsResult.rows,
      null_required_field_counts: nullRequiredFields,
      tcg_pocket_identity_row_count: tcgPocketIdentityRowCount,
      parent_domain_mismatch_count: parentDomainMismatchCount,
      parent_domain_mismatch_rows: parentDomainMismatchRowsResult.rows,
      sample_valid_rows: sampleRowsResult.rows,
    };

    ensureOutputDir(OUTPUT_PATH);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    console.log(JSON.stringify(output, null, 2));

    const failures = [];
    if (totalActiveRows <= 0) {
      failures.push('NO_ACTIVE_IDENTITY_ROWS');
    }
    if (duplicateCardPrintCount > 0) {
      failures.push(`DUPLICATE_ACTIVE_CARD_PRINT_GROUPS:${duplicateCardPrintCount}`);
    }
    if (duplicateDomainHashCount > 0) {
      failures.push(`DUPLICATE_ACTIVE_DOMAIN_HASH_GROUPS:${duplicateDomainHashCount}`);
    }
    if (totalNullRequiredFieldCount > 0) {
      failures.push(`NULL_REQUIRED_FIELDS:${totalNullRequiredFieldCount}`);
    }
    if (tcgPocketIdentityRowCount > 0) {
      failures.push(`TCG_POCKET_IDENTITIES_PRESENT:${tcgPocketIdentityRowCount}`);
    }
    if (parentDomainMismatchCount > 0) {
      failures.push(`PARENT_DOMAIN_MISMATCHES:${parentDomainMismatchCount}`);
    }

    if (failures.length > 0) {
      throw new Error(`IDENTITY_VERIFY_FAILED:${failures.join(',')}`);
    }
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
