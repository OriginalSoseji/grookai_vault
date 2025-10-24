import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

import '../../features/search/unified_search_page.dart';
import '../../features/search/unified_search_sheet.dart';
// import '../../features/search/search_page.dart';
import '../../features/scan/scan_entry.dart';
import '../../features/profile/profile_page.dart';
import '../../features/scanner/scanner_page.dart';
import '../../features/vault/goal_detail_page.dart';
import '../../dev/price_import_page.dart';
import '../../features/home/recently_added_page.dart';
import '../../features/vault/vault_items_ext_list.dart';
import '../../features/account/account_page.dart';
import '../../features/debug/dev_admin_page.dart';
import '../../features/dev/dev_health_page.dart';
import '../../features/dev/diagnostics/pricing_probe_page.dart';
import '../../features/dev/diagnostics/pricing_smoke_page.dart';
import 'route_names.dart';
import '../../config/flags.dart';
import '../../features/alerts/alerts_page.dart';
import '../../features/scanner/scan_history_page.dart';
import '../../features/pricing/card_detail_page.dart';
import '../../features/wall/wall_feed_page.dart';
import '../../features/wall/wall_post_composer.dart';
import '../../features/wall/wall_profile_page.dart';
import '../../features/wall/wall_post_detail.dart';

Map<String, WidgetBuilder> buildAppRoutes() {
  return {
    RouteNames.search: (_) => const UnifiedSearchPage(),
    // Aliases for convenience and deep links
    '/scan': (_) => const ScanEntry(),
    '/unified-search-sheet': (_) => const _SearchSheetPage(),
    RouteNames.cardDetail: (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map) ? args : <String, dynamic>{};
      return CardDetailPage(row: map);
    },
    '/details': (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map) ? args : <String, dynamic>{};
      return CardDetailPage(row: map);
    },
    if (gvFeatureScanner) RouteNames.scanner: (_) => const ScannerPage(),
    RouteNames.devPriceImport: (_) => const PriceImportPage(),
    RouteNames.recent: (_) => const RecentlyAddedPage(),
    RouteNames.vaultExt: (_) => Scaffold(
      appBar: AppBar(title: const Text('Vault (Effective Prices)')),
      body: const VaultItemsExtList(),
    ),
    RouteNames.account: (_) => const AccountPage(),
    // Profile tab page
    '/profile': (_) => const ProfilePage(),
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
    if (kDebugMode) '/dev-pricing-smoke': (_) => const PricingSmokePage(),
    RouteNames.alerts: (_) => const AlertsPage(),
    RouteNames.scanHistory: (_) => const ScanHistoryPage(),
    '/goal-detail': (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map) ? args : <String, dynamic>{};
      final id = (map['id'] ?? '').toString();
      final name = (map['name'] ?? '').toString();
      return GoalDetailPage(id: id, name: name);
    },
    '/wall-post': (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map) ? args : <String, dynamic>{};
      final id = (map['id'] ?? '').toString();
      return WallPostDetail(id: id);
    },
  };
}

/// Simple page that hosts the bottom search sheet for routing purposes.
class _SearchSheetPage extends StatelessWidget {
  const _SearchSheetPage();
  @override
  Widget build(BuildContext context) {
    // Show the sheet on first frame then pop this host page when closed
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await UnifiedSearchSheet.show(context);
      if (context.mounted) Navigator.of(context).maybePop();
    });
    return const Scaffold(body: SizedBox.shrink());
  }
}
