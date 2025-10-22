import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

import '../../features/search/search_page.dart';
import '../../dev/price_import_page.dart';
import '../../features/home/recently_added_page.dart';
import '../../features/vault/vault_items_ext_list.dart';
import '../../features/account/account_page.dart';
import '../../features/debug/dev_admin_page.dart';
import '../../features/dev/dev_health_page.dart';
import '../../features/dev/diagnostics/pricing_probe_page.dart';
import 'route_names.dart';

Map<String, WidgetBuilder> buildAppRoutes() {
  return {
    RouteNames.search: (_) => const SearchPage(),
    RouteNames.devPriceImport: (_) => const PriceImportPage(),
    RouteNames.recent: (_) => const RecentlyAddedPage(),
    RouteNames.vaultExt: (_) => Scaffold(
          appBar: AppBar(title: const Text('Vault (Effective Prices)')),
          body: const VaultItemsExtList(),
        ),
    RouteNames.account: (_) => const AccountPage(),
    RouteNames.devAdmin: (_) => const DevAdminPage(),
    if (kDebugMode) RouteNames.devHealth: (_) => const DevHealthPage(),
    if (kDebugMode) RouteNames.devDiagPricing: (_) => const PricingProbePage(),
  };
}
