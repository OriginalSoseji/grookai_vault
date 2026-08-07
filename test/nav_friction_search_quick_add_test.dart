import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('search result tiles quick-add only one governed printing', () {
    final search = File('lib/main.dart').readAsStringSync();

    expect(search, contains('class _CatalogQuickAddButton'));
    expect(search, contains('Semantics('));
    expect(
      search,
      contains("label: isBusy ? 'Adding to vault' : 'Add to Vault'"),
    );
    expect(search, contains('Future<void> _quickAddSearchResultToVault'));
    expect(search, contains('printingOptions.length != 1'));
    expect(search, contains('await _openSearchCardActionHub(card)'));
    expect(
      search,
      contains('cardPrintingId: _resolveInitialCatalogPrintingId'),
    );
    expect(search, contains("surface: 'search_result_tile'"));
    expect(search, contains("label: 'View copy'"));
    expect(search, contains('VaultManageCardScreen(gvviId: gvviId)'));
    expect(search, contains('onQuickAdd: showQuickAdd'));
    expect(
      search,
      contains(
        'onTap: () => widget.signedOutBrowse\n'
        '            ? _openCardDetail(card)\n'
        '            : _openSearchCardActionHub(card)',
      ),
    );
    expect(
      search,
      contains('!widget.signedOutBrowse && !(ownershipState?.owned ?? false)'),
    );
  });

  test('search quick add reuses existing vault write path', () {
    final search = File('lib/main.dart').readAsStringSync();

    expect(search, contains('Future<String?> _addToVaultFromSearch'));
    expect(search, contains('VaultCardService.addOrIncrementVaultItem'));
    expect(search, contains('OnboardingLadderService.recordOwnedBestEffort'));
    expect(search, contains('_refreshCatalogOwnershipState(card.id)'));
    expect(search, isNot(contains('insert(\'vault_items\'')));
    expect(search, isNot(contains('insert("vault_items"')));
  });
}
