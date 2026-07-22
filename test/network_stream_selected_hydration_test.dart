import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final source = File(
    'lib/services/network/network_stream_service.dart',
  ).readAsStringSync();

  test(
    'collector enrichment runs only after page selection and is bounded',
    () {
      expect(source, contains('_hydrateSelectedCollectorRows('));
      expect(
        source,
        contains('_enrichCollectorRows(client: client, rows: rows)'),
      );
      expect(source, contains('_selectedCollectorHydrationBudget'));
      expect(source, contains('_bestEffortWithinBudget'));
      expect(source, isNot(contains('ignore: unused_element')));
    },
  );

  test('private exact-copy paths survive normalization only for signing', () {
    expect(source, contains('_isVaultInstanceMediaPath(raw)'));
    expect(source, contains('clearImageUrl: resolvedImageUrl == null'));
    expect(source, contains(".from('user-card-images')"));
    expect(source, contains('createSignedUrl(normalized, 60 * 60)'));
  });
}
