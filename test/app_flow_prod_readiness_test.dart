import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('card detail Add to Vault is wired to exact owned copy flow', () {
    final screen = File('lib/card_detail_screen.dart').readAsStringSync();
    final service = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();

    expect(screen, contains('Future<void> _addToVault() async'));
    expect(screen, contains('VaultCardService.addOrIncrementVaultItem'));
    expect(screen, contains('cardPrintingId: _selectedPrintingOption?.id'));
    expect(screen, contains("eventType: 'add_to_vault'"));
    expect(screen, contains('VaultGvviScreen(gvviId: gvviId)'));
    expect(
      screen,
      contains("throw Exception('Exact copy could not be created.')"),
    );
    expect(screen, contains('Sign in to add cards to your vault.'));

    expect(service, contains("'vault-add-card-instance-v1'"));
    expect(service, contains("'card_print_id': cardId"));
    expect(
      service,
      contains("'card_printing_id': _trimmedOrNull(cardPrintingId)"),
    );
    expect(service, contains("result['gv_vi_id']"));
  });

  test('card detail bottom actions stay fixed and scheme-colored', () {
    final screen = File('lib/card_detail_screen.dart').readAsStringSync();

    expect(screen, contains("tooltip: 'Compare'"));
    expect(screen, contains('if (_canCompare)'));
    expect(
      screen,
      isNot(contains("tooltip: _canCompare ? 'Compare' : 'Share'")),
    );
    expect(screen, isNot(contains('Colors.red.shade400')));
    expect(screen, contains('final tint = active ? colorScheme.error'));
  });

  test('visible Scan entry is deliberately parked behind construction gate', () {
    final main = File('lib/main.dart').readAsStringSync();
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final placeholder = File(
      'lib/screens/scanner/scanner_build_placeholder_screen.dart',
    ).readAsStringSync();

    expect(
      main,
      contains(
        'const bool kScannerConstructionPlaceholderEnabled = bool.fromEnvironment',
      ),
    );
    expect(main, contains("defaultValue: true"));
    expect(shell, contains('Future<void> _startScanFlow() async'));
    expect(shell, contains('if (kScannerConstructionPlaceholderEnabled)'));
    expect(shell, contains('ScannerBuildPlaceholderScreen'));
    expect(placeholder, contains('Scanner is being built'));
    expect(placeholder, contains('Search cards instead'));
    expect(placeholder, contains('Open vault'));
  });

  test(
    'legacy scanner identify placeholder is not routed as the scan entry',
    () {
      final shell = File('lib/main_shell.dart').readAsStringSync();
      final legacy = File(
        'lib/screens/scanner/scan_identify_screen.dart',
      ).readAsStringSync();

      expect(legacy, contains("'card-identify'"));
      expect(legacy, contains("body: {'note': 'placeholder v1'}"));
      expect(shell, isNot(contains('ScanIdentifyScreen')));
    },
  );

  test('identity scan uses real queue and result pipeline', () {
    final screen = File(
      'lib/screens/identity_scan/identity_scan_screen.dart',
    ).readAsStringSync();
    final service = File(
      'lib/services/identity/identity_scan_service.dart',
    ).readAsStringSync();

    expect(screen, contains('IdentityScanService'));
    expect(screen, contains('VaultCardService.addOrIncrementVaultItem'));
    expect(screen, contains("Selected card is missing card_print_id."));
    expect(screen, contains("Add to Vault failed:"));

    expect(service, contains("'identity-scans'"));
    expect(service, contains("'identity_scan_enqueue_v1'"));
    expect(service, contains("'identity_scan_get_v1?event_id=\$eventId'"));
    expect(service, contains("'identity_scan_event_results'"));
  });

  test('Dex is drawer-only and not a bottom navigation destination', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final bottomNavBlock = RegExp(
      r'Widget _buildMobileBottomDock\([\s\S]*?\n\s*Widget _buildDockButton',
    ).firstMatch(shell)!.group(0)!;

    expect(bottomNavBlock, contains("label: 'Search'"));
    expect(bottomNavBlock, contains("label: 'Feed'"));
    expect(bottomNavBlock, contains("label: 'Scan'"));
    expect(bottomNavBlock, contains("label: 'Wall'"));
    expect(bottomNavBlock, contains("label: 'Vault'"));
    expect(bottomNavBlock, isNot(contains("label: 'Dex'")));
    expect(bottomNavBlock, isNot(contains('_openDex()')));
    expect(shell, contains("label: 'Grookai Dex'"));
    expect(shell, contains('onTap: () => _closeThenAsync(context, onOpenDex)'));
  });

  test('primary shell destinations are dock-only and drawer stays secondary', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final bottomNavBlock = RegExp(
      r'Widget _buildMobileBottomDock\([\s\S]*?\n\s*Widget _buildDockButton',
    ).firstMatch(shell)!.group(0)!;
    final drawerBlock = RegExp(
      r'class _GrookaiAppDrawer extends StatelessWidget[\s\S]*?class _GrookaiDrawerTile',
    ).firstMatch(shell)!.group(0)!;

    for (final label in ['Search', 'Feed', 'Wall', 'Vault']) {
      expect(bottomNavBlock, contains("label: '$label'"));
      expect(drawerBlock, isNot(contains("label: '$label'")));
    }

    expect(drawerBlock, isNot(contains("label: 'My Wall'")));
    expect(drawerBlock, isNot(contains("label: 'Messages'")));
    expect(drawerBlock, contains("label: 'Grookai Dex'"));
    expect(drawerBlock, contains("label: 'Sets'"));
    expect(drawerBlock, contains("label: 'Compare'"));
    expect(drawerBlock, contains("label: 'Account'"));
    expect(shell, contains('Icons.collections_bookmark_rounded'));
    expect(
      shell,
      contains(
        "if (isDesktopShell && _destination != _ShellDestination.search)",
      ),
    );
  });

  test('card artwork uses disk-backed cached image rendering', () {
    final artwork = File(
      'lib/widgets/card_surface_artwork.dart',
    ).readAsStringSync();
    final zoomViewer = File(
      'lib/widgets/card_zoom_viewer.dart',
    ).readAsStringSync();
    final main = File('lib/main.dart').readAsStringSync();

    expect(artwork, contains('CachedNetworkImage'));
    expect(artwork, contains('memCacheWidth'));
    expect(artwork, contains('maxWidthDiskCache'));
    expect(zoomViewer, contains('CachedNetworkImageProvider'));
    expect(main, contains('_configureAppImageCache'));
  });

  test('mobile Japanese display mirrors web English primary contract', () {
    final identity = File(
      'lib/services/identity/display_identity.dart',
    ).readAsStringSync();
    final japaneseNameMap = File(
      'lib/services/identity/pokemon_japanese_name_map.dart',
    ).readAsStringSync();
    final search = File('lib/main.dart').readAsStringSync();
    final cardDetail = File('lib/card_detail_screen.dart').readAsStringSync();
    final setDetail = File(
      'lib/screens/sets/public_set_detail_screen.dart',
    ).readAsStringSync();

    expect(identity, contains('japanesePokemonNameToEnglish'));
    expect(
      identity,
      contains('_resolveEnglishPrimaryNameForJapanesePrintedName'),
    );
    expect(identity, contains('printedName'));
    expect(japaneseNameMap, contains("'ピカチュウ': 'Pikachu'"));
    expect(japaneseNameMap, contains("'コイル': 'Magnemite'"));
    expect(search, contains('displayIdentity.printedName'));
    expect(cardDetail, contains('_displayIdentity.printedName'));
    expect(setDetail, contains('displayIdentity.printedName'));
  });

  test('set card image zoom is not a details dead end', () {
    final setDetail = File(
      'lib/screens/sets/public_set_detail_screen.dart',
    ).readAsStringSync();
    final zoomViewer = File(
      'lib/widgets/card_zoom_viewer.dart',
    ).readAsStringSync();
    final cardArtwork = File(
      'lib/widgets/card_surface_artwork.dart',
    ).readAsStringSync();
    final publicCollector = File(
      'lib/screens/public_collector/public_collector_screen.dart',
    ).readAsStringSync();
    final dexSpecies = File(
      'lib/screens/dex/grookai_dex_species_screen.dart',
    ).readAsStringSync();
    final networkNearby = File(
      'lib/screens/network/network_nearby_screen.dart',
    ).readAsStringSync();
    final networkInbox = File(
      'lib/screens/network/network_inbox_screen.dart',
    ).readAsStringSync();
    final networkThread = File(
      'lib/screens/network/network_thread_screen.dart',
    ).readAsStringSync();
    final cardDetail = File('lib/card_detail_screen.dart').readAsStringSync();
    final search = File('lib/main.dart').readAsStringSync();
    final vault = File('lib/main_vault.dart').readAsStringSync();

    expect(setDetail, contains('void _openCardDetails(PublicSetCard card)'));
    expect(setDetail, contains('onViewDetails: () => _openCardDetails(card)'));
    expect(setDetail, contains("'Details'"));

    expect(zoomViewer, contains('final VoidCallback? onViewDetails;'));
    expect(zoomViewer, contains("this.detailsLabel = 'View details'"));
    expect(zoomViewer, contains('FilledButton.icon'));
    expect(zoomViewer, contains('_handleViewDetails(currentItem)'));

    expect(cardArtwork, contains('final VoidCallback? onViewDetails;'));
    expect(cardArtwork, contains('onViewDetails: onViewDetails'));

    expect(publicCollector, contains('void openCardDetails()'));
    expect(publicCollector, contains('onViewDetails: openCardDetails'));
    expect(dexSpecies, contains('onViewDetails: onTap'));
    expect(networkNearby, contains('onViewDetails: onOpenCard'));
    expect(networkInbox, contains('onViewDetails: () {'));
    expect(networkInbox, contains('onOpenThread();'));
    expect(networkThread, contains("detailsLabel: 'View card'"));
    expect(cardDetail, contains('void openRelatedVersion()'));
    expect(cardDetail, contains('onViewDetails: openRelatedVersion'));
    expect(
      search,
      contains('onViewDetails: interactionLocked ? null : onViewCard'),
    );
    expect(vault, contains("detailsLabel: 'Manage card'"));
  });

  test('Feed inventory cards stay card-first and avoid FOMO hook copy', () {
    final networkCard = File(
      'lib/widgets/network/network_interaction_card.dart',
    ).readAsStringSync();
    final networkScreen = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();

    expect(networkScreen, contains('_buildInventoryContext'));
    expect(networkScreen, contains("'Listed \$listedAge'"));
    expect(networkScreen, contains("'Graded \$summary'"));
    expect(networkScreen, contains("'Listed for sale'"));
    expect(networkScreen, isNot(contains('Just listed')));
    expect(networkScreen, isNot(contains('Available now')));
    expect(networkScreen, isNot(contains('High-end pick')));
    expect(networkScreen, isNot(contains('local_fire_department')));
    expect(networkScreen, isNot(contains('heroHook:')));

    final artworkIndex = networkCard.indexOf('_NetworkPosterArtwork');
    final topContextIndex = networkCard.indexOf('if (topContext != null)');
    expect(artworkIndex, greaterThanOrEqualTo(0));
    expect(topContextIndex, greaterThan(artworkIndex));
  });

  test('Vault header promotes estimated value without fake trend math', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();

    expect(vault, contains('estimatedValue'));
    expect(vault, contains('_formatVaultValue'));
    expect(vault, contains('visiblePrice * ownedCount'));
    expect(vault, contains('valued copies'));
    expect(vault, contains('30d trend pending'));
  });

  test('bottom dock collapse pauses while modal routes are active', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();

    expect(shell, contains("ModalRoute.of(context)?.isCurrent == false"));
    expect(
      shell,
      contains(
        'final collapsed = routeIsCurrent && _bottomNavCollapsed && !keyboardVisible',
      ),
    );
  });

  test('bottom dock uses stable slots with persistent labels', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final bottomNavBlock = RegExp(
      r'Widget _buildMobileBottomDock\([\s\S]*?\n\s*Widget _buildDockButton',
    ).firstMatch(shell)!.group(0)!;
    final dockButtonBlock = RegExp(
      r'Widget _buildDockButton\([\s\S]*?\n\}',
    ).firstMatch(shell)!.group(0)!;

    expect(bottomNavBlock, contains('maxWidth: 390'));
    expect(bottomNavBlock, contains('mainAxisSize: MainAxisSize.max'));
    expect(bottomNavBlock, contains('Expanded('));
    expect(bottomNavBlock, contains('isPrimaryAction: true'));
    expect(dockButtonBlock, isNot(contains('selected ? 86 : 52')));
    expect(dockButtonBlock, isNot(contains('if (!collapsed && selected)')));
    expect(dockButtonBlock, contains('BoxShape.circle'));
    expect(dockButtonBlock, contains('Text('));
  });

  test('search controls do not hide secondary navigation shortcuts', () {
    final search = File('lib/main.dart').readAsStringSync();

    expect(search, isNot(contains('Browse sets')));
    expect(search, isNot(contains('Open collector wall')));
    expect(search, isNot(contains('Future<void> _openSetsScreen()')));
    expect(
      search,
      isNot(contains('Future<void> _openPublicCollectorBySlug()')),
    );
    expect(search, isNot(contains('class _SearchHeaderIconButton')));
  });

  test('search secondary filters are collapsed behind a sheet', () {
    final search = File('lib/main.dart').readAsStringSync();

    expect(search, contains('int get _activeSearchFilterCount'));
    expect(search, contains("'Filters · \$activeCount'"));
    expect(search, contains('Future<void> _openSearchFiltersSheet'));
    expect(search, contains('showModalBottomSheet<void>'));
    expect(search, contains('_buildSearchFilterButton('));
    expect(search, isNot(contains('Widget _buildRarityChip(')));
    expect(search, isNot(contains('Widget _buildIdentityChip(')));
  });

  test('app copy avoids internal vault jargon in visible labels', () {
    final files = [
      'lib/main.dart',
      'lib/main_vault.dart',
      'lib/screens/vault/vault_manage_card_screen.dart',
      'lib/screens/vault/vault_gvvi_screen.dart',
      'lib/screens/gvvi/public_gvvi_screen.dart',
    ].map((path) => File(path).readAsStringSync()).join('\n');

    for (final copy in [
      'Dupes',
      'structural vault shell',
      'No cards found in your vault',
      'No cards surfaced yet',
      'No copies surfaced yet',
      'Trending cards will surface here',
      'This GVVI could not be loaded.',
      "label: 'GVVI'",
    ]) {
      expect(files, isNot(contains(copy)));
    }

    expect(files, contains('Duplicates'));
    expect(files, contains('Copy ID'));
  });

  test('vault filters are collapsed and search field stays stable', () {
    final vault = File('lib/main_vault.dart').readAsStringSync();

    expect(vault, contains('Future<void> _openVaultFiltersSheet()'));
    expect(vault, contains('int get _activeVaultFilterCount'));
    expect(vault, contains('Search vault · by card, set, or Pokemon'));
    expect(vault, isNot(contains('Search Pokemon')));
    expect(vault, isNot(contains('Widget _buildVaultViewChip(')));
    expect(vault, isNot(contains('_activeSearchValueForView')));
    expect(vault, contains('if (_view == _VaultStructuralView.all) ...['));
    expect(vault, contains("'Recently Added'"));
  });

  test('card tile surfaces use shared grid geometry constants', () {
    final constants = File(
      'lib/theme/gv_grid_constants.dart',
    ).readAsStringSync();
    final networkCard = File(
      'lib/widgets/network/network_interaction_card.dart',
    ).readAsStringSync();
    final setDetail = File(
      'lib/screens/sets/public_set_detail_screen.dart',
    ).readAsStringSync();
    final vault = File('lib/main_vault.dart').readAsStringSync();

    expect(constants, contains('static const double cardAspectRatio'));
    for (final rawRatio in ['0.68', '0.71', '0.78']) {
      expect(networkCard, isNot(contains(rawRatio)));
    }
    expect(networkCard, contains('GvGridConstants.cardAspectRatio'));
    expect(setDetail, contains('GvGridConstants.tileTapRadius'));
    expect(setDetail, contains('GvGridConstants.imageRadius'));
    expect(vault, contains('GvGridConstants.tileTapRadius'));
    expect(vault, contains('GvGridConstants.imageRadius'));
  });
}
