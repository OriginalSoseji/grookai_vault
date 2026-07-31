import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

const MIGRATION = read(
  "supabase/migrations/20260728133000_vault_exact_market_pricing_targets_v1.sql",
);
const WEB_EXACT_HELPER = read(
  "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
);
const WEB_VAULT = read(
  "apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts",
);
const WEB_OWNER = read("apps/web/src/lib/vault/getOwnerVaultItems.ts");
const WEB_GVVI = read("apps/web/src/lib/vault/getVaultInstanceByGvvi.ts");
const WEB_PUBLIC_GVVI = read(
  "apps/web/src/lib/vault/getPublicVaultInstanceByGvvi.ts",
);
const FLUTTER_PRICING = read(
  "lib/services/public/card_surface_pricing_service.dart",
);
const FLUTTER_VAULT = read("lib/main_vault.dart");
const FLUTTER_PUBLIC = read(
  "lib/services/public/public_collector_service.dart",
);
const FLUTTER_GVVI = read("lib/services/vault/vault_gvvi_service.dart");
const FLUTTER_EXACT = read("lib/services/vault/vault_exact_pricing.dart");
const PRODUCT_CONTRACT = read(
  "docs/contracts/TCGPLAYER_MARKET_PRICING_PRODUCT_V1.md",
);

test("ownership pricing targets expose exact raw printing identity and exclude slabs", () => {
  assert.match(
    MIGRATION,
    /create or replace view public\.v_vault_mobile_pricing_targets_v1/i,
  );
  assert.match(
    MIGRATION,
    /v_vault_mobile_pricing_targets_v1[\s\S]*security_barrier = true[\s\S]*security_invoker = false/i,
  );
  assert.match(
    MIGRATION,
    /vii\.slab_cert_id is null[\s\S]*vii\.card_print_id is not null/i,
  );
  assert.match(
    MIGRATION,
    /case\s+when vii\.slab_cert_id is null then vii\.card_printing_id\s+else null\s+end as card_printing_id/i,
  );
  assert.match(
    MIGRATION,
    /create or replace function public\.public_shared_card_pricing_targets_v1/i,
  );
  assert.match(
    MIGRATION,
    /shared\.is_shared = true[\s\S]*vii\.slab_cert_id is null/i,
  );
  assert.match(
    MIGRATION,
    /create function public\.vault_mobile_card_copies_v1[\s\S]*language plpgsql\s+security definer\s+set search_path = public/i,
  );
  assert.match(
    MIGRATION,
    /vault_mobile_instance_pricing_target_v1[\s\S]*language plpgsql\s+security definer\s+set search_path = public/i,
  );
});

test("private ownership target is authenticated-only and public targets are visibility-gated", () => {
  assert.match(
    MIGRATION,
    /revoke all on table public\.v_vault_mobile_pricing_targets_v1\s+from public, anon, authenticated, service_role/i,
  );
  assert.match(
    MIGRATION,
    /grant select on table public\.v_vault_mobile_pricing_targets_v1\s+to authenticated, service_role/i,
  );
  assert.match(
    MIGRATION,
    /public_profile_enabled = true[\s\S]*vault_sharing_enabled = true/i,
  );
  assert.match(
    MIGRATION,
    /grant execute on function public\.public_shared_card_pricing_targets_v1\(\s*uuid,\s*uuid\[\]\s*\)\s+to anon, authenticated, service_role/i,
  );
});

test("wall, section, and copy read models carry printing identity", () => {
  assert.match(
    MIGRATION,
    /create or replace view public\.v_wall_cards_v1[\s\S]*end as card_printing_id/i,
  );
  assert.match(
    MIGRATION,
    /create or replace view public\.v_section_cards_v1[\s\S]*end as card_printing_id/i,
  );
  assert.match(
    MIGRATION,
    /create function public\.public_discoverable_card_copies_v1[\s\S]*card_printing_id uuid/i,
  );
});

test("web exact helper indexes only card_printing scope rows", () => {
  assert.match(
    WEB_EXACT_HELPER,
    /record\.pricing_scope !== "card_printing"/,
  );
  assert.match(
    WEB_EXACT_HELPER,
    /indexed\.set\(record\.card_printing_id, record\)/,
  );
  assert.match(
    WEB_EXACT_HELPER,
    /getExactMarketPricingByCardPrintingIds/,
  );
});

test("web Vault sums exact raw copies and leaves unresolved copies unpriced", () => {
  assert.match(
    WEB_VAULT,
    /getExactMarketPricingByCardPrintingIds/,
  );
  assert.match(
    WEB_VAULT,
    /const marketPrice = marketPriceByPrintingId\.get\(copy\.card_printing_id\)/,
  );
  assert.match(
    WEB_VAULT,
    /total \+= marketPrice\.market_close[\s\S]*pricedRawCopyCount \+= 1/,
  );
  assert.match(
    WEB_VAULT,
    /summary\.pricedRawCopyCount \+ summary\.unpricedRawCopyCount !==\s*aggregate\.rawCount/,
  );
  assert.doesNotMatch(WEB_VAULT, /effectivePrice\s*\*\s*aggregate\.rawCount/);
  assert.match(WEB_OWNER, /totalEstimatedValue \+= row\.effective_price/);
  assert.doesNotMatch(WEB_OWNER, /row\.effective_price\s*\*\s*row\.raw_count/);
});

test("web private and public GVVI detail require one exact printing target", () => {
  for (const source of [WEB_GVVI, WEB_PUBLIC_GVVI]) {
    assert.match(source, /getExactMarketPricingByCardPrintingIds/);
    assert.match(source, /card_printing_id/);
    assert.doesNotMatch(source, /getPublicPricingByCardIds/);
  }
});

test("Flutter exact pricing rejects parent scope, mismatched identity, and missing printing IDs", () => {
  assert.match(
    FLUTTER_PRICING,
    /fetchByCardPrintingIds/,
  );
  assert.match(
    FLUTTER_PRICING,
    /row\['pricing_scope'\][\s\S]*card_printing/,
  );
  assert.match(
    FLUTTER_EXACT,
    /pricing\.pricingScope != 'card_printing'/,
  );
  assert.match(
    FLUTTER_EXACT,
    /pricing\.cardPrintingId != cardPrintingId/,
  );
  assert.match(
    FLUTTER_EXACT,
    /pricing\.cardPrintId != target\.cardPrintId/,
  );
  assert.match(
    FLUTTER_EXACT,
    /cardPrintingId == null \|\| cardPrintingId\.isEmpty[\s\S]*unpricedCopyCount \+= 1/,
  );
});

test("Flutter private, public, and GVVI Vault paths request exact printing prices", () => {
  assert.match(FLUTTER_VAULT, /v_vault_mobile_pricing_targets_v1/);
  assert.match(FLUTTER_VAULT, /fetchByCardPrintingIds/);
  assert.match(
    FLUTTER_PUBLIC,
    /public_shared_card_pricing_targets_v1/,
  );
  assert.match(FLUTTER_PUBLIC, /fetchByCardPrintingIds/g);
  assert.doesNotMatch(FLUTTER_PUBLIC, /fetchByCardPrintIds/);
  assert.match(
    FLUTTER_GVVI,
    /public_vault_instance_pricing_target_v1/,
  );
  assert.match(
    FLUTTER_GVVI,
    /vault_mobile_instance_pricing_target_v1/,
  );
  assert.match(FLUTTER_GVVI, /fetchByCardPrintingIds/);
});

test("product contract defines exact-printing Vault totals and explicit coverage", () => {
  assert.match(
    PRODUCT_CONTRACT,
    /Vault totals[\s\S]*exact raw printing/i,
  );
  assert.match(
    PRODUCT_CONTRACT,
    /unresolved[\s\S]*unpriced/i,
  );
  assert.match(
    PRODUCT_CONTRACT,
    /slabs[\s\S]*excluded/i,
  );
});
