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
      '_fetchAllOwnedCounts(client))',
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
    expect(dexService, contains('_fetchOwnedSlabCounts'));
    expect(
      dexService,
      contains('VaultCardService.getOwnedCardTruthIncludingSlabs'),
    );
    expect(dexService, contains("'slab_cert_id'"));
    expect(vaultService, contains("select('slab_cert_id,card_printing_id')"));
    expect(vaultService, contains(".filter('card_print_id', 'is', null)"));
    expect(dexService, contains('unassignedPrintingCount: printings.isEmpty'));
    expect(vaultService, contains("params: const {'p_card_print_ids': null}"));
    expect(dexScreen, contains('Loading Dex printings…'));
    expect(dexScreen, contains('initialUnavailable'));
    expect(dexScreen, contains('Dex metrics are temporarily unavailable.'));
    expect(dexScreen, contains('value: hasDexData'));
    expect(dexScreen, contains("'\${metricSpecies.length}'"));
  });

  test('Dex detail dedupe uses the canonical multi-role priority', () {
    final dexService = File(
      'lib/services/grookai_dex/grookai_dex_service.dart',
    ).readAsStringSync();

    final priorityStart = dexService.indexOf('static int _dexRolePriority');
    final priorityEnd = dexService.indexOf(
      'static GrookaiDexSpeciesSummary',
      priorityStart,
    );
    final priority = dexService.substring(priorityStart, priorityEnd);

    expect(priority, contains("case 'primary':"));
    expect(priority, contains("case 'form_subject':"));
    expect(priority, contains("case 'tag_team':"));
    expect(priority, contains("case 'multi_subject':"));
    expect(priority, contains("case 'trainer_owned':"));
    expect(priority, contains("case 'manual_override':"));
    expect(priority, contains("case 'cameo':"));
    expect(priority, isNot(contains("case 'featured':")));
    expect(priority, isNot(contains("case 'variant':")));
  });

  test('Dex finish truth exposes only explicitly unassigned owned copies', () {
    const card = GrookaiDexCardPrint(
      cardPrintId: 'card-1',
      name: 'Pikachu',
      role: 'primary',
      countsForCompletion: true,
      ownedCount: 2,
      unassignedPrintingCount: 1,
      printings: <GrookaiDexPrintingOption>[
        GrookaiDexPrintingOption(
          id: 'normal',
          finishName: 'Normal',
          ownedCount: 1,
        ),
        GrookaiDexPrintingOption(id: 'reverse', finishName: 'Reverse Holo'),
      ],
    );

    expect(card.assignedPrintingCopyCount, 1);
    expect(card.unassignedPrintingCount, 1);
    expect(card.needsPrintingSelection, isTrue);
    expect(card.ownedOptionCount, 1);
    expect(card.missingOptionCount, 1);
  });

  test('Dex separates completion, additional, and cameo mappings', () {
    const primary = GrookaiDexCardPrint(
      cardPrintId: 'primary',
      name: 'Pikachu',
      role: 'primary',
      countsForCompletion: true,
      ownedCount: 1,
      printings: <GrookaiDexPrintingOption>[],
    );
    const additional = GrookaiDexCardPrint(
      cardPrintId: 'additional',
      name: 'Pikachu promo',
      role: 'manual_override',
      countsForCompletion: false,
      ownedCount: 0,
      printings: <GrookaiDexPrintingOption>[],
    );
    const cameo = GrookaiDexCardPrint(
      cardPrintId: 'cameo',
      name: 'Trainer card',
      role: 'cameo',
      countsForCompletion: false,
      ownedCount: 0,
      printings: <GrookaiDexPrintingOption>[],
    );
    const detail = GrookaiDexSpeciesDetail(
      speciesId: 'species-25',
      slug: 'pikachu',
      displayName: 'Pikachu',
      nationalDexNumber: 25,
      cards: <GrookaiDexCardPrint>[primary, additional, cameo],
    );

    expect(detail.completionCards.map((card) => card.cardPrintId), ['primary']);
    expect(detail.additionalCards.map((card) => card.cardPrintId), [
      'additional',
    ]);
    expect(detail.cameoCards.map((card) => card.cardPrintId), ['cameo']);
    expect(detail.totalPrintCount, 1);
    expect(detail.ownedPrintCount, 1);
  });

  test('Dex screens virtualize catalog and species card rows', () {
    final dexScreen = File(
      'lib/screens/dex/grookai_dex_screen.dart',
    ).readAsStringSync();
    final speciesScreen = File(
      'lib/screens/dex/grookai_dex_species_screen.dart',
    ).readAsStringSync();

    expect(dexScreen, contains('SliverList.builder'));
    expect(speciesScreen, contains('SliverList.builder'));
    expect(dexScreen, contains('final nextSpecies = currentPage.allSpecies'));
    expect(speciesScreen, contains('card.unassignedPrintingCount'));
  });
}
