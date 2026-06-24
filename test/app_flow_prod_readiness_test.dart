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
}
