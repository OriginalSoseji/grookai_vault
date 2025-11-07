import 'package:flutter/material.dart';
import 'package:grookai_vault/features/wall/wall_refresh_bus.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';
import 'package:grookai_vault/features/home/thunder_home.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/features/search/search_page.dart';
import 'package:grookai_vault/features/vault/vault_page.dart';
import 'package:grookai_vault/features/profile/profile_page.dart';

class ThunderShell extends StatefulWidget {
  const ThunderShell({super.key});
  @override
  State<ThunderShell> createState() => _ThunderShellState();
}

class _ThunderShellState extends State<ThunderShell> {
  int _index = 0;
  DateTime _lastTabChange = DateTime.fromMillisecondsSinceEpoch(0);

  void _openScan() {
    Navigator.of(context).pushNamed(RouteNames.scanner);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Thunder.base,
      body: IndexedStack(index: _index == 2 ? 0 : _index, children: const [
        ThunderHome(),
        SearchPage(),
        ThunderHome(), // placeholder for center not used
        VaultPage(),
        ProfilePage(),
      ]),
      bottomNavigationBar: SafeArea(
        child: Container(
          decoration: BoxDecoration(
            color: Thunder.surface,
            boxShadow: const [
              BoxShadow(color: Colors.black26, blurRadius: 6, offset: Offset(0, -2)),
            ],
          ),
          child: Row(
            children: [
              _item(icon: Icons.home_filled, label: 'Home', i: 0),
              _item(icon: Icons.search, label: 'Search', i: 1),
              _scan(),
              _item(icon: Icons.inventory_2, label: 'Vault', i: 3),
              _item(icon: Icons.person, label: 'Profile', i: 4),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item({required IconData icon, required String label, required int i}) {
    final active = _index == i;
    return Expanded(
      child: InkWell(
        onTap: () {
          if (_index == i) return;
          setState(() => _index = i);
          _onTabChanged(i);
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: active ? Thunder.accent : Thunder.onSurface.withOpacity(0.7)),
              const SizedBox(height: 4),
              Container(
                height: 2,
                width: 16,
                decoration: BoxDecoration(
                  color: active ? Thunder.accent : Colors.transparent,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _onTabChanged(int newIndex) {
    final now = DateTime.now();
    if (now.difference(_lastTabChange).inMilliseconds < 500) return;
    _lastTabChange = now;
    if (newIndex == 0) {
      // Treat Home return as a cue to refresh Wall feed silently if stale
      // (no-op if WallFeedPage not currently mounted)
      // ignore: discarded_futures
      WallRefreshBus.instance.triggerIfStale();
    }
  }

  Widget _scan() {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Material(
          color: Colors.transparent,
          child: InkResponse(
            onTap: _openScan,
            radius: 32,
            child: Container(
              decoration: const BoxDecoration(
                color: Thunder.accent,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: Colors.black38, blurRadius: 10, offset: Offset(0, 4)),
                ],
              ),
              width: 56,
              height: 56,
              child: const Icon(Icons.camera_alt, color: Colors.black),
            ),
          ),
        ),
      ),
    );
  }
}
