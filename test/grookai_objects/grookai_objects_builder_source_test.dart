import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Grookai Objects hub uses embedded owned-card builder routes', () {
    final source = File(
      'lib/screens/grookai_objects/grookai_objects_hub_screen.dart',
    ).readAsStringSync();
    final shell = File('lib/main_shell.dart').readAsStringSync();

    expect(source, contains('VaultCardService.getCanonicalCollectorRows'));
    expect(source, contains('MemoryCardCaptureScreen'));
    expect(source, contains('ForSaleTermsScreen'));
    expect(source, contains('LotPricingScreen'));
    expect(source, contains('CollectorMemoriesScreen'));
    expect(source, contains('This card needs an exact copy'));
    expect(source, contains('Price Lot'));
    expect(source, contains('const int _maxLotCards = 12'));
    expect(source, contains('Lots can include up to 12 cards.'));
    expect(source, isNot(contains('GrookaiObjectsHubAction')));
    expect(source, isNot(contains('Open Vault')));
    expect(shell, isNot(contains('Open an owned card, then tap Share Memory')));
  });
}
