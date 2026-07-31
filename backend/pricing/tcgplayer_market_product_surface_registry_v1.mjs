export const TCGPLAYER_MARKET_PRODUCT_SURFACE_REGISTRY_V1 = Object.freeze([
  Object.freeze({
    surface_id: "web_card_detail",
    client: "web",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "/card/[gv_id]",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts",
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/components/pricing/CardPagePricingRail.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/card/[gv_id]/page.tsx",
    ]),
    capture_selector: '[data-pricing-proof="tcgplayer-market"]',
  }),
  Object.freeze({
    surface_id: "web_search",
    client: "web",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "/explore?q=[query]",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/explore/getExploreRows.ts",
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/components/explore/ExploreCardGridItem.tsx",
      "apps/web/src/components/explore/ExploreCardListItem.tsx",
      "apps/web/src/components/explore/ExploreCardDetailsRow.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/explore/page.tsx",
      "apps/web/src/app/api/resolver/search/route.ts",
    ]),
    capture_selector: '[data-pricing-proof="tcgplayer-market"]',
  }),
  Object.freeze({
    surface_id: "web_explore",
    client: "web",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "/explore",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/cards/getFeaturedExploreCards.ts",
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/components/explore/ExploreDiscoverySections.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/explore/page.tsx",
    ]),
    capture_selector: '[data-pricing-proof="tcgplayer-market"]',
  }),
  Object.freeze({
    surface_id: "web_set_grid",
    client: "web",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "/sets/[set_code]",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/pricing/enrichPublicSetCardsWithMarketPricingV1.ts",
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/components/PublicSetCardGrid.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/sets/[set_code]/page.tsx",
      "apps/web/src/app/api/public-set-cards/route.ts",
    ]),
    capture_selector: '[data-pricing-proof="tcgplayer-market"]',
  }),
  Object.freeze({
    surface_id: "web_compare",
    client: "web",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "/compare",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/cards/getPublicCardsByGvIds.ts",
      "apps/web/src/lib/pricing/getPublicPricingByCardIds.ts",
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/components/compare/CompareWorkspace.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/compare/page.tsx",
    ]),
    capture_selector: '[data-pricing-proof="tcgplayer-market"]',
  }),
  Object.freeze({
    surface_id: "web_private_vault",
    client: "web",
    proof_kind: "vault_total",
    auth_lane: "signed_in",
    route_identity: "/vault",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/vault/getOwnerVaultItems.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/components/vault/VaultCollectionView.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/vault/page.tsx",
    ]),
    capture_selector:
      '[data-pricing-proof="vault-exact-total"][data-pricing-scope="vault_total"]',
  }),
  Object.freeze({
    surface_id: "web_public_vault",
    client: "web",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "/u/[slug]",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/pricing/getPublicPricingByCardIds.ts",
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/components/public/PublicWallCardVisiblePrice.tsx",
      "apps/web/src/components/public/PublicCollectionGrid.tsx",
      "apps/web/src/components/public/PublicCollectorProfileContent.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/u/[slug]/page.tsx",
    ]),
    capture_selector: '[data-pricing-proof="tcgplayer-market"]',
  }),
  Object.freeze({
    surface_id: "web_vault_item",
    client: "web",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "/vault/gvvi/[gvvi_id]",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/vault/getVaultInstanceByGvvi.ts",
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/components/vault/VaultInstancePricingCard.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/vault/gvvi/[gvvi_id]/page.tsx",
    ]),
    capture_selector: '[data-pricing-proof="tcgplayer-market"]',
  }),
  Object.freeze({
    surface_id: "web_market_history",
    client: "web",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "/card/[gv_id]/market",
    read_owner_files: Object.freeze([
      "apps/web/src/lib/pricing/getCardMarketAnalysisModel.ts",
      "apps/web/src/lib/pricing/getCardPricingUiByCardPrintId.ts",
      "apps/web/src/lib/pricing/marketPricingReadModelV1.ts",
    ]),
    render_owner_files: Object.freeze([
      "apps/web/src/app/card/[gv_id]/market/page.tsx",
    ]),
    auth_boundary_files: Object.freeze([
      "apps/web/src/app/card/[gv_id]/market/page.tsx",
    ]),
    capture_selector: '[data-pricing-proof="tcgplayer-market"]',
  }),
  Object.freeze({
    surface_id: "flutter_card_detail",
    client: "flutter",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "card_detail",
    read_owner_files: Object.freeze([
      "lib/main.dart",
      "lib/services/public/card_surface_pricing_service.dart",
    ]),
    render_owner_files: Object.freeze([
      "lib/main.dart",
      "lib/widgets/card_surface_price.dart",
    ]),
    auth_boundary_files: Object.freeze(["lib/main.dart"]),
    capture_selector: "tcgplayer-market-v1|",
  }),
  Object.freeze({
    surface_id: "flutter_search_or_grid",
    client: "flutter",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "search_or_grid",
    read_owner_files: Object.freeze([
      "lib/main.dart",
      "lib/services/public/card_surface_pricing_service.dart",
    ]),
    render_owner_files: Object.freeze([
      "lib/main.dart",
      "lib/widgets/card_surface_price.dart",
    ]),
    auth_boundary_files: Object.freeze(["lib/main.dart"]),
    capture_selector: "tcgplayer-market-v1|",
  }),
  Object.freeze({
    surface_id: "flutter_set_grid",
    client: "flutter",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "set_grid",
    read_owner_files: Object.freeze([
      "lib/services/public/public_sets_service.dart",
      "lib/services/public/card_surface_pricing_service.dart",
    ]),
    render_owner_files: Object.freeze([
      "lib/screens/sets/public_set_detail_screen.dart",
      "lib/widgets/card_surface_price.dart",
    ]),
    auth_boundary_files: Object.freeze([
      "lib/screens/sets/public_set_detail_screen.dart",
    ]),
    capture_selector: "tcgplayer-market-v1|",
  }),
  Object.freeze({
    surface_id: "flutter_compare",
    client: "flutter",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "compare",
    read_owner_files: Object.freeze([
      "lib/services/public/compare_service.dart",
      "lib/services/public/card_surface_pricing_service.dart",
    ]),
    render_owner_files: Object.freeze([
      "lib/screens/compare/compare_screen.dart",
      "lib/widgets/card_surface_price.dart",
    ]),
    auth_boundary_files: Object.freeze([
      "lib/screens/compare/compare_screen.dart",
    ]),
    capture_selector: "tcgplayer-market-v1|",
  }),
  Object.freeze({
    surface_id: "flutter_private_vault",
    client: "flutter",
    proof_kind: "vault_total",
    auth_lane: "signed_in",
    route_identity: "private_vault",
    read_owner_files: Object.freeze([
      "lib/main_vault.dart",
      "lib/services/public/card_surface_pricing_service.dart",
      "lib/services/vault/vault_exact_pricing.dart",
    ]),
    render_owner_files: Object.freeze([
      "lib/main_vault.dart",
      "lib/widgets/card_surface_price.dart",
    ]),
    auth_boundary_files: Object.freeze(["lib/main_vault.dart"]),
    capture_selector: "tcgplayer-market-vault-total-v1|",
  }),
  Object.freeze({
    surface_id: "flutter_public_collector",
    client: "flutter",
    proof_kind: "vault_group_total",
    auth_lane: "signed_in",
    route_identity: "public_collector",
    read_owner_files: Object.freeze([
      "lib/services/public/public_collector_service.dart",
      "lib/services/public/card_surface_pricing_service.dart",
      "lib/services/vault/vault_exact_pricing.dart",
    ]),
    render_owner_files: Object.freeze([
      "lib/screens/public_collector/public_collector_screen.dart",
      "lib/widgets/card_surface_price.dart",
    ]),
    auth_boundary_files: Object.freeze([
      "lib/screens/public_collector/public_collector_screen.dart",
    ]),
    capture_selector: "tcgplayer-market-v1|vault_exact_total|",
  }),
  Object.freeze({
    surface_id: "flutter_network",
    client: "flutter",
    proof_kind: "price_record",
    auth_lane: "signed_in",
    route_identity: "network",
    read_owner_files: Object.freeze([
      "lib/services/network/network_stream_service.dart",
      "lib/services/public/card_surface_pricing_service.dart",
    ]),
    render_owner_files: Object.freeze([
      "lib/screens/network/network_screen.dart",
      "lib/widgets/card_surface_price.dart",
    ]),
    auth_boundary_files: Object.freeze([
      "lib/screens/network/network_screen.dart",
    ]),
    capture_selector: "tcgplayer-market-v1|",
  }),
  Object.freeze({
    surface_id: "flutter_vault_item",
    client: "flutter",
    proof_kind: "vault_group_total",
    auth_lane: "signed_in",
    route_identity: "vault_item",
    read_owner_files: Object.freeze([
      "lib/screens/vault/vault_manage_card_screen.dart",
      "lib/services/public/card_surface_pricing_service.dart",
      "lib/services/vault/vault_exact_pricing.dart",
    ]),
    render_owner_files: Object.freeze([
      "lib/screens/vault/vault_manage_card_screen.dart",
      "lib/widgets/card_surface_price.dart",
    ]),
    auth_boundary_files: Object.freeze([
      "lib/screens/vault/vault_manage_card_screen.dart",
    ]),
    capture_selector: "tcgplayer-market-v1|vault_exact_total|",
  }),
]);

export const TCGPLAYER_MARKET_REQUIRED_PRODUCT_SURFACES_V1 = Object.freeze(
  TCGPLAYER_MARKET_PRODUCT_SURFACE_REGISTRY_V1.map(
    ({ surface_id, client, proof_kind }) =>
      Object.freeze({ surface_id, client, proof_kind }),
  ),
);
