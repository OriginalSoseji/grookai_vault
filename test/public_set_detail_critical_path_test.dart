import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/ownership_state.dart';
import 'package:grookai_vault/screens/sets/public_set_detail_screen.dart';

void main() {
  test('set ownership signal uses the count already loaded with each card', () {
    final state = buildSetCardOwnershipSignalState(
      hasSignedInViewer: true,
      ownedCount: 3,
    );

    expect(state, isNotNull);
    expect(state!.owned, isTrue);
    expect(state.ownedCount, 3);
    expect(state.primaryVaultItemId, isNull);
    expect(state.primaryGvviId, isNull);
    expect(state.bestAction, OwnershipAction.none);
  });

  test('set ownership signal stays hidden for signed-out viewers', () {
    final state = buildSetCardOwnershipSignalState(
      hasSignedInViewer: false,
      ownedCount: 3,
    );

    expect(state, isNull);
  });

  test('set ownership signal represents a signed-in zero count as unowned', () {
    final state = buildSetCardOwnershipSignalState(
      hasSignedInViewer: true,
      ownedCount: 0,
    );

    expect(state, isNotNull);
    expect(state!.owned, isFalse);
    expect(state.ownedCount, 0);
  });

  test(
    'set detail does not await the full ownership resolver before paint',
    () {
      final source = File(
        'lib/screens/sets/public_set_detail_screen.dart',
      ).readAsStringSync();

      expect(source, isNot(contains('OwnershipResolverAdapter')));
      expect(source, isNot(contains('_primeOwnership')));
      expect(source, isNot(contains('await _ownershipAdapter.primeBatch')));
      expect(source, contains('ownedCount: card.ownedCount'));
    },
  );
}
