import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/provisional_card.dart';
import 'package:grookai_vault/services/provisional/provisional_presentation.dart';

void main() {
  test('provisional card model rejects canonical identity leakage', () {
    expect(
      () => PublicProvisionalCard.fromJson(<String, dynamic>{
        'candidate_id': 'candidate-1',
        'display_name': 'Pikachu',
        'set_hint': 'sv01',
        'number_hint': '025/198',
        'provisional_state': 'RAW',
        'provisional_label': 'UNCONFIRMED',
        'public_explanation': provisionalTrustCopy,
        'gv_id': 'GV-PK-SV01-025',
      }),
      throwsFormatException,
    );
  });

  test('provisional language stays within approved calm copy', () {
    final card = PublicProvisionalCard.fromJson(<String, dynamic>{
      'candidate_id': 'candidate-1',
      'display_name': 'Pikachu',
      'set_hint': 'sv01',
      'number_hint': '025/198',
      'provisional_state': 'CLASSIFIED',
      'provisional_label': 'UNDER REVIEW',
      'public_explanation': provisionalTrustCopy,
    });

    expect(card.displayLabel, provisionalUnderReviewLabel);
    expect(card.identityLine, 'sv01 #025/198');
    expect(provisionalDisplayLabel('UNCONFIRMED'), provisionalUnconfirmedLabel);
    expect(provisionalTrustCopy, 'Visible while under review.');
    expect(provisionalNotCanonCopy, 'Not part of the canonical catalog yet.');
  });

  test('Flutter provisional read layer uses public web APIs only', () {
    final serviceSource = File(
      'lib/services/provisional/provisional_service.dart',
    ).readAsStringSync();
    final continuitySource = File(
      'lib/services/provisional/provisional_continuity_service.dart',
    ).readAsStringSync();

    expect(serviceSource, contains('/api/provisional/discovery'));
    expect(continuitySource, contains('/api/provisional/'));
    expect(serviceSource, isNot(contains('canon_warehouse_candidates')));
    expect(continuitySource, isNot(contains('canon_warehouse_candidates')));
  });

  test('app provisional detail screen exposes no canonical actions', () {
    final source = File(
      'lib/screens/provisional/provisional_card_screen.dart',
    ).readAsStringSync();

    expect(
      source,
      contains('Do not add vault, pricing, provenance, ownership, or GV-ID'),
    );
    expect(source, isNot(contains('AddToVault')));
    expect(source, isNot(contains('ContactOwnerButton')));
    expect(source, isNot(contains('CardSurfacePrice')));
  });
}
