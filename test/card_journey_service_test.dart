import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/card_journey_service.dart';

void main() {
  const cardPrintId = '11111111-1111-1111-1111-111111111111';

  test('empty state parses as no public activity', () async {
    final service = CardJourneyService(
      rpc: (functionName, {params}) async {
        expect(functionName, 'card_journey_snapshot_v1');
        expect(params?['p_card_print_id'], cardPrintId);
        return <Map<String, dynamic>>[
          <String, dynamic>{
            'card_print_id': cardPrintId,
            'owner_collector_count': 0,
            'trade_collector_count': 0,
            'sale_collector_count': 0,
            'want_collector_count': 0,
            'moment_count': 0,
            'geography_area_count': 0,
            'has_public_activity': false,
          },
        ];
      },
    );

    final snapshot = await service.fetchSnapshot(cardPrintId);

    expect(snapshot.isEmpty, isTrue);
    expect(snapshot.hasPublicActivity, isFalse);
    expect(snapshot.ownerCollectorCount, 0);
    expect(
      snapshot.ownershipSummary,
      '0 collectors own this · 0 for trade · 0 for sale · 0 want a copy',
    );
  });

  test(
    'public snapshot parses ownership, intent, want, and activity counts',
    () async {
      final service = CardJourneyService(
        rpc: (functionName, {params}) async {
          expect(functionName, 'card_journey_snapshot_v1');
          return <String, dynamic>{
            'card_print_id': cardPrintId,
            'owner_collector_count': '15',
            'trade_collector_count': 4,
            'sale_collector_count': 2,
            'want_collector_count': 8,
            'moment_count': 5,
            'geography_area_count': 3,
            'has_public_activity': true,
          };
        },
      );

      final snapshot = await service.fetchSnapshot(cardPrintId);

      expect(snapshot.isEmpty, isFalse);
      expect(snapshot.ownerCollectorCount, 15);
      expect(snapshot.tradeCollectorCount, 4);
      expect(snapshot.saleCollectorCount, 2);
      expect(snapshot.wantCollectorCount, 8);
      expect(snapshot.momentCount, 5);
      expect(snapshot.geographyAreaCount, 3);
      expect(
        snapshot.ownershipSummary,
        '15 collectors own this · 4 for trade · 2 for sale · 8 want a copy',
      );
    },
  );

  test(
    'private suppression is delegated to public collectors RPC output',
    () async {
      final called = <String>[];
      final service = CardJourneyService(
        rpc: (functionName, {params}) async {
          called.add(functionName);
          expect(functionName, 'card_journey_collectors_v1');
          expect(params?['p_kind'], 'owners');
          return <Map<String, dynamic>>[
            <String, dynamic>{
              'owner_user_id': '22222222-2222-2222-2222-222222222222',
              'owner_slug': 'trade-public',
              'owner_display_name': 'Trade Public',
              'owner_avatar_path': 'https://example.test/avatar-a.png',
              'intent': 'trade',
              'copy_count': 2,
              'contact_available': true,
              'created_at': '2026-07-08T12:00:00Z',
              'next_cursor_created_at': '2026-07-08T12:00:00Z',
              'next_cursor_user_id': '22222222-2222-2222-2222-222222222222',
            },
            <String, dynamic>{
              'owner_user_id': '33333333-3333-3333-3333-333333333333',
              'owner_slug': 'showcase-public',
              'owner_display_name': 'Showcase Public',
              'owner_avatar_path': null,
              'intent': 'showcase',
              'copy_count': 1,
              'contact_available': false,
              'created_at': '2026-07-08T11:00:00Z',
              'next_cursor_created_at': '2026-07-08T11:00:00Z',
              'next_cursor_user_id': '33333333-3333-3333-3333-333333333333',
            },
          ];
        },
      );

      final page = await service.fetchCollectors(cardPrintId: cardPrintId);

      expect(called, <String>['card_journey_collectors_v1']);
      expect(called, isNot(contains('card_journey_public_copy_sources_v1')));
      expect(page.collectors, hasLength(2));
      expect(page.collectors.first.ownerSlug, 'trade-public');
      expect(page.collectors.first.canMessage, isTrue);
      expect(page.collectors.last.ownerSlug, 'showcase-public');
      expect(page.collectors.last.canMessage, isFalse);
      expect(page.hasNextCursor, isTrue);
    },
  );

  test('wants stay aggregate-only with no want collectors filter', () async {
    expect(
      CardJourneyCollectorFilter.values.map((filter) => filter.rpcKind),
      <String>['owners', 'trade', 'sale'],
    );

    final service = CardJourneyService(
      rpc: (functionName, {params}) async {
        if (functionName == 'card_journey_snapshot_v1') {
          return <String, dynamic>{
            'card_print_id': cardPrintId,
            'owner_collector_count': 0,
            'trade_collector_count': 0,
            'sale_collector_count': 0,
            'want_collector_count': 8,
            'moment_count': 0,
            'geography_area_count': 0,
            'has_public_activity': true,
          };
        }
        fail('Unexpected RPC for aggregate-only wants: $functionName');
      },
    );

    final snapshot = await service.fetchSnapshot(cardPrintId);

    expect(snapshot.wantCollectorCount, 8);
    expect(snapshot.hasPublicActivity, isTrue);
  });

  test('moments expose display-safe fields without raw payload', () async {
    final service = CardJourneyService(
      rpc: (functionName, {params}) async {
        expect(functionName, 'card_journey_moments_v1');
        expect(params?['p_limit'], 5);
        return <Map<String, dynamic>>[
          <String, dynamic>{
            'event_id': '44444444-4444-4444-4444-444444444444',
            'event_type': 'vault_added',
            'created_at': '2026-07-08T14:00:00Z',
            'actor_slug': 'collector-a',
            'actor_display_name': 'Collector A',
            'actor_avatar_path': 'https://example.test/a.png',
            'card_print_id': cardPrintId,
            'moment_line': 'Collector A added Pikachu',
            'next_cursor_created_at': '2026-07-08T14:00:00Z',
            'next_cursor_event_id': '44444444-4444-4444-4444-444444444444',
            'payload': <String, dynamic>{'must_not': 'surface'},
          },
        ];
      },
    );

    final page = await service.fetchMoments(cardPrintId: cardPrintId);

    expect(page.moments, hasLength(1));
    expect(page.moments.single.momentLine, 'Collector A added Pikachu');
    expect(page.moments.single.eventType, 'vault_added');
    expect(page.hasNextCursor, isTrue);
  });

  test('RPC failure is surfaced with the failed function name', () async {
    final service = CardJourneyService(
      rpc: (functionName, {params}) async {
        throw StateError('rpc unavailable');
      },
    );

    await expectLater(
      service.fetchGeography(cardPrintId),
      throwsA(
        isA<CardJourneyServiceException>()
            .having(
              (error) => error.rpcName,
              'rpcName',
              'card_journey_geography_v1',
            )
            .having(
              (error) => error.cause.toString(),
              'cause',
              contains('rpc unavailable'),
            ),
      ),
    );
  });
}
