import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const migrationsDir = path.resolve('supabase/migrations');
const restored = [
  '20261008021000_vendor_purchase_v1.sql',
  '20261008060000_vendor_negotiated_trade_v1.sql',
  '20261008160000_vendor_discounts_v1.sql',
  '20261008170000_vendor_discount_cancellation_v1.sql',
  '20261008190000_vendor_sale_cost_corrections_v1.sql',
  '20261008220000_portfolio_history_v1.sql',
  '20261009010000_inventory_export_v1.sql',
  '20261009180000_price_targets_v1.sql',
  '20261009181000_price_target_delivery_boundary_v1.sql',
  '20261009190000_price_target_evaluation_audit_v1.sql',
];

test('production-only migration versions are restored locally for ledger alignment', () => {
  assert.equal(new Set(restored).size, restored.length);
  for (const migration of restored) {
    assert.ok(fs.existsSync(path.join(migrationsDir, migration)), migration);
  }
});
