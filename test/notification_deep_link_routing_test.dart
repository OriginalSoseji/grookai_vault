import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/navigation/grookai_web_route_service.dart';

void main() {
  test('notification card app links parse to canonical card routes', () {
    for (final link in <String>[
      'grookai://card/GV-PK-SV08-5-167',
      'grookaivault://card/GV-PK-SV08-5-167',
      'grookai:///card/GV-PK-SV08-5-167',
      'grookai://card/GV-PK-SV08-5-167?source=notification&notification_id=abc&owner=user-1',
      'https://grookaivault.com/card/GV-PK-SV08-5-167?source=notification&notification_id=abc&owner=user-1',
    ]) {
      final route = GrookaiWebRouteService.parseCanonicalUri(Uri.parse(link));

      expect(route, isNotNull, reason: link);
      expect(route!.kind, GrookaiCanonicalRouteKind.card);
      expect(route.value, 'GV-PK-SV08-5-167');
      expect(route.path, '/card/GV-PK-SV08-5-167');
    }
  });

  test(
    'notification collector and set app links parse to canonical routes',
    () {
      final collector = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('grookai://u/collector-one'),
      );
      expect(collector, isNotNull);
      expect(collector!.kind, GrookaiCanonicalRouteKind.collector);
      expect(collector.value, 'collector-one');
      expect(collector.path, '/u/collector-one');

      final legacyCollector = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('/collector/collector-one'),
      );
      expect(legacyCollector, isNotNull);
      expect(legacyCollector!.kind, GrookaiCanonicalRouteKind.collector);
      expect(legacyCollector.path, '/u/collector-one');

      final legacyCollectorAppLink = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('grookaivault://collector/collector-one'),
      );
      expect(legacyCollectorAppLink, isNotNull);
      expect(legacyCollectorAppLink!.path, '/u/collector-one');

      final section = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('grookai://u/collector-one/section/abc123'),
      );
      expect(section, isNotNull);
      expect(section!.kind, GrookaiCanonicalRouteKind.collectorSection);
      expect(section.value, 'collector-one');
      expect(section.sectionId, 'abc123');

      final set = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse('grookai://set/SV08'),
      );
      expect(set, isNotNull);
      expect(set!.kind, GrookaiCanonicalRouteKind.set);
      expect(set.value, 'SV08');
    },
  );

  test('notification pulse links canonicalize to the live network route', () {
    for (final link in <String>[
      'grookai://feed?segment=pulse',
      'grookai://network',
      'grookaivault://feed?segment=pulse',
      'https://grookaivault.com/feed?segment=pulse',
      'https://grookaivault.com/network',
    ]) {
      final route = GrookaiWebRouteService.parseCanonicalUri(Uri.parse(link));

      expect(route, isNotNull, reason: link);
      expect(route!.kind, GrookaiCanonicalRouteKind.feed);
      expect(route.value, 'pulse');
      expect(route.path, '/network');
    }
  });

  test('network links retain discover and following segment intent', () {
    for (final entry in <(String, String)>[
      ('grookai://network?segment=discover', 'discover'),
      ('grookaivault://feed?segment=following', 'following'),
      ('https://grookaivault.com/network?segment=discover', 'discover'),
      ('https://grookaivault.com/feed?segment=following', 'following'),
    ]) {
      final route = GrookaiWebRouteService.parseCanonicalUri(
        Uri.parse(entry.$1),
      );

      expect(route, isNotNull, reason: entry.$1);
      expect(route!.kind, GrookaiCanonicalRouteKind.feed);
      expect(route.value, entry.$2);
      expect(route.path, '/network?segment=${entry.$2}');
    }
  });

  test('shared GVVI links parse for web and custom app schemes', () {
    for (final link in <String>[
      'grookai://gvvi/GVVI-065CAB28-001318',
      'grookaivault://gvvi/GVVI-065CAB28-001318',
      'grookai:///gvvi/GVVI-065CAB28-001318',
      'https://grookaivault.com/gvvi/GVVI-065CAB28-001318',
    ]) {
      final route = GrookaiWebRouteService.parseCanonicalUri(Uri.parse(link));

      expect(route, isNotNull, reason: link);
      expect(route!.kind, GrookaiCanonicalRouteKind.gvvi);
      expect(route.value, 'GVVI-065CAB28-001318');
      expect(route.path, '/gvvi/GVVI-065CAB28-001318');
    }
  });

  test('Dex species links parse for web and custom app schemes', () {
    for (final link in <String>[
      'grookai://dex/pikachu',
      'grookaivault://dex/pikachu',
      'grookai:///dex/pikachu',
      'https://grookaivault.com/dex/pikachu',
    ]) {
      final route = GrookaiWebRouteService.parseCanonicalUri(Uri.parse(link));

      expect(route, isNotNull, reason: link);
      expect(route!.kind, GrookaiCanonicalRouteKind.dex);
      expect(route.value, 'pikachu');
      expect(route.path, '/dex/pikachu');
    }
  });

  test('Dex root links retain the canonical Dex index destination', () {
    for (final link in <String>[
      'grookai://dex',
      'grookaivault://dex',
      'grookai:///dex',
      'https://grookaivault.com/dex',
      '/dex',
    ]) {
      final route = GrookaiWebRouteService.parseCanonicalUri(Uri.parse(link));

      expect(route, isNotNull, reason: link);
      expect(route!.kind, GrookaiCanonicalRouteKind.dex);
      expect(route.value, isEmpty);
      expect(route.path, '/dex');
    }
  });

  test(
    'iOS universal-link association covers every canonical public route',
    () {
      final association =
          jsonDecode(
                File(
                  'apps/web/public/.well-known/apple-app-site-association',
                ).readAsStringSync(),
              )
              as Map<String, dynamic>;
      final applinks = association['applinks'] as Map<String, dynamic>;
      final details = applinks['details'] as List<dynamic>;
      final app = details.single as Map<String, dynamic>;
      final paths = (app['paths'] as List<dynamic>).cast<String>();

      expect(app['appID'], 'DUADT25J5V.com.cesar.grookaivault');
      expect(
        paths,
        containsAll(<String>[
          '/card/*',
          '/u/*',
          '/collector/*',
          '/set/*',
          '/sets/*',
          '/gvvi/*',
          '/dex',
          '/dex/*',
          '/network*',
          '/feed*',
        ]),
      );
    },
  );

  test('unsupported notification app links are ignored', () {
    expect(
      GrookaiWebRouteService.parseCanonicalUri(Uri.parse('other://card/GV-1')),
      isNull,
    );
    expect(
      GrookaiWebRouteService.parseCanonicalUri(Uri.parse('grookai://inbox/1')),
      isNull,
    );
  });
}
