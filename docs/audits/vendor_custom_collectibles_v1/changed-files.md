# Custom collectible extension file manifest

Relative to the recorded dirty storefront candidate, not to HEAD.
The original candidate remains uncommitted. SHA-256 hashes and preserved files are in `final-source.json`.

## Implementation and checkpoint files

- `AGENTS.md` — extended existing candidate
- `apps/web/src/app/api/stores/[slug]/app/products/[productId]/media/[photo]/route.ts` — new
- `apps/web/src/app/api/stores/[slug]/app/products/[productId]/route.ts` — new
- `apps/web/src/app/api/stores/[slug]/preview/products/[productId]/media/[photo]/route.ts` — new
- `apps/web/src/app/api/stores/[slug]/preview/products/[productId]/route.ts` — new
- `apps/web/src/app/api/stores/[slug]/products/[productId]/media/[photo]/route.ts` — new
- `apps/web/src/app/api/stores/[slug]/products/[productId]/route.ts` — new
- `apps/web/src/app/api/stores/owner/products/route.ts` — new
- `apps/web/src/app/api/stores/owner/route.ts` — extended existing candidate
- `apps/web/src/app/store/[slug]/products/[productId]/page.tsx` — new
- `apps/web/src/components/stores/CustomProductView.tsx` — new
- `apps/web/src/components/stores/StoreProductImage.tsx` — new
- `apps/web/src/components/stores/StorefrontView.tsx` — extended existing candidate
- `apps/web/src/lib/stores/customProductServer.ts` — new
- `apps/web/src/lib/stores/storefrontServer.ts` — extended existing candidate
- `apps/web/src/lib/stores/storefrontTypes.ts` — extended existing candidate
- `docs/CONTRACT_INDEX.md` — extended existing candidate
- `docs/contracts/VENDOR_CUSTOM_COLLECTIBLES_V1.md` — new
- `docs/contracts/VENDOR_STOREFRONTS_V1.md` — extended existing candidate
- `docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md` — extended existing candidate
- `lib/main.dart` — extended existing candidate
- `lib/main_shell.dart` — extended existing candidate
- `lib/screens/network/network_screen.dart` — extended existing candidate
- `lib/screens/stores/custom_product_management_screen.dart` — new
- `lib/screens/stores/custom_product_screen.dart` — new
- `lib/screens/stores/store_management_screen.dart` — extended existing candidate
- `lib/screens/stores/storefront_screen.dart` — extended existing candidate
- `lib/services/navigation/grookai_web_route_service.dart` — extended existing candidate
- `lib/services/stores/storefront_service.dart` — extended existing candidate
- `scripts/tests/vendor_custom_collectibles_browser_v1.mjs` — new
- `scripts/tests/vendor_custom_collectibles_local_v1.mjs` — new
- `scripts/tests/vendor_storefront_browser_v1.mjs` — extended existing candidate
- `scripts/tests/vendor_storefront_http_fixture.mjs` — extended existing candidate
- `supabase/migrations/20260918070000_vendor_custom_collectibles_v1.sql` — new
- `test/custom_collectibles_v1_test.dart` — new

## New evidence files

- `docs/audits/vendor_custom_collectibles_v1/LOCAL_IMPLEMENTATION_20260917.md`
- `docs/audits/vendor_custom_collectibles_v1/browser-receipt.json`
- `docs/audits/vendor_custom_collectibles_v1/changed-files.md`
- `docs/audits/vendor_custom_collectibles_v1/checks.json`
- `docs/audits/vendor_custom_collectibles_v1/custom-detail-desktop.png`
- `docs/audits/vendor_custom_collectibles_v1/custom-detail-mobile.png`
- `docs/audits/vendor_custom_collectibles_v1/custom-grid-desktop.png`
- `docs/audits/vendor_custom_collectibles_v1/custom-grid-mobile.png`
- `docs/audits/vendor_custom_collectibles_v1/custom-native-detail.png`
- `docs/audits/vendor_custom_collectibles_v1/custom-native-editor.png`
- `docs/audits/vendor_custom_collectibles_v1/final-source.json`
- `docs/audits/vendor_custom_collectibles_v1/flutter-analyze.log`
- `docs/audits/vendor_custom_collectibles_v1/flutter-tests.log`
- `docs/audits/vendor_custom_collectibles_v1/legacy-browser-receipt.json`
- `docs/audits/vendor_custom_collectibles_v1/legacy-contracts.log`
- `docs/audits/vendor_custom_collectibles_v1/sql-receipt.json`
- `docs/audits/vendor_custom_collectibles_v1/starting-source.json`
- `docs/audits/vendor_custom_collectibles_v1/web-build.log`
