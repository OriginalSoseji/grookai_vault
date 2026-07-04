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
      r'child: NavigationBar\([\s\S]*?destinations: const \[[\s\S]*?\n\s*\],\n\s*\),',
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
}
