import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/network/pulse_memory_detail_screen.dart';
import 'package:grookai_vault/services/network/pulse_service.dart';

PulseItem _memoryItem() {
  return PulseItem.fromJson(<String, dynamic>{
    'pulse_item_id': 'pulse-memory-1',
    'card_event_id': 'event-memory-1',
    'event_type': 'collector_memory_published',
    'rank_bucket': 'collector_activity',
    'created_at': '2026-08-11T12:00:00Z',
    'actor_user_id': '11111111-1111-1111-1111-111111111111',
    'actor_slug': 'collector-one',
    'actor_display_name': 'Collector One',
    'card_print_id': '22222222-2222-2222-2222-222222222222',
    'gv_id': '',
    'card_name': 'Pikachu',
    'set_code': 'PROMO',
    'set_name': 'Promo',
    'card_number': '1',
    'display_image_url': null,
    'ownership_context': 'memory',
    'payload': <String, dynamic>{
      'memory_id': '33333333-3333-3333-3333-333333333333',
      'memory_type': 'occasion',
      'memory_note': 'Pulled together at trade night.',
      'memory_photo_path':
          '11111111-1111-1111-1111-111111111111/memories/'
          '33333333-3333-3333-3333-333333333333/photo',
      'memory_place_label': 'Denver',
      'memory_occasion_label': 'Trade night',
      'memory_date': '2026-08-10',
    },
  })!;
}

void main() {
  test('published Memory payload remains a distinct Pulse content type', () {
    final item = _memoryItem();

    expect(item.isMemory, isTrue);
    expect(item.memoryId, '33333333-3333-3333-3333-333333333333');
    expect(item.memoryNote, 'Pulled together at trade night.');
    expect(item.memoryPlaceLabel, 'Denver');
    expect(item.memoryOccasionLabel, 'Trade night');
    expect(item.memoryDate, '2026-08-10');

    final signed = item.copyWithMemoryPhotoUrl(
      'https://storage.example.test/signed-memory-photo',
    );
    expect(
      signed.memoryPhotoUrl,
      'https://storage.example.test/signed-memory-photo',
    );
    expect(signed.displayCardName, 'Pikachu');
  });

  testWidgets('Pulse Memory detail shows the Memory before the card action', (
    tester,
  ) async {
    var viewCardCalls = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: PulseMemoryDetailScreen(
          item: _memoryItem(),
          onViewCard: () async => viewCardCalls += 1,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('pulse-memory-detail')), findsOneWidget);
    expect(find.text('Shared by Collector One'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const Key('pulse-memory-note')),
      300,
    );
    expect(find.text('Pulled together at trade night.'), findsOneWidget);
    expect(find.text('Denver'), findsOneWidget);
    expect(find.text('Trade night'), findsOneWidget);
    expect(viewCardCalls, 0);

    await tester.scrollUntilVisible(
      find.byKey(const Key('pulse-memory-view-card-button')),
      300,
    );
    await tester.tap(find.byKey(const Key('pulse-memory-view-card-button')));
    await tester.pump();
    expect(viewCardCalls, 1);
  });

  test('Pulse UI routes Memories to Memory detail before card routes', () {
    final source = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();
    final memoryBranch = source.indexOf('if (item.isMemory)');
    final actionRoute = source.indexOf('_openPrimaryActionRoute(context)');

    expect(memoryBranch, greaterThanOrEqualTo(0));
    expect(actionRoute, greaterThan(memoryBranch));
    expect(source, contains("label: 'Memory'"));
    expect(source, contains("? 'View memory'"));
    expect(source, contains('item.memoryPhotoUrl ?? item.displayImageUrl'));
  });
}
