import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/services/intake/intake_draft_store.dart';
import 'package:grookai_vault/services/intake/intake_controller.dart';
import 'package:grookai_vault/services/intake/intake_service.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_v5_identity_service.dart';

class Service extends IntakeService {
  Service() : super(SupabaseClient('https://example.test', 'public-test'));
  @override
  String get userId => 'owner';
  @override
  Future<void> upload(String path, Uint8List bytes) async {}
  int revision = 0, commits = 0;
  bool lostResponse = false;
  String state = 'draft';
  @override
  Future<Map<String, dynamic>> saveBatch(IntakeBatch batch) async => {
    'revision': ++revision,
    'state': state,
  };
  @override
  Future<Map<String, dynamic>> getBatch(String id) async => {
    'revision': revision,
    'state': state,
    'saved_items': state == 'saved'
        ? [
            {
              'item_id': 'item',
              'instance_ids': ['copy-1', 'copy-2'],
            },
          ]
        : [],
  };
  @override
  Future<Map<String, dynamic>> commit(IntakeBatch batch) async {
    commits++;
    state = 'saved';
    revision++;
    if (lostResponse) throw StateError('response lost');
    return {
      'batch': {'revision': revision, 'state': state},
      'saved_items': [
        {
          'item_id': 'item',
          'instance_ids': ['copy-1', 'copy-2'],
        },
      ],
    };
  }
}

class Scanner extends ScannerV5IdentityService {
  Scanner() : super(endpoint: 'https://example.test/identify');
  int calls = 0;
  bool fail = false;
  Object? failure;
  @override
  Future<ScannerV5IdentifyResult> identify(Uint8List bytes) async {
    calls++;
    if (failure != null) throw failure!;
    if (fail) throw StateError('offline');
    return ScannerV5IdentifyResult.fromJson({
      'ok': true,
      'mode': 'embedding_only',
      'candidates': [
        {'card_id': '00000000-0000-4000-8000-000000000001', 'name': 'Card'},
      ],
    });
  }
}

void main() {
  late Directory directory;
  late IntakeDraftStore store;
  late Service service;
  setUp(() async {
    directory = await Directory.systemTemp.createTemp('intake-test-');
    store = IntakeDraftStore(directory);
    service = Service();
  });
  tearDown(() async {
    await service.client.dispose();
    await directory.delete(recursive: true);
  });
  test(
    'secure connection failure preserves the photo and retries the same capture',
    () async {
      final scanner = Scanner()
        ..failure = const ScannerV5SecureConnectionException(
          'https://private-host.example',
          cause: HandshakeException('private issuer details'),
        );
      final batch = IntakeBatch(title: 'TLS recovery', userId: 'owner');
      final c = IntakeController(
        batch: batch,
        store: store,
        service: service,
        scanner: scanner,
      );
      await c.capture(Uint8List.fromList([1, 2, 3]));
      while (batch.pendingCount > 0) {
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }
      final job = batch.jobs.single;
      await c.process();
      expect(job.state, 'failed');
      expect(job.error, contains('Your photo is retained'));
      expect(job.error, isNot(contains('private')));
      final restored = (await store.list()).single;
      expect(await File(restored.jobs.single.imagePath).readAsBytes(), [
        1,
        2,
        3,
      ]);
      scanner.failure = null;
      await c.retry(job);
      while (batch.pendingCount > 0) {
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }
      expect(batch.jobs.single.id, restored.jobs.single.id);
      await c.process();
      expect(batch.items.single.captureId, job.id);
      expect(batch.items.single.state, 'needs_review');
      expect(service.commits, 0);
      c.dispose();
    },
  );
  test(
    'draft replacement keeps the newest state and copied image bytes',
    () async {
      final batch = IntakeBatch(title: 'Today', userId: 'owner');
      final path = await store.image(
        batch.id,
        'photo',
        Uint8List.fromList([1, 2, 3]),
      );
      await store.save(batch);
      batch.title = 'Updated';
      batch.jobs.add(IntakeCaptureJob(imagePath: path));
      await store.save(batch);
      final restored = (await store.list()).single;
      expect(restored.title, 'Updated');
      expect(await File(restored.jobs.single.imagePath).readAsBytes(), [
        1,
        2,
        3,
      ]);
      await File('${directory.path}/corrupt.json').writeAsString('{');
      expect((await store.list()).length, 1);
    },
  );
  test(
    'interrupted processing resumes once and a failed retry creates one item',
    () async {
      final scanner = Scanner()..fail = true;
      final batch = IntakeBatch(title: 'Today', userId: 'owner');
      final c = IntakeController(
        batch: batch,
        store: store,
        service: service,
        scanner: scanner,
      );
      await c.capture(Uint8List.fromList([1, 2, 3]));
      while (batch.pendingCount > 0) {
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }
      expect(batch.jobs.single.state, 'failed');
      expect(batch.items, isEmpty);
      scanner.fail = false;
      batch.jobs.single.state = 'processing';
      await c.resume();
      while (batch.pendingCount > 0) {
        await Future<void>.delayed(const Duration(milliseconds: 5));
      }
      expect(batch.items.length, 1);
      expect(scanner.calls, 2);
      expect(batch.items.single.state, 'needs_review');
      await c.process();
      expect(batch.items.length, 1);
      c.dispose();
    },
  );
  test(
    'lost commit response recovers every owned ID without committing twice',
    () async {
      service.lostResponse = true;
      final batch = IntakeBatch(
        title: 'Today',
        userId: 'owner',
        allocationReviewed: true,
        items: [
          IntakeItem(
            id: 'item',
            captureId: 'manual',
            imagePath: '',
            selected: ScannerV5Candidate.fromJson({
              'card_id': '00000000-0000-4000-8000-000000000001',
            }),
            state: 'confirmed',
            quantity: 2,
          ),
        ],
      );
      final c = IntakeController(
        batch: batch,
        store: store,
        service: service,
        scanner: Scanner(),
      );
      await expectLater(c.saveToVault(), throwsStateError);
      expect(service.commits, 1);
      expect(batch.items.single.isSaved, isFalse);
      await c.saveToVault();
      expect(service.commits, 1);
      expect(batch.items.single.savedInstanceIds, ['copy-1', 'copy-2']);
      expect(batch.state, 'saved');
      c.dispose();
    },
  );
  test('cloud revision conflict preserves local edits', () async {
    service.revision = 3;
    final batch = IntakeBatch(
      title: 'Local changes',
      userId: 'owner',
      revision: 1,
      allocationReviewed: true,
    );
    final c = IntakeController(
      batch: batch,
      store: store,
      service: service,
      scanner: Scanner(),
    );
    await expectLater(c.saveToVault(), throwsStateError);
    expect(batch.title, 'Local changes');
    expect(batch.revision, 1);
    expect(service.commits, 0);
    c.dispose();
  });
  test(
    'cloud image paths cannot read another account or escape draft storage',
    () async {
      final foreign = File('${directory.path}-other-account.jpg');
      await foreign.writeAsBytes([9, 8, 7]);
      final c = IntakeController(
        batch: IntakeBatch(title: 'Today', userId: 'owner'),
        store: store,
        service: service,
        scanner: Scanner(),
      );
      try {
        await expectLater(c.imageBytes(foreign.path, null), throwsStateError);
        await expectLater(
          store.image('../escape', 'photo', Uint8List(0)),
          throwsArgumentError,
        );
      } finally {
        await foreign.delete();
        c.dispose();
      }
    },
  );
}
