import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const AUDIT_PATH = path.join(
  process.cwd(),
  'docs',
  'checkpoints',
  'identity_domain_classification_audit_v1.json',
);

function readAudit() {
  if (!fs.existsSync(AUDIT_PATH)) {
    throw new Error('IDENTITY_DOMAIN_CLASSIFICATION_AUDIT_MISSING');
  }

  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
  if (audit.ready_count !== 1230) {
    throw new Error(`IDENTITY_DOMAIN_AUDIT_READY_COUNT_MISMATCH:${audit.ready_count}`);
  }
  if (audit.blocked_unknown_domain_count !== 9383) {
    throw new Error(
      `IDENTITY_DOMAIN_AUDIT_BLOCKED_UNKNOWN_COUNT_MISMATCH:${audit.blocked_unknown_domain_count}`,
    );
  }

  return audit;
}

async function runQuery(client, label, sql) {
  try {
    return await client.query(sql);
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          step: label,
          sqlstate: error?.code ?? null,
          message: error?.message ?? String(error),
        },
        null,
        2,
      ),
    );
    throw error;
  }
}

async function run() {
  readAudit();

  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'domain_baseline_verify_v1',
  });

  await client.connect();

  try {
    const setsMissing = await runQuery(
      client,
      'sets_missing_domain_check',
      `
        select count(*)::int as missing_count
        from public.sets
        where identity_domain_default is null
      `,
    );
    const cardPrintsMissing = await runQuery(
      client,
      'card_prints_missing_domain_check',
      `
        select count(*)::int as missing_count
        from public.card_prints
        where identity_domain is null
      `,
    );
    const setDomains = await runQuery(
      client,
      'sets_domain_inventory',
      `
        select identity_domain_default, count(*)::int as row_count
        from public.sets
        group by identity_domain_default
        order by identity_domain_default
      `,
    );
    const cardPrintDomains = await runQuery(
      client,
      'card_prints_domain_inventory',
      `
        select identity_domain, count(*)::int as row_count
        from public.card_prints
        group by identity_domain
        order by identity_domain
      `,
    );
    const tcgPocketCheck = await runQuery(
      client,
      'tcg_pocket_classification_check',
      `
        select
          coalesce(
            sum(case when cp.identity_domain = 'tcg_pocket_excluded' then 1 else 0 end),
            0
          )::int as correctly_excluded_count,
          coalesce(
            sum(
              case
                when cp.identity_domain is distinct from 'tcg_pocket_excluded' then 1
                else 0
              end
            ),
            0
          )::int as misclassified_count
        from public.card_prints cp
        join public.sets s
          on s.id = cp.set_id
        where coalesce(s.source->>'domain', '') = 'tcg_pocket'
      `,
    );

    const missingSetCount = setsMissing.rows[0]?.missing_count ?? 0;
    const missingCardPrintCount = cardPrintsMissing.rows[0]?.missing_count ?? 0;
    const setDomainValues = setDomains.rows.map((row) => row.identity_domain_default).filter(Boolean);
    const cardPrintDomainValues = cardPrintDomains.rows.map((row) => row.identity_domain).filter(Boolean);

    const unexpectedSetDomains = setDomainValues.filter(
      (value) => !['pokemon_eng_standard', 'tcg_pocket_excluded'].includes(value),
    );
    const unexpectedCardPrintDomains = cardPrintDomainValues.filter(
      (value) => !['pokemon_eng_standard', 'tcg_pocket_excluded'].includes(value),
    );
    const misclassifiedTcgPocketCount = tcgPocketCheck.rows[0]?.misclassified_count ?? 0;

    const output = {
      total_sets: setDomains.rows.reduce((sum, row) => sum + row.row_count, 0),
      total_card_prints: cardPrintDomains.rows.reduce((sum, row) => sum + row.row_count, 0),
      missing_set_identity_domain_default_count: missingSetCount,
      missing_card_print_identity_domain_count: missingCardPrintCount,
      set_domain_inventory: setDomains.rows,
      card_print_domain_inventory: cardPrintDomains.rows,
      tcg_pocket_audit: tcgPocketCheck.rows[0],
    };

    console.log(JSON.stringify(output, null, 2));

    if (missingSetCount > 0 || missingCardPrintCount > 0) {
      throw new Error('DOMAIN_BASELINE_FAILED:NULL_DOMAIN_PRESENT');
    }
    if (misclassifiedTcgPocketCount > 0) {
      throw new Error('DOMAIN_BASELINE_FAILED:TCG_POCKET_MISCLASSIFIED');
    }
    if (unexpectedSetDomains.length > 0 || unexpectedCardPrintDomains.length > 0) {
      throw new Error('DOMAIN_BASELINE_FAILED:UNEXPECTED_DOMAIN_VALUES');
    }

    console.log('Baseline domain verified');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
