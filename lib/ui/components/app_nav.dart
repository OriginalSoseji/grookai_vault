import 'dart:io' show Platform;
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/components/profile_button.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/config/flags.dart';

import 'package:grookai_vault/features/home/home_page.dart';
import 'package:grookai_vault/features/vault/vault_page.dart';
import 'package:grookai_vault/features/wishlist/wishlist_page.dart';
import 'package:grookai_vault/features/search/unified_search_page.dart';

class AppNav extends StatefulWidget {
  const AppNav({super.key});
  @override
  State<AppNav> createState() => _AppNavState();
}

class _TabItem {
  final String label;
  final IconData icon;
  final Widget Function() builder;
  const _TabItem({
    required this.label,
    required this.icon,
    required this.builder,
  });
}

class _AppNavState extends State<AppNav> {

  // Simple, editable tab config (keep order: Home, Vault, Search, Wishlist)
  late final List<_TabItem> _tabs = [
    _TabItem(label: 'Home', icon: Icons.home, builder: () => const HomePage()),
    _TabItem(
      label: 'Vault',
      icon: Icons.inventory_2,
      builder: () => const VaultPage(),
    ),
    _TabItem(
      label: 'Search',
      icon: Icons.search,
      builder: () => const UnifiedSearchPage(),
    ),
    _TabItem(
      label: 'Wishlist',
      icon: Icons.favorite,
      builder: () => const WishlistPage(),
    ),
  ];

  int _index = 0;

  void _openScanner() {
    if (!GV_FEATURE_SCANNER) return;
    Navigator.of(context).pushNamed(RouteNames.scanner);
  }

  PreferredSizeWidget _buildMaterialAppBar(GVTheme gv) {
    // Only Profile on the right; LargeTitle not used on Material
    return AppBar(
      title: Text(
        _tabs[_index].label,
        style: gv.typography.title.copyWith(color: gv.colors.textPrimary),
      ),
      actions: const [ProfileButton()],
    );
  }

  Widget _buildMaterial() {
    final gv = GVTheme.of(context);
    return Scaffold(
      backgroundColor: gv.colors.bg,
      appBar: _buildMaterialAppBar(gv),
      body: IndexedStack(
        index: _index,
        children: _tabs.map((t) => t.builder()).toList(),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: GV_FEATURE_SCANNER
          ? FloatingActionButton(
              onPressed: _openScanner,
              child: const Icon(Icons.camera_alt),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          for (final t in _tabs)
            NavigationDestination(
              icon: Icon(_iconOutline(t.icon)),
              selectedIcon: Icon(t.icon),
              label: t.label,
            ),
        ],
      ),
    );
  }

  IconData _iconOutline(IconData filled) {
    // Provide sensible outlined variants when possible
    if (filled == Icons.home) return Icons.home_outlined;
    if (filled == Icons.inventory_2) return Icons.inventory_2_outlined;
    if (filled == Icons.favorite) return Icons.favorite_border;
    if (filled == Icons.search) return Icons.search;
    return filled;
  }

  Widget _buildCupertino() {
    final gv = GVTheme.of(context);
    // Cupertino: middle scan as action; tabs are Home, Vault, Search, Wishlist
    return CupertinoTabScaffold(
      tabBar: CupertinoTabBar(
        items: const [
          BottomNavigationBarItem(
            icon: Icon(CupertinoIcons.house),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(CupertinoIcons.cube_box),
            label: 'Vault',
          ),
          BottomNavigationBarItem(
            icon: Icon(CupertinoIcons.search),
            label: 'Search',
          ),
          BottomNavigationBarItem(
            icon: Icon(CupertinoIcons.heart),
            label: 'Wishlist',
          ),
        ],
      ),
      tabBuilder: (context, index) {
        final tab = _tabs[index];
        return CupertinoPageScaffold(
          navigationBar: CupertinoNavigationBar(
            middle: Text(tab.label, style: gv.typography.title),
            trailing: const ProfileButton(),
          ),
          child: SafeArea(
            top: false,
            child: Stack(
              children: [
                // Tab content
                Positioned.fill(child: tab.builder()),
                // Center scan affordance overlayed above tab bar
                if (GV_FEATURE_SCANNER)
                  Positioned(
                    bottom: 8,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: GestureDetector(
                        onTap: _openScanner,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: gv.colors.accent,
                            borderRadius: BorderRadius.circular(28),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: GVSpacing.s16,
                              vertical: GVSpacing.s12,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  CupertinoIcons.camera,
                                  color: Colors.white,
                                ),
                                SizedBox(width: GVSpacing.s8),
                                Text(
                                  'Scan',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isIOS =
        Theme.of(context).platform == TargetPlatform.iOS || Platform.isIOS;
    return isIOS ? _buildCupertino() : _buildMaterial();
  }
}
