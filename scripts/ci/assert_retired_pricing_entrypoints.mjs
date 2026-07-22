import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const entrypoints = [
  'supabase/functions/import-prices/index.ts',
  'supabase/functions/import-prices-v3/index.ts',
  'supabase/functions/import-prices-bridge/index.ts',
];

const forbidden = [
  ['legacy RPC name', /admin\s*\.\s*import_prices_do/i],
  ['Supabase client construction', /createClient\s*\(/],
  ['RPC invocation', /\.rpc\s*\(/],
  ['database connection string', /DATABASE_URL|SUPABASE_DB_URL/],
  ['privileged credential', /SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY/],
  ['legacy run branch', /mode\s*===?\s*["']run["']/],
  ['legacy debug branch', /mode\s*===?\s*["']env_debug["']/],
];

const failures = [];

for (const relativePath of entrypoints) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: file is missing`);
    continue;
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  const required = [
    ['retired entrypoint banner', /RETIRED PRICING ENTRYPOINT/],
    ['explicit health mode', /mode\s*===?\s*["']health["']/],
    ['retired response marker', /pipeline:\s*["']retired["']/],
    ['disabled response reason', /legacy-pricing-pipeline-disabled/],
    ['gone response status', /},\s*410\s*\);/],
  ];

  for (const [label, pattern] of required) {
    if (!pattern.test(source)) failures.push(`${relativePath}: missing ${label}`);
  }

  for (const [label, pattern] of forbidden) {
    if (pattern.test(source)) failures.push(`${relativePath}: contains forbidden ${label}`);
  }
}

if (failures.length) {
  console.error('[retired-pricing-guard] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `[retired-pricing-guard] OK: ${entrypoints.length} entrypoints are health-only and database-free`,
);
