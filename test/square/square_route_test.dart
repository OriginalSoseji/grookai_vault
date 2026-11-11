import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/navigation/grookai_web_route_service.dart';

void main() {
  test(
    'Square browser return selects the private native workspace without propagating credentials',
    () {
      for (final value in [
        'grookai://square/return',
        'grookaivault://square/return',
        'https://grookaivault.com/square/return?status=connected',
      ]) {
        final route = GrookaiWebRouteService.parseCanonicalUri(
          Uri.parse(value),
        );
        expect(route?.kind, GrookaiCanonicalRouteKind.square);
        expect(route?.path, '/square/return');
      }
    },
  );
  test(
    'foreign, credential-bearing, duplicate and malformed Square returns are rejected',
    () {
      for (final value in [
        'https://foreign.invalid/square/return',
        'http://grookaivault.com/square/return',
        'grookai://secret@square/return',
        'grookai://square:444/return',
        'grookai://square/return?code=private-code',
        'grookai://square/return?state=private-state',
        'grookai://square/return#access_token=private-token',
        'grookai://square/return?status=connected&status=connected',
        'grookai://square/return?status=unknown',
      ]) {
        expect(
          GrookaiWebRouteService.parseCanonicalUri(Uri.parse(value)),
          isNull,
          reason: value,
        );
      }
    },
  );
}
