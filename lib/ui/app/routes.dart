import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

// Unified search pages removed; using production SearchPage
import '../../features/dev/dev_flags.dart';
import '../../features/scanner/scanner_advanced_page.dart';
import '../../features/profile/profile_page.dart';
import '../../features/vault/goal_detail_page.dart';
import '../../dev/price_import_page.dart';
import '../../features/home/recently_added_page.dart';
import '../../features/vault/vault_items_ext_list.dart';
import '../../features/account/account_page.dart';
import '../../features/debug/dev_admin_page.dart';
import '../../features/dev/dev_health_page.dart';
import '../../features/dev/diagnostics/pricing_probe_page.dart';
import '../../features/dev/diagnostics/pricing_smoke_page.dart';
import '../../features/dev/diagnostics/pricing_diagnostics_page.dart';
import 'route_names.dart';
import '../../config/flags.dart';
import '../../features/alerts/alerts_page.dart';
import '../../features/scanner/scan_history_page.dart';
// old pricing detail kept for other flows; card detail route uses prod detail
import '../../features/wall/wall_feed_page.dart';
import '../../features/wall/wall_post_composer.dart';
import '../../features/wall/wall_profile_page.dart';
import '../../features/wall/wall_post_detail.dart';
import '../../features/wall/create_listing_page.dart';
import '../../services/supa_client.dart';
import '../../features/explore/explore_feed_page.dart';
import '../../features/explore/discover_page.dart';
// DEV/DEMO FEATURES ARE ALWAYS VISIBLE (INTENTIONAL)
// Before public release, re-introduce a single feature flag or environment check if needed.
import '../../features/search/search_page.dart' as prod_search;
import '../../features/detail/card_detail_page.dart' as prod_detail;
import '../../features/scanner/scanner_page.dart' as prod_scan;

Future<String?> _resolveCardIdIfMissing(Map map) async {
  final id = (map['card_print_id'] ?? map['id'] ?? map['cardId'] ?? map['card_id'])?.toString();
  if (id != null && id.isNotEmpty) return id;
  final setCode = (map['set_code'] ?? map['setCode'])?.toString();
  final number = (map['number'] ?? map['card_number'])?.toString();
  if (setCode == null || setCode.isEmpty || number == null || number.isEmpty) return null;
  try {
    final rows = await sb
        .from('card_prints')
        .select('id')
        .eq('set_code', setCode)
        .eq('number', number)
        .limit(1) as List<dynamic>;
    if (rows.isEmpty) return null;
    final rid = (rows.first as Map)['id']?.toString();
    return (rid != null && rid.isNotEmpty) ? rid : null;
  } catch (_) {
    return null;
  }
}

Map<String, WidgetBuilder> buildAppRoutes() {
  return {
    RouteNames.search: (_) => const prod_search.SearchPage(),
    // Aliases for convenience and deep links
    '/scan': (_) => const prod_scan.ScannerPage(),
    RouteNames.cardDetail: (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map) ? args : <String, dynamic>{};
      return FutureBuilder<String?>(
        future: _resolveCardIdIfMissing(map),
        builder: (context, snap) {
          final resolved = Map<String, dynamic>.from(map);
          if (snap.connectionState == ConnectionState.done && (snap.data ?? '').toString().isNotEmpty) {
            resolved['card_print_id'] = snap.data;
          }
          return prod_detail.CardDetailPage(row: resolved);
        },
      );
    },
    '/details': (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map) ? args : <String, dynamic>{};
      return prod_detail.CardDetailPage(row: Map<String, dynamic>.from(map));
    },
    if (gvFeatureScanner) RouteNames.scanner: (_) => const prod_scan.ScannerPage(),
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
    RouteNames.explore: (_) => const ExploreFeedPage(),
    RouteNames.discover: (_) => const DiscoverPage(),
    // '/wall', '/search', and '/card' are covered by named RouteNames above
    if (kDebugMode || kProfileMode) RouteNames.createListing: (_) => const CreateListingPage(),
    RouteNames.devAdmin: (_) => const DevAdminPage(),
    if (kDebugMode) RouteNames.devHealth: (_) => const DevHealthPage(),
    if (kDebugMode) RouteNames.devDiagPricing: (_) => const PricingProbePage(),
    if (kDebugMode) '/dev-pricing-smoke': (_) => const PricingSmokePage(),
    if (kDebugMode) '/dev-pricing-diag': (ctx) {
      final args = ModalRoute.of(ctx)?.settings.arguments;
      final map = (args is Map) ? args : <String,dynamic>{};
      return PricingDiagnosticsPage(
        cardId: (map['cardId'] ?? map['card_print_id'] ?? map['id'] ?? '').toString(),
        condition: (map['condition'] ?? 'NM').toString(),
      );
    },
    RouteNames.alerts: (_) => const AlertsPage(),
    RouteNames.scanHistory: (_) => const ScanHistoryPage(),
    if (kShowAdvancedScanner) '/scanner-advanced': (_) => const ScannerAdvancedPage(),
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

// unified search sheet routing removed; using production SearchPage
