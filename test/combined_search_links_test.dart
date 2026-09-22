import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/navigation/grookai_web_route_service.dart';

void main() {
  test('web and custom search links retain query and all filter values', () {
    for (final prefix in ['/explore', 'grookaivault://explore', 'grookai:///explore']) {
      final uri = Uri.parse('$prefix?q=Yuka+Morri+Wurmple&finish=reverse&finish=holo&illustrator=Yuka+Morii&lang=ja');
      final route = GrookaiWebRouteService.parseCanonicalUri(uri)!;
      expect(route.kind, GrookaiCanonicalRouteKind.search);
      expect(Uri.parse(route.path).queryParametersAll, uri.queryParametersAll);
    }
  });
}
