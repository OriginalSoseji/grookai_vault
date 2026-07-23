import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'Pulse legacy species IDs are batch-resolved without per-item reads',
    () {
      final source = File(
        'lib/services/network/pulse_service.dart',
      ).readAsStringSync();

      expect(source, contains(".from('pokemon_species')"));
      expect(source, contains(".select('id,slug,display_name')"));
      expect(source, contains(".inFilter('id', unresolvedSubjectIds)"));
      expect(source, contains('resolvePulseDexCompletionRoutes('));
    },
  );

  test(
    'new completion events carry exact canonical destinations and labels',
    () {
      final source = File(
        'lib/services/vault/vault_card_service.dart',
      ).readAsStringSync();

      expect(source, contains("table: 'pokemon_species'"));
      expect(source, contains("columns: 'id,slug,display_name'"));
      expect(source, contains("table: 'sets'"));
      expect(source, contains("columns: 'id,code,name'"));
      expect(source, contains("payload['species_slug'] = slug"));
      expect(
        source,
        contains(
          "payload['completion_route'] = '/dex/\${Uri.encodeComponent(slug)}'",
        ),
      );
      expect(source, contains("payload['subject_label'] = displayName"));
      expect(
        source,
        contains(
          "payload['completion_route'] = '/set/\${Uri.encodeComponent(code)}'",
        ),
      );
    },
  );
}
