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

  test('notification pulse app links parse to canonical feed routes', () {
    for (final link in <String>[
      'grookai://feed?segment=pulse',
      'grookaivault://feed?segment=pulse',
      'https://grookaivault.com/feed?segment=pulse',
    ]) {
      final route = GrookaiWebRouteService.parseCanonicalUri(Uri.parse(link));

      expect(route, isNotNull, reason: link);
      expect(route!.kind, GrookaiCanonicalRouteKind.feed);
      expect(route.value, 'pulse');
      expect(route.path, '/feed?segment=pulse');
    }
  });

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
