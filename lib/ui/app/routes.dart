import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

import '../../features/search/unified_search_page.dart';
import '../../features/scanner/scanner_page.dart';
import '../../dev/price_import_page.dart';
import '../../features/home/recently_added_page.dart';
import '../../features/vault/vault_items_ext_list.dart';
import '../../features/account/account_page.dart';
import '../../features/debug/dev_admin_page.dart';
import '../../features/dev/dev_health_page.dart';
import '../../features/dev/diagnostics/pricing_probe_page.dart';
import 'route_names.dart';
import '../../config/flags.dart';
import '../../features/alerts/alerts_page.dart';
import '../../features/scanner/scan_history_page.dart';
import '../../features/pricing/card_detail_page.dart';
import '../../features/wall/wall_feed_page.dart';
import '../../features/wall/wall_post_composer.dart';
import '../../features/wall/wall_profile_page.dart';

Map<String, WidgetBuilder> buildAppRoutes() {
  return {
    RouteNames.search: (_) => const UnifiedSearchPage(),
    RouteNames.cardDetail: (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map) ? args : <String, dynamic>{};
      return CardDetailPage(row: map);
    },
    if (GV_FEATURE_SCANNER) RouteNames.scanner: (_) => const ScannerPage(),
    RouteNames.devPriceImport: (_) => const PriceImportPage(),
    RouteNames.recent: (_) => const RecentlyAddedPage(),
    RouteNames.vaultExt: (_) => Scaffold(
      appBar: AppBar(title: const Text('Vault (Effective Prices)')),
      body: const VaultItemsExtList(),
    ),
    RouteNames.account: (_) => const AccountPage(),
    RouteNames.wallFeed: (_) => const WallFeedPage(),
    RouteNames.wallCompose: (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map<String, dynamic>) ? args : null;
      return WallPostComposer(initialCard: map);
    },
    RouteNames.wallProfile: (_) => const WallProfilePage(),
    RouteNames.devAdmin: (_) => const DevAdminPage(),
    if (kDebugMode) RouteNames.devHealth: (_) => const DevHealthPage(),
    if (kDebugMode) RouteNames.devDiagPricing: (_) => const PricingProbePage(),
    RouteNames.alerts: (_) => const AlertsPage(),
    RouteNames.scanHistory: (_) => const ScanHistoryPage(),
  };
}
