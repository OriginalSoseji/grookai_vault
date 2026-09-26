// Historical receipts continue to verify original bytes after the nineteen
// unapplied inputs are consolidated. Applied catalog files never use this archive.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const archive='docs/audits/storefront_production_package_v1';
export function readHistoricalStorefrontMigration(file){
  assert.equal(path.basename(file),file);
  const active=path.join('supabase/migrations',file);
  if(fs.existsSync(active))return fs.readFileSync(active);
  const plan=JSON.parse(fs.readFileSync(path.join(archive,'consolidation.json')));
  const entry=plan.inputs.find(r=>r.name===file);assert.ok(entry,`Unrecognized missing migration: ${file}`);
  const bytes=fs.readFileSync(path.join(archive,'historical_migrations',file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
  return bytes;
}
