import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/services/edge_warmup.dart';
import 'package:grookai_vault/config/flags.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/features/home/home_page.dart';
import 'package:grookai_vault/features/vault/vault_page.dart';
import 'package:grookai_vault/features/wishlist/wishlist_page.dart';
import 'package:grookai_vault/features/scan/scan_page.dart';
import 'package:grookai_vault/services/feature_rollout.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final _lifecycleObserver = _AppLifecycleWarmup();
  final supabase = Supabase.instance.client;
  int _index = 0;
  final _homeKey = GlobalKey<HomePageState>();
  final _vaultKey = GlobalKey<VaultPageState>();
  final _wishKey = GlobalKey<WishlistPageState>();
  StreamSubscription<AuthState>? _authSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(_lifecycleObserver);
    // Rebuild when auth state/user metadata changes (e.g., avatar_url updated)
    _authSub = supabase.auth.onAuthStateChange.listen((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(_lifecycleObserver);
    _authSub?.cancel();
    super.dispose();
  }

  Future<void> _signOut() async => supabase.auth.signOut();

  // Account dialog was replaced by dedicated /account route.

  void _refreshCurrent() {
    switch (_index) {
      case 0:
        _homeKey.currentState?.reload();
        break;
      case 1:
        _vaultKey.currentState?.reload();
        break;
      case 2:
        _wishKey.currentState?.reload();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['Home', 'Vault', 'Wishlist', 'Scan'];
    final gv = GVTheme.of(context);
    return Scaffold(
      backgroundColor: gv.colors.bg,
      appBar: AppBar(
        title: Text(titles[_index], style: gv.typography.title.copyWith(color: gv.colors.textPrimary)),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), tooltip: 'Refresh', onPressed: _refreshCurrent),
          if (_index == 1)
            IconButton(
              icon: const Icon(Icons.add),
              tooltip: 'Add card (Catalog Picker)',
              onPressed: () => _vaultKey.currentState?.showAddOrEditDialog(),
            ),
          if (_index == 1)
            IconButton(
              icon: const Icon(Icons.attach_money),
              tooltip: 'Update Prices',
              onPressed: () async {
                try {
                  await Supabase.instance.client.functions.invoke('update_prices', body: { 'limit': 100 });
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Price update triggered')));
                } catch (_) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to trigger price update')));
                }
              },
            ),
          IconButton(icon: const Icon(Icons.search), tooltip: 'Search cards', onPressed: () => Navigator.of(context).pushNamed(RouteNames.search)),
          if (kDebugMode) ...[
            IconButton(icon: const Icon(Icons.health_and_safety), tooltip: 'Dev Health', onPressed: () => Navigator.of(context).pushNamed('/dev-health')),
            IconButton(icon: const Icon(Icons.bug_report), tooltip: 'Pricing Probe', onPressed: () => Navigator.of(context).pushNamed('/dev/diag/pricing')),
          ],
          IconButton(icon: const Icon(Icons.developer_mode), tooltip: 'Dev Admin', onPressed: () => Navigator.of(context).pushNamed(RouteNames.devAdmin)),
          PopupMenuButton<String>(
            tooltip: 'Account',
            icon: _buildUserAvatar(),
            onSelected: (v) {
              if (v == 'alerts' && GV_FEATURE_ALERTS) Navigator.of(context).pushNamed(RouteNames.alerts);
              if (v == 'account') Navigator.of(context).pushNamed(RouteNames.account);
              if (v == 'signout') _signOut();
            },
            itemBuilder: (_) => [
              if (GV_FEATURE_ALERTS) const PopupMenuItem(value: 'alerts', child: Text('Alerts')),
              const PopupMenuItem(value: 'account', child: Text('Account')),
              const PopupMenuItem(value: 'signout', child: Text('Sign out')),
            ],
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          HomePage(key: _homeKey),
          VaultPage(key: _vaultKey),
          WishlistPage(key: _wishKey),
          const ScanPage(),
        ],
      ),
      floatingActionButton: _index == 1 && GV_FEATURE_SCANNER && gvScannerEnabledForUser(supabase.auth.currentUser?.id)
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.of(context).pushNamed(RouteNames.scanner),
              icon: const Icon(Icons.camera_alt),
              label: const Text('Scan Card'),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Vault'),
          NavigationDestination(icon: Icon(Icons.favorite_border), selectedIcon: Icon(Icons.favorite), label: 'Wishlist'),
          NavigationDestination(icon: Icon(Icons.camera_outlined), selectedIcon: Icon(Icons.camera_alt), label: 'Scan'),
        ],
      ),
    );
  }
}

class _AppLifecycleWarmup extends WidgetsBindingObserver {
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      EdgeWarmup.warm();
    }
  }
}

Widget _buildUserAvatar() {
  final user = Supabase.instance.client.auth.currentUser;
  final email = user?.email ?? '';
  final md = user?.userMetadata ?? {};
  final url = (md['avatar_url'] ?? '').toString().trim();
  if (url.startsWith('http')) {
    return CircleAvatar(radius: 14, backgroundImage: NetworkImage(url));
  }
  final ch = (email.isNotEmpty ? email[0] : 'U').toUpperCase();
  return CircleAvatar(radius: 14, child: Text(ch, style: const TextStyle(fontWeight: FontWeight.w700)));
}
