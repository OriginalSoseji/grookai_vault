// Offline contract logic. Database RPCs must enforce these rules in a transaction;
// callers must not treat a returned plan as a persisted or authorized mutation.
import { createHash } from 'node:crypto';

export const OWNED_COLLECTIBLE_CONTRACT_V1 = 'OWNED_COLLECTIBLE_CONTRACT_V1';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURRENCY = /^[A-Z]{3}$/;
const seals = new Set(['factory_sealed', 'opened', 'unknown']);
const conditions = new Set(['undamaged', 'damaged', 'unknown']);

function requireThat(condition, code) {
  if (!condition) throw new Error(code);
}

function uuid(value, field) {
  requireThat(typeof value === 'string' && UUID.test(value), `invalid_${field}`);
  return value.toLowerCase();
}

function money(value, field, { positive = false } = {}) {
  requireThat(Number.isSafeInteger(value) && value >= (positive ? 1 : 0), `invalid_${field}`);
  return value;
}

function currency(value) {
  requireThat(typeof value === 'string' && CURRENCY.test(value), 'invalid_currency');
  return value;
}

function day(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date.getTime() / 86_400_000;
}

function optionalText(value, max, field) {
  if (value == null) return null;
  requireThat(typeof value === 'string', `invalid_${field}`);
  const text = value.trim();
  requireThat(text.length <= max, `invalid_${field}`);
  return text || null;
}

function boundPlan(plan) {
  // Explicit field order in each constructor makes retries stable. Persist this
  // binding with the request under a unique owner/request key in the future RPC.
  return Object.freeze({
    ...plan,
    payload_fingerprint: createHash('sha256').update(JSON.stringify(plan)).digest('hex'),
  });
}

export function resolveOwnedCollectibleTargetV1(row) {
  requireThat(row && typeof row === 'object' && !Array.isArray(row), 'invalid_instance');
  const anchors = [
    ['card', 'card_print_id'],
    ['slab', 'slab_cert_id'],
    ['sealed', 'sealed_product_variant_id'],
  ].filter(([, field]) => row[field] != null);
  requireThat(anchors.length === 1, 'exactly_one_identity_anchor_required');
  const [kind, field] = anchors[0];
  const id = uuid(row[field], field);
  requireThat(row.object_kind == null || row.object_kind === kind, 'object_kind_anchor_conflict');
  requireThat(kind === 'card' || row.card_printing_id == null, 'printing_requires_card');
  if (row.card_printing_id != null) uuid(row.card_printing_id, 'card_printing_id');
  if (kind === 'sealed') {
    requireThat(row.legacy_vault_item_id == null, 'sealed_cannot_use_card_bucket');
    requireThat(row.is_graded !== true && row.grade_company == null && row.grade_value == null && row.grade_label == null, 'sealed_cannot_use_slab_grade');
  }
  return Object.freeze({ kind, id, key: `${kind}:${id}`, card_printing_id: row.card_printing_id?.toLowerCase() ?? null });
}

export function planSealedVaultAdditionV1({ ownerId, requestId, product, quantity = 1, sealState = 'unknown', packageCondition = 'unknown', acquisitionCostMinor = null, acquisitionCurrency = null }) {
  const owner = uuid(ownerId, 'owner_id');
  const request = uuid(requestId, 'request_id');
  requireThat(product?.identity_status === 'released' && product?.game_visible === true, 'sealed_identity_not_available');
  const variant = uuid(product.variant_id, 'variant_id');
  requireThat(typeof product.game_key === 'string' && /^[a-z][a-z0-9_]*$/.test(product.game_key), 'invalid_game_key');
  requireThat(Number.isInteger(quantity) && quantity >= 1 && quantity <= 100, 'invalid_quantity');
  requireThat(seals.has(sealState), 'invalid_seal_state');
  requireThat(conditions.has(packageCondition), 'invalid_package_condition');
  requireThat((acquisitionCostMinor == null) === (acquisitionCurrency == null), 'acquisition_money_pair_required');
  if (acquisitionCostMinor != null) {
    money(acquisitionCostMinor, 'acquisition_cost_minor');
    currency(acquisitionCurrency);
  }
  return boundPlan({
    contract_version: OWNED_COLLECTIBLE_CONTRACT_V1,
    owner_id: owner, request_id: request, idempotency_scope: `${owner}:${request}`,
    object_kind: 'sealed', sealed_product_variant_id: variant, game_key: product.game_key,
    copy_count: quantity, seal_state: sealState, package_condition: packageCondition,
    acquisition_cost_per_copy_minor: acquisitionCostMinor, acquisition_currency: acquisitionCurrency,
    intent: 'hold', requires_transaction: true,
    // A quote or image is deliberately not an ownership admission requirement.
    creates_card_prints: false, creates_contents_inventory: false,
  });
}

function withheldReason(instance, target, quote, today, releaseIds) {
  if (target.kind === 'slab') return 'slab_pricing_not_supported';
  if (target.kind === 'card' && !target.card_printing_id) return 'printing_unassigned';
  if (target.kind === 'sealed' && (instance.seal_state !== 'factory_sealed' || instance.package_condition !== 'undamaged')) return 'sealed_condition_not_qualified';
  if (!quote) return 'missing_price';
  if (quote.object_kind !== target.kind || typeof quote.target_id !== 'string' || quote.target_id.toLowerCase() !== target.id) return 'price_identity_mismatch';
  if (target.kind === 'card' && (typeof quote.card_printing_id !== 'string' || quote.card_printing_id.toLowerCase() !== target.card_printing_id)) return 'price_printing_mismatch';
  if (target.kind === 'sealed' && quote.condition_basis !== 'factory_sealed_undamaged') return 'price_condition_mismatch';
  if (quote.source_provider !== 'tcgplayer' || quote.status !== 'qualified_exact') return 'price_not_qualified';
  if (typeof quote.release_id !== 'string' || !UUID.test(quote.release_id) || !releaseIds.has(quote.release_id.toLowerCase())) return 'price_release_not_active';
  if (typeof quote.qualification_id !== 'string' || !UUID.test(quote.qualification_id)) return 'price_evidence_missing';
  const observed = day(quote.observed_on);
  if (observed == null || observed > today || today - observed > 7) return 'price_not_fresh';
  if (!Number.isSafeInteger(quote.market_price_minor) || quote.market_price_minor <= 0 || typeof quote.currency !== 'string' || !CURRENCY.test(quote.currency)) return 'price_amount_invalid';
  return null;
}

export function summarizeOwnedCollectibleMarketV1({ ownerId, instances, quotesByInstanceId = new Map(), activeReleaseIds, asOf }) {
  const owner = uuid(ownerId, 'owner_id');
  const today = day(asOf);
  requireThat(today != null, 'invalid_as_of');
  requireThat(Array.isArray(instances) && quotesByInstanceId instanceof Map && Array.isArray(activeReleaseIds), 'invalid_summary_input');
  const releases = new Set(activeReleaseIds.map(id => uuid(id, 'release_id')));
  const seen = new Set();
  const totals = new Map();
  const subtotals = { card: new Map(), slab: new Map(), sealed: new Map() };
  const rows = [];
  let archivedCount = 0;
  for (const instance of instances) {
    const instanceId = uuid(instance.id, 'instance_id');
    requireThat(uuid(instance.user_id, 'user_id') === owner, 'owner_scope_mismatch');
    requireThat(!seen.has(instanceId), 'duplicate_owned_instance');
    seen.add(instanceId);
    const target = resolveOwnedCollectibleTargetV1(instance);
    if (instance.archived_at != null) {
      requireThat(typeof instance.archived_at === 'string' && Number.isFinite(Date.parse(instance.archived_at)), 'invalid_archived_at');
      archivedCount += 1;
      continue;
    }
    const quote = quotesByInstanceId.get(instanceId);
    const reason = withheldReason(instance, target, quote, today, releases);
    rows.push({ instance_id: instanceId, target, pricing_status: reason ? 'unpriced' : 'priced', reason });
    if (!reason) {
      const total = (totals.get(quote.currency) ?? 0) + quote.market_price_minor;
      requireThat(Number.isSafeInteger(total), 'total_exceeds_safe_integer');
      totals.set(quote.currency, total);
      const byKind = subtotals[target.kind];
      byKind.set(quote.currency, (byKind.get(quote.currency) ?? 0) + quote.market_price_minor);
    }
  }
  return {
    contract_version: OWNED_COLLECTIBLE_CONTRACT_V1,
    active_copy_count: rows.length,
    archived_copy_count: archivedCount,
    priced_copy_count: rows.filter(row => row.pricing_status === 'priced').length,
    unpriced_copy_count: rows.filter(row => row.pricing_status === 'unpriced').length,
    // Absence is not zero; currencies are never silently combined.
    market_totals_minor: Object.fromEntries([...totals].sort(([a], [b]) => a.localeCompare(b))),
    market_subtotals_minor_by_kind: Object.fromEntries(Object.entries(subtotals).map(([kind, values]) => [
      kind, Object.fromEntries([...values].sort(([a], [b]) => a.localeCompare(b))),
    ])),
    rows,
  };
}

export function planSealedCopyDispositionV1({ ownerId, requestId, instance, type, salePriceMinor = null, saleCurrency = null, counterparty = null, tradeReceived = null, cashDirection = null, cashAmountMinor = null, cashCurrency = null }) {
  const owner = uuid(ownerId, 'owner_id');
  const request = uuid(requestId, 'request_id');
  requireThat(instance && uuid(instance.user_id, 'user_id') === owner, 'instance_not_owned');
  const target = resolveOwnedCollectibleTargetV1(instance);
  requireThat(target.kind === 'sealed', 'sealed_instance_required');
  requireThat(instance.archived_at == null, 'instance_already_archived');
  const id = uuid(instance.id, 'instance_id');
  requireThat(typeof instance.gv_vi_id === 'string' && /^GVVI-[A-Z0-9-]+$/.test(instance.gv_vi_id), 'instance_missing_gvvi');
  requireThat(['sale', 'trade', 'remove'].includes(type), 'invalid_disposition_type');
  const party = optionalText(counterparty, 120, 'counterparty');
  const received = optionalText(tradeReceived, 1000, 'trade_received');
  if (type === 'sale') {
    money(salePriceMinor, 'sale_price_minor', { positive: true });
    currency(saleCurrency);
    requireThat(received == null && cashDirection == null && cashAmountMinor == null && cashCurrency == null, 'sale_trade_fields_not_allowed');
  } else if (type === 'trade') {
    requireThat(salePriceMinor == null && saleCurrency == null, 'trade_sale_fields_not_allowed');
    requireThat(received != null, 'trade_received_required');
    if (cashDirection == null) requireThat(cashAmountMinor == null && cashCurrency == null, 'trade_cash_pair_required');
    else {
      requireThat(['paid', 'received'].includes(cashDirection), 'invalid_cash_direction');
      money(cashAmountMinor, 'cash_amount_minor', { positive: true });
      currency(cashCurrency);
    }
  } else {
    requireThat([salePriceMinor, saleCurrency, party, received, cashDirection, cashAmountMinor, cashCurrency].every(v => v == null), 'remove_transaction_fields_not_allowed');
  }
  return boundPlan({
    contract_version: OWNED_COLLECTIBLE_CONTRACT_V1,
    request_id: request, owner_id: owner, idempotency_scope: `${owner}:${request}`,
    instance_id: id, gv_vi_id: instance.gv_vi_id,
    sealed_product_variant_id: target.id, type,
    sale_price_minor: salePriceMinor, sale_currency: saleCurrency,
    counterparty_label: party, trade_received_description: received,
    trade_cash_direction: cashDirection, trade_cash_minor: cashAmountMinor, trade_cash_currency: cashCurrency,
    archive_instance: true, withdraw_wall_listing: true, preserve_history: true,
    transfer_counterparty_ownership: false, create_received_inventory: false,
    requires_transaction: true,
  });
}
