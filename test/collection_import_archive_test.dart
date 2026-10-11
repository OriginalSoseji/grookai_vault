import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/import/collection_import_archive.dart';

void main() {
  final corpus =
      jsonDecode(
            File(
              'test/fixtures/collection_import_archive_cases.json',
            ).readAsStringSync(),
          )
          as Map<String, dynamic>;
  final owner = corpus['ownerId'] as String,
      hash = corpus['sourceSha256'] as String;
  for (final raw in corpus['cases'] as List) {
    final item = raw as Map<String, dynamic>;
    test('shared source archive corpus: ${item['name']}', () {
      CollectionImportArchive read() => CollectionImportArchive.fromStored(
        ownerId: owner,
        sourceSha256: hash,
        document: item['document'],
        mappings: item['mappings'] as List,
      );
      if (item['valid'] != true) {
        expect(read, throwsFormatException);
        return;
      }
      final archive = read(),
          saved = jsonDecode(archive.toSourceJson()) as Map<String, dynamic>;
      expect(saved['sourceRows'], (item['document'] as Map)['source_rows']);
      expect(saved['description'], contains('not a current inventory export'));
      if (item['name'] == 'mixed historical mappings') {
        expect(saved['counts'], {
          'sourceRows': 3,
          'reconciledRows': 2,
          'reviewRows': 1,
          'cardCopies': 2,
          'sealedCopies': 1,
          'addedCopies': 2,
          'reusedCopies': 1,
        });
        expect(archive.reviewIndices, [2]);
      }
    });
  }
  final fixture = (corpus['cases'] as List).first as Map<String, dynamic>;
  final mappings = fixture['mappings'] as List;
  test('server-capped short pages continue to the empty page', () async {
    final cursors = <String?>[];
    final archive = await CollectionImportArchive.read(
      ownerId: owner,
      sourceSha256: hash,
      isCurrentOwner: () => true,
      readDocument: () async => fixture['document'],
      readGroupPage: (after) async {
        cursors.add(after);
        return cursors.length <= mappings.length
            ? [mappings[cursors.length - 1]]
            : [];
      },
    );
    expect(cursors, [null, mappings[0]['group_key'], mappings[1]['group_key']]);
    expect(archive.reviewIndices, [2]);
  });
  for (final scenario in [
    'document owner change',
    'page owner change',
    'page error',
    'repeated cursor',
  ]) {
    test('$scenario cannot return partial or stale history', () async {
      var current = true, calls = 0;
      final future = CollectionImportArchive.read(
        ownerId: owner,
        sourceSha256: hash,
        isCurrentOwner: () => current,
        readDocument: () async {
          if (scenario == 'document owner change') current = false;
          return fixture['document'];
        },
        readGroupPage: (after) async {
          calls++;
          if (scenario == 'page owner change') current = false;
          if (scenario == 'page error' && calls > 1) {
            throw StateError('read failed');
          }
          return [mappings.first];
        },
      );
      await expectLater(future, throwsA(anything));
      expect(calls, lessThanOrEqualTo(2));
      if (scenario == 'document owner change') expect(calls, 0);
    });
  }
}
