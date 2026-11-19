import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:grookai_vault/services/competitive/pokemon_playables_service.dart';
import 'package:grookai_vault/widgets/cards/pokemon_playable_badge.dart';

const ordinary = '11111111-1111-4111-8111-111111111111';
const premium = '22222222-2222-4222-8222-222222222222';

Map<String, dynamic> publication(
  DateTime now, {
  List<String> ids = const [ordinary, premium],
  Duration lifetime = const Duration(hours: 1),
  String revision = 'a',
}) => {
  'ok': true,
  'version': 'pokemon_playables_public:v1',
  'game': 'pokemon',
  'format': 'standard',
  'platform': 'paper',
  'state': 'ready',
  'snapshot_id': List.filled(64, revision).join(),
  'as_of': now.toUtc().toIso8601String(),
  'valid_until': now.add(lifetime).toUtc().toIso8601String(),
  'rows': [
    for (var i = 0; i < ids.length; i++)
      {
        'card_print_id': ids[i],
        'gv_id': 'GV-PK-TEST-${i + 1}',
        'lists': 5,
        'events': 2,
      },
  ],
};

void main() {
  test(
    'one public read coalesces all visible versions and caches for a minute',
    () async {
      final now = DateTime.utc(2026, 11, 18);
      var calls = 0;
      final response = Completer<http.Response>();
      final service = PokemonPlayablesService(
        clock: () => now,
        fetch: (uri) {
          expect(uri.path, '/api/playables');
          calls++;
          return response.future;
        },
      );
      final first = service.refresh(), second = service.refresh();
      expect(identical(first, second), isTrue);
      response.complete(http.Response(jsonEncode(publication(now)), 200));
      await first;
      expect(calls, 1);
      expect(service.usageFor(ordinary)?.lists, 5);
      expect(service.usageFor(premium)?.events, 2);
      await service.refresh();
      expect(calls, 1);
      service.dispose();
    },
  );

  test(
    'revocation replaces membership and transport failure removes old highlights',
    () async {
      final now = DateTime.utc(2026, 11, 18);
      var body = publication(now);
      var status = 200;
      final service = PokemonPlayablesService(
        clock: () => now,
        fetch: (_) async => http.Response(jsonEncode(body), status),
      );
      await service.refresh();
      body = publication(now, ids: [ordinary], revision: 'b');
      await service.refresh(force: true);
      expect(service.usageFor(ordinary), isNotNull);
      expect(service.usageFor(premium), isNull);
      status = 503;
      await service.refresh(force: true);
      expect(service.currentSnapshot, isNull);
      expect(service.usageFor(ordinary), isNull);
      service.dispose();
    },
  );

  test(
    'synchronous transport failure does not pin a completed in-flight request',
    () async {
      final now = DateTime.utc(2026, 11, 18);
      var fail = true;
      final service = PokemonPlayablesService(
        clock: () => now,
        fetch: (_) {
          if (fail) throw StateError('fixture transport');
          return Future.value(http.Response(jsonEncode(publication(now)), 200));
        },
      );
      expect(await service.refresh(), isNull);
      fail = false;
      expect(await service.refresh(force: true), isNotNull);
      service.dispose();
    },
  );

  test(
    'exact expiry and a future evaluation never expose positive flags',
    () async {
      var now = DateTime.utc(2026, 11, 18);
      var body = publication(now, lifetime: const Duration(seconds: 1));
      final service = PokemonPlayablesService(
        clock: () => now,
        fetch: (_) async => http.Response(jsonEncode(body), 200),
      );
      await service.refresh();
      now = now.add(const Duration(seconds: 1));
      expect(service.usageFor(ordinary), isNull);
      body = publication(now.add(const Duration(seconds: 1)));
      expect(await service.refresh(force: true), isNull);
      service.dispose();
    },
  );

  for (final corrupt in [
    'scope',
    'duplicate',
    'lifetime',
    'counts',
    'identity',
    'not_ready',
  ]) {
    test('malformed $corrupt publication is unavailable', () async {
      final now = DateTime.utc(2026, 11, 18);
      final body = publication(now);
      switch (corrupt) {
        case 'scope':
          body['game'] = 'mtg';
        case 'duplicate':
          (body['rows'] as List).add((body['rows'] as List).first);
        case 'lifetime':
          body['valid_until'] = now
              .add(const Duration(hours: 25))
              .toIso8601String();
        case 'counts':
          ((body['rows'] as List).first as Map)['lists'] = 1;
        case 'identity':
          ((body['rows'] as List).first as Map)['card_print_id'] = '-' * 36;
        case 'not_ready':
          body['state'] = 'insufficient_evidence';
      }
      final service = PokemonPlayablesService(
        clock: () => now,
        fetch: (_) async => http.Response(jsonEncode(body), 200),
      );
      expect(await service.refresh(), isNull);
      service.dispose();
    });
  }

  testWidgets(
    'ordinary and premium badges expire together without hiding the cards',
    (tester) async {
      final now = tester.binding.clock.now();
      var calls = 0;
      final service = PokemonPlayablesService(
        clock: tester.binding.clock.now,
        fetch: (_) async {
          calls++;
          return calls == 1
              ? http.Response(
                  jsonEncode(
                    publication(now, lifetime: const Duration(seconds: 2)),
                  ),
                  200,
                )
              : http.Response('{}', 503);
        },
      );
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Column(
              children: [
                const Text('Ordinary and SIR printings'),
                PokemonPlayableBadge(cardPrintId: ordinary, service: service),
                PokemonPlayableBadge(cardPrintId: premium, service: service),
              ],
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump();
      expect(find.text('Playable'), findsNWidgets(2));
      expect(calls, 1);
      expect(
        find.byTooltip(RegExp('Pokémon Standard.*5 published lists')),
        findsNWidgets(2),
      );
      await tester.pump(const Duration(seconds: 2));
      expect(find.text('Playable'), findsNothing);
      expect(find.text('Ordinary and SIR printings'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      service.dispose();
    },
  );
}
