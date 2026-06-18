import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTsModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
  }).outputText;

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    process,
    require,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: relativePath });
  return module.exports;
}

test('Grookai user entitlements resolve founder, vendor, premium, free, and anonymous tiers centrally', () => {
  const {
    GROOKAI_ENTITLEMENT_VERSION,
    resolveStaticGrookaiUserEntitlement,
    resolveDatabaseGrookaiUserEntitlement,
  } = loadTsModule('../../apps/web/src/lib/entitlements/grookaiUserEntitlements.ts');

  const anonymous = resolveStaticGrookaiUserEntitlement({ user: null, env: {} });
  assert.equal(anonymous.version, GROOKAI_ENTITLEMENT_VERSION);
  assert.equal(anonymous.tier, 'anonymous');
  assert.equal(anonymous.capabilities.canUseSearch, false);
  assert.equal(anonymous.capabilities.canUseAssistant, false);

  const free = resolveStaticGrookaiUserEntitlement({
    user: { id: 'user-free', email: 'collector@example.com' },
    env: {},
  });
  assert.equal(free.tier, 'free');
  assert.equal(free.role, 'collector');
  assert.equal(free.capabilities.canUseSearch, true);
  assert.equal(free.capabilities.canUseAssistant, false);
  assert.equal(free.capabilities.canUseVendorTools, false);

  const founder = resolveStaticGrookaiUserEntitlement({
    user: { id: 'founder-user', email: 'ccabrl@gmail.com' },
    env: {},
  });
  assert.equal(founder.tier, 'founder_admin');
  assert.equal(founder.role, 'founder');
  assert.equal(founder.source, 'env_founder_allowlist');
  assert.equal(founder.capabilities.canUseAssistant, true);
  assert.equal(founder.capabilities.canUseVendorTools, true);
  assert.equal(founder.capabilities.canUseFounderTools, true);
  assert.equal(founder.capabilities.canRunCatalogAudits, true);

  const vendor = resolveStaticGrookaiUserEntitlement({
    user: { id: 'vendor-user', email: 'seller@example.com' },
    env: { GROOKAI_VENDOR_EMAILS: 'seller@example.com' },
  });
  assert.equal(vendor.tier, 'vendor');
  assert.equal(vendor.capabilities.canUseVendorTools, true);
  assert.equal(vendor.capabilities.canUseGrookaiIntelligence, true);
  assert.equal(vendor.capabilities.canUseFounderTools, false);

  const premium = resolveStaticGrookaiUserEntitlement({
    user: { id: 'premium-user', email: 'subscriber@example.com' },
    env: { GROOKAI_PREMIUM_EMAILS: 'subscriber@example.com' },
  });
  assert.equal(premium.tier, 'premium');
  assert.equal(premium.capabilities.canUseAssistant, true);
  assert.equal(premium.capabilities.canUseVendorTools, false);

  const databaseVendor = resolveDatabaseGrookaiUserEntitlement({
    user: { id: 'database-user', email: 'database@example.com' },
    record: {
      user_id: 'database-user',
      email: 'database@example.com',
      tier: 'vendor_power_user',
      role: null,
      features: { catalog_audits: true, ignored_non_boolean: 'yes' },
      is_active: true,
    },
  });
  assert.equal(databaseVendor.tier, 'vendor');
  assert.equal(databaseVendor.source, 'database');
  assert.equal(databaseVendor.role, 'vendor');
  assert.equal(Object.keys(databaseVendor.features).length, 1);
  assert.equal(databaseVendor.features.catalog_audits, true);
  assert.equal(databaseVendor.capabilities.canUseVendorTools, true);
  assert.equal(databaseVendor.capabilities.canRunCatalogAudits, true);

  const inactive = resolveDatabaseGrookaiUserEntitlement({
    user: { id: 'inactive-user', email: 'inactive@example.com' },
    record: {
      user_id: 'inactive-user',
      email: 'inactive@example.com',
      tier: 'founder_admin',
      is_active: false,
    },
  });
  assert.equal(inactive, null);
});

test('Grookai user entitlement migration creates governed access table and founder bootstrap', () => {
  const migration = readFileSync(
    new URL('../../supabase/migrations/20260618120000_user_entitlements_v1.sql', import.meta.url),
    'utf8',
  );

  assert.match(migration, /create table if not exists public\.user_entitlements/i);
  assert.match(migration, /alter table public\.user_entitlements enable row level security/i);
  assert.match(migration, /tier in \('free', 'premium', 'vendor', 'founder_admin'\)/i);
  assert.match(migration, /role in \('collector', 'subscriber', 'vendor', 'founder', 'internal'\)/i);
  assert.match(migration, /grant select on table public\.user_entitlements to authenticated/i);
  assert.match(migration, /create policy user_entitlements_read_own/i);
  assert.match(migration, /create policy user_entitlements_service_role_all/i);
  assert.match(migration, /'ccabrl@gmail\.com'/i);
  assert.match(migration, /'founder_admin'/i);
  assert.match(migration, /'grookai_intelligence', true/i);
});
