import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/grookai_dex/grookai_dex_service.dart';

void main() {
  test('scanner Vault action returns an explicit result to the app shell', () {
    final scanner = File(
      'lib/screens/scanner_v5/scan_capture_v5_screen.dart',
    ).readAsStringSync();
    final shell = File('lib/main_shell.dart').readAsStringSync();

    expect(scanner, contains('enum ScanCaptureV5Exit { vault }'));
    expect(
      scanner,
      contains('Navigator.of(context).pop(ScanCaptureV5Exit.vault)'),
    );
    expect(shell, contains('_pushPage<ScanCaptureV5Exit>'));
    expect(shell, contains('case ScanCaptureV5Exit.vault:'));
    expect(shell, contains('_selectDestination(_ShellDestination.vault)'));
    final vaultExitCase = shell.substring(
      shell.indexOf('case ScanCaptureV5Exit.vault:'),
      shell.indexOf('break;', shell.indexOf('case ScanCaptureV5Exit.vault:')),
    );
    expect(vaultExitCase, contains('_vaultKey.currentState?.reload()'));
  });

  test('Dex catalog retries one transient empty read', () async {
    var attempts = 0;

    final rows = await retryNonEmptyDexCatalogRead<int>(
      read: () async {
        attempts += 1;
        return attempts == 1 ? const <int>[] : const <int>[1025];
      },
      retryDelay: Duration.zero,
    );

    expect(attempts, 2);
    expect(rows, const <int>[1025]);
  });

  test('Dex catalog does not accept a persistent empty response as 0/0', () {
    expect(
      retryNonEmptyDexCatalogRead<int>(
        read: () async => const <int>[],
        retryDelay: Duration.zero,
      ),
      throwsA(isA<StateError>()),
    );
  });

  test('Dex initial load scopes completion mappings to owned cards', () {
    final dexService = File(
      'lib/services/grookai_dex/grookai_dex_service.dart',
    ).readAsStringSync();
    final vaultService = File(
      'lib/services/vault/vault_card_service.dart',
    ).readAsStringSync();
    final dexScreen = File(
      'lib/screens/dex/grookai_dex_screen.dart',
    ).readAsStringSync();

    final ownedCountsIndex = dexService.indexOf(
      'VaultCardService.getAllOwnedCounts',
    );
    final mappingsIndex = dexService.indexOf(
      'final completionRows = await _fetchDexCompletionRows',
    );

    expect(ownedCountsIndex, greaterThanOrEqualTo(0));
    expect(mappingsIndex, greaterThan(ownedCountsIndex));
    expect(dexService, contains('cardPrintIds: ownedCounts.keys'));
    expect(
      dexService,
      contains(".inFilter('card_print_id', cardPrintIdChunk)"),
    );
    expect(vaultService, contains("params: const {'p_card_print_ids': null}"));
    expect(dexScreen, contains('Loading Dex printings…'));
    expect(dexScreen, contains('initialUnavailable'));
    expect(dexScreen, contains('Dex metrics are temporarily unavailable.'));
    expect(
      dexScreen,
      contains("value: hasDexData ? '\${metricSpecies.length}' : '—'"),
    );
  });
}
