import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/pulse_service.dart';

PulseItem _pulseItem({
  required String eventId,
  required String eventType,
  required String rankBucket,
  required String completionSubjectType,
  required String primaryActionRoute,
  Map<String, dynamic> payload = const <String, dynamic>{},
}) {
  return PulseItem.fromJson(<String, dynamic>{
    'pulse_item_id': 'card_event:$eventId',
    'card_event_id': eventId,
    'event_type': eventType,
    'rank_bucket': rankBucket,
    'completion_subject_type': completionSubjectType,
    'primary_action_route': primaryActionRoute,
    'payload': payload,
  })!;
}

void main() {
  test('future completion payload route overrides the generic RPC route', () {
    final item = _pulseItem(
      eventId: 'future-event',
      eventType: 'dex_completion_crossed',
      rankBucket: 'completion',
      completionSubjectType: 'character',
      primaryActionRoute: '/collector/current-user',
      payload: const <String, dynamic>{
        'species_id': 'species-1',
        'species_slug': 'pikachu',
        'completion_route': '/dex/pikachu',
      },
    );

    expect(item.primaryActionRoute, '/dex/pikachu');
  });

  test(
    'legacy Dex completion IDs resolve to exact species routes in one pass',
    () {
      final item = _pulseItem(
        eventId: 'legacy-event',
        eventType: 'dex_completion_crossed',
        rankBucket: 'completion',
        completionSubjectType: 'character',
        primaryActionRoute: '/collector/current-user',
        payload: const <String, dynamic>{'subject_id': 'species-1'},
      );

      final resolved = resolvePulseDexCompletionRoutes(
        <PulseItem>[item],
        speciesRows: const <Map<String, dynamic>>[
          <String, dynamic>{
            'id': 'species-1',
            'slug': 'pikachu',
            'display_name': 'Pikachu',
          },
        ],
      ).single;

      expect(resolved.primaryActionRoute, '/dex/pikachu');
      expect(resolved.completionSubjectLabel, 'Pikachu');
      expect(resolved.payload['species_slug'], 'pikachu');
      expect(resolved.payload['completion_route'], '/dex/pikachu');
    },
  );

  test('unresolved legacy completion retains its supplied fallback route', () {
    final item = _pulseItem(
      eventId: 'unresolved-event',
      eventType: 'dex_completion_crossed',
      rankBucket: 'completion',
      completionSubjectType: 'character',
      primaryActionRoute: '/collector/current-user',
      payload: const <String, dynamic>{'subject_id': 'missing-species'},
    );

    final resolved = resolvePulseDexCompletionRoutes(<PulseItem>[item]).single;

    expect(resolved.primaryActionRoute, '/collector/current-user');
  });

  test('non-Dex activity is not rewritten by species resolution', () {
    final item = _pulseItem(
      eventId: 'vault-event',
      eventType: 'vault_added',
      rankBucket: 'collector_activity',
      completionSubjectType: '',
      primaryActionRoute: '/card/GV-PK-TEST-1',
      payload: const <String, dynamic>{'subject_id': 'species-1'},
    );

    final resolved = resolvePulseDexCompletionRoutes(
      <PulseItem>[item],
      speciesRows: const <Map<String, dynamic>>[
        <String, dynamic>{
          'id': 'species-1',
          'slug': 'pikachu',
          'display_name': 'Pikachu',
        },
      ],
    ).single;

    expect(resolved.primaryActionRoute, '/card/GV-PK-TEST-1');
  });
}
