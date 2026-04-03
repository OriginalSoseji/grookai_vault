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

async function run() {
  readAudit();

  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: 'domain_baseline_card_prints_v1',
  });

  await client.connect();

  try {
    await client.query('begin');

    const updateSql = `
      update public.card_prints cp
      set identity_domain = s.identity_domain_default
      from public.sets s
      where s.id = cp.set_id
        and s.identity_domain_default is not null
        and cp.identity_domain is distinct from s.identity_domain_default
      returning cp.id, cp.identity_domain
    `;
    const updated = await client.query(updateSql);

    const inventorySql = `
      select
        identity_domain,
        count(*)::int as row_count
      from public.card_prints
      group by identity_domain
      order by identity_domain
    `;
    const inventory = await client.query(inventorySql);

    const missing = await client.query(`
      select count(*)::int as missing_count
      from public.card_prints
      where identity_domain is null
    `);

    await client.query('commit');

    console.log(
      JSON.stringify(
        {
          updated_card_print_count: updated.rowCount,
          missing_identity_domain_count: missing.rows[0]?.missing_count ?? 0,
          counts_by_identity_domain: inventory.rows,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
