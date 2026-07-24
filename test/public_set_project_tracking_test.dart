import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  final source = File(
    'lib/screens/sets/public_set_detail_screen.dart',
  ).readAsStringSync();
  final publicSetsService = File(
    'lib/services/public/public_sets_service.dart',
  ).readAsStringSync();

  group('Public set private project tracking', () {
    test('loads tracking after core set content without blocking it', () {
      final detailCommit = source.indexOf('_detail = detail;');
      final backgroundLoad = source.indexOf(
        'unawaited(_loadProjectTracking(detail.summary.code));',
      );

      expect(detailCommit, greaterThanOrEqualTo(0));
      expect(backgroundLoad, greaterThan(detailCommit));
      expect(source, isNot(contains('await _loadProjectTracking(')));
      expect(source, contains('_projectLoadGeneration'));
    });

    test('resolves an exact canonical set id for set project actions', () {
      expect(source, contains(".from('sets')"));
      expect(source, contains(".select('id')"));
      expect(source, contains(".eq('code', canonicalSetCode)"));
      expect(source, contains('subjectType: CollectionProjectSubjectType.set'));
      expect(source, contains('subjectId: subjectId'));
      expect(source, isNot(contains(".ilike('name'")));
    });

    test('offers explicit start, tracked, and confirmed stop states', () {
      expect(source, contains("label: const Text('Track project')"));
      expect(source, contains("label: const Text('Tracking')"));
      expect(source, contains("title: const Text('Stop tracking this set?')"));
      expect(source, contains('await _collectionProjectService.startProject('));
      expect(source, contains('await _collectionProjectService.stopProject('));

      final confirmation = source.indexOf(
        'final shouldStop = await showDialog',
      );
      final stopMutation = source.indexOf('await _stopProject();');
      expect(confirmation, greaterThanOrEqualTo(0));
      expect(stopMutation, greaterThan(confirmation));
    });

    test('keeps project controls private and safe when unavailable', () {
      expect(source, contains('Private to you.'));
      expect(source, contains("label: const Text('Sign in to track')"));
      expect(source, contains("label: const Text('Retry tracking')"));
      expect(source, contains('This only stops the private project.'));
      expect(source, contains('completion progress stay unchanged.'));

      expect(source, isNot(contains("from('wall_sections')")));
      expect(source, isNot(contains("from('pulse_events')")));
      expect(source, isNot(contains("from('user_card_intents')")));
      expect(source, isNot(contains('sharing_enabled')));
    });

    test(
      'pages large finish option reads without losing reverse holo labels',
      () {
        final start = publicSetsService.indexOf('_fetchPrintingOptions(');
        final end = publicSetsService.indexOf(
          'static Map<String, dynamic>?',
          start,
        );
        final options = publicSetsService.substring(start, end);

        expect(options, contains('const pageSize = 1000;'));
        expect(options, contains(".order('id', ascending: true)"));
        expect(options, contains('.range(offset, offset + pageSize - 1)'));
        expect(publicSetsService, contains("case 'reverse':"));
        expect(publicSetsService, contains("return 'Reverse Holo';"));
        expect(options, contains("finish_keys(label,sort_order)"));
        expect(
          options,
          contains("select('id,card_print_id,printing_gv_id,finish_key')"),
        );
      },
    );
  });
}
