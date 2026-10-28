import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final shell = File('lib/main_shell.dart').readAsStringSync();
  final vault = File('lib/main_vault.dart').readAsStringSync();
  final search = File('lib/main.dart').readAsStringSync();
  final recentSearches = File(
    'lib/services/search/local_recent_searches.dart',
  ).readAsStringSync();
  final cardDetail = File('lib/card_detail_screen.dart').readAsStringSync();
  final wall = File(
    'lib/screens/public_collector/public_collector_screen.dart',
  ).readAsStringSync();
  final network = File(
    'lib/screens/network/network_screen.dart',
  ).readAsStringSync();
  final networkCard = File(
    'lib/widgets/network/network_interaction_card.dart',
  ).readAsStringSync();
  final dex = File(
    'lib/screens/dex/grookai_dex_screen.dart',
  ).readAsStringSync();

  test('root shell keeps five familiar mobile destinations', () {
    final dockStart = shell.indexOf("label: 'Pulse'", 1000);
    final wallIndex = shell.indexOf("label: 'Wall'", dockStart);
    final scanIndex = shell.indexOf("label: 'Scan'", wallIndex);
    final vaultIndex = shell.indexOf("label: 'Vault'", scanIndex);
    final searchIndex = shell.indexOf("label: 'Search'", vaultIndex);

    expect(dockStart, greaterThan(-1));
    expect(wallIndex, greaterThan(dockStart));
    expect(scanIndex, greaterThan(wallIndex));
    expect(vaultIndex, greaterThan(scanIndex));
    expect(searchIndex, greaterThan(vaultIndex));
    expect(shell, contains('MediaQuery.disableAnimationsOf(context)'));
  });

  test('mobile header prioritizes branded notifications over store tools', () {
    final appBarActions = RegExp(
      r'List<Widget> _buildAppBarActions\([\s\S]*?\n  @override',
    ).firstMatch(shell)!.group(0)!;

    expect(appBarActions, contains('_GrookaiNotificationButton('));
    expect(appBarActions, contains('hasUnread: _pulseUnreadCount > 0'));
    expect(appBarActions, contains('onPressed: _openNotifications'));
    expect(appBarActions, isNot(contains("tooltip: 'Vendor Mode'")));
    expect(appBarActions, isNot(contains('Icons.storefront_outlined')));
  });

  test('root loading and collection layouts mirror their final geometry', () {
    expect(shell, contains('class _MyWallLoadingSkeleton'));
    expect(shell, contains("label: 'Loading your Wall'"));
    expect(
      vault,
      contains('final resolvedViewMode = resolveCardViewModeForTextScale('),
    );
    expect(
      vault,
      contains('final columns = resolvedViewMode != AppCardViewMode.grid'),
    );
    expect(vault, contains('_gridPreferences.value.clamp('));
    expect(vault, contains('_buildVaultLoadingSliver(columns: columns)'));
    expect(vault, contains('class _VaultGridLoadingTile'));
  });

  test('Wall tabs and card actions remain visible and touchable', () {
    expect(wall, contains("tooltip: 'Add section'"));
    expect(wall, contains('constraints: const BoxConstraints(minHeight: 44)'));
    expect(wall, contains('MediaQuery.disableAnimationsOf(context)'));
    expect(wall, contains("tooltip: 'Manage card'"));
  });

  test('Discover and Following use a familiar social feed hierarchy', () {
    expect(network, contains('layout: NetworkInteractionCardLayout.feed'));
    expect(networkCard, contains('Widget _buildSocialFeed'));
    expect(networkCard, contains('width: constraints.maxWidth'));
    expect(networkCard, contains('GvGridConstants.cardAspectRatio'));
    expect(networkCard, isNot(contains('fit: BoxFit.cover')));
    expect(network, contains('padding: EdgeInsets.zero'));
    expect(networkCard, contains('BoxConstraints(minHeight: 44)'));
    expect(networkCard, isNot(contains('compactFeed')));
    expect(network, contains('Icons.chat_bubble_outline_rounded'));
    expect(network, contains('Icons.info_outline_rounded'));
    expect(network, contains('class _NetworkIconAction'));
    expect(network, isNot(contains('class _NetworkPrimaryActionShell')));
  });

  test(
    'Search discovery is local, bounded, and routes only to real surfaces',
    () {
      expect(search, contains("'catalog_recent_searches_v1'"));
      expect(search, contains('localRecentSearchStorageKey('));
      expect(recentSearches, contains("'catalog_recent_searches_v2'"));
      expect(recentSearches, contains('kLocalRecentSearchLimit = 5'));
      expect(recentSearches, contains('normalizeLocalRecentSearches'));
      expect(recentSearches, contains('recordLocalRecentSearch'));
      expect(recentSearches, contains('removeLocalRecentSearch'));
      expect(search, contains("title: 'Sets'"));
      expect(search, contains("title: 'Dex'"));
      expect(search, contains("title: 'Special versions'"));
      expect(search, isNot(contains("title: 'Artists'")));
      expect(search, contains('const GrookaiDexScreen()'));
    },
  );

  test('Card detail uses progressive disclosure and one bottom action', () {
    expect(
      cardDetail,
      contains('enum _CardDetailTab { overview, collection, activity }'),
    );
    expect(cardDetail, contains("_CardDetailTab.overview => 'Overview'"));
    expect(cardDetail, contains("_CardDetailTab.collection => 'Collection'"));
    expect(cardDetail, contains("_CardDetailTab.activity => 'Activity'"));
    expect(cardDetail, contains("tooltip: 'More card actions'"));
    expect(cardDetail, contains('height: 52'));
  });

  test('Dex opens as a flat grid with one collection summary', () {
    expect(
      dex,
      contains(
        '_DexSpeciesPresentation _presentation = _DexSpeciesPresentation.grid',
      ),
    );
    expect(dex, contains("'National collection  '"));
    expect(dex, contains("label: const Text('Filters')"));
    expect(dex, contains('showModalBottomSheet<void>'));
    expect(dex, contains('class _DexLoadingGrid'));
    expect(dex, isNot(contains('class _DexHeroCard')));
    expect(dex, isNot(contains('Character completion, not just a checklist.')));
  });
}
