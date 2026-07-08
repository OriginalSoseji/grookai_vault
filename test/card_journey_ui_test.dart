import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Card Journey section is feature flagged and placed before details', () {
    final source = File('lib/card_detail_screen.dart').readAsStringSync();

    expect(source, contains('kCardJourneysEnabled'));
    expect(source, contains('_loadJourneyOverview()'));
    expect(source, contains('_buildCardJourneySection(theme, colorScheme)'));

    final trustIndex = source.indexOf('_buildTrustRows(theme, colorScheme)');
    final journeyIndex = source.indexOf(
      '_buildCardJourneySection(theme, colorScheme)',
    );
    final detailsIndex = source.indexOf('_buildCardDetailsSection');
    expect(trustIndex, greaterThan(-1));
    expect(journeyIndex, greaterThan(trustIndex));
    expect(detailsIndex, greaterThan(journeyIndex));
  });

  test(
    'Card Journey renders approved empty, snapshot, moments, and geography copy',
    () {
      final source = File('lib/card_detail_screen.dart').readAsStringSync();

      expect(source, contains("'Around this card'"));
      expect(source, contains('You could be the first to vault this card.'));
      expect(
        source,
        contains("snapshot.ownerCollectorCount == 1 ? 'owns' : 'own'"),
      );
      expect(source, contains('this ·'));
      expect(source, contains('for trade ·'));
      expect(source, contains('for sale ·'));
      expect(source, contains('want a copy'));
      expect(source, contains('See all'));
      expect(source, contains('RECENT PUBLIC ACTIVITY'));
      expect(source, contains('Icons.location_on_outlined'));
      expect(source, contains('overview.geography.length >= 2'));
    },
  );

  test('Collectors sheet uses approved filters and keeps wants private', () {
    final source = File('lib/card_detail_screen.dart').readAsStringSync();

    expect(source, contains('Collectors ·'));
    expect(source, contains('Public collections only'));
    expect(source, contains('All ·'));
    expect(source, contains('For trade ·'));
    expect(source, contains('For sale ·'));
    expect(source, contains('wants stay private'));
    expect(source, contains('CardJourneyCollectorFilter.owners'));
    expect(source, contains('CardJourneyCollectorFilter.trade'));
    expect(source, contains('CardJourneyCollectorFilter.sale'));
    expect(source, isNot(contains('CardJourneyCollectorFilter.want')));
  });

  test(
    'Message affordance is trade or sale only and resolves contact target on tap',
    () {
      final screenSource = File(
        'lib/card_detail_screen.dart',
      ).readAsStringSync();
      final serviceSource = File(
        'lib/services/network/card_journey_service.dart',
      ).readAsStringSync();

      expect(screenSource, contains('if (collector.canMessage)'));
      expect(screenSource, contains('fetchContactVaultItemId'));
      expect(screenSource, contains('showContactOwnerComposerSheet'));
      expect(serviceSource, contains("intent == 'trade'"));
      expect(serviceSource, contains("intent == 'sell'"));
      expect(serviceSource, contains('v_card_contact_targets_v1'));
    },
  );
}
