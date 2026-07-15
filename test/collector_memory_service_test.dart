import 'dart:typed_data';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/collector_memory_service.dart';

void main() {
  const userId = '11111111-1111-1111-1111-111111111111';
  const memoryId = '22222222-2222-2222-2222-222222222222';
  const gvviId = 'GVVI-123';

  test(
    'service defaults on for beta builds and does not query memory tables directly',
    () {
      final source = File(
        'lib/services/vault/collector_memory_service.dart',
      ).readAsStringSync();

      expect(kCollectorMemoriesEnabled, isTrue);
      expect(source, contains('COLLECTOR_MEMORIES_ENABLED'));
      expect(source, contains('defaultValue: true'));
      expect(source, isNot(contains(".from('collector_memories'")));
      expect(source, isNot(contains(".from('collector_memory_prompt_state'")));
    },
  );

  test('empty memory list parses as private empty state', () async {
    final service = CollectorMemoryService(
      rpc: (functionName, {params}) async {
        expect(functionName, 'collector_memories_for_gvvi_v1');
        expect(params?['p_gv_vi_id'], gvviId);
        expect(params?['p_limit'], 20);
        return const <Map<String, dynamic>>[];
      },
    );

    final memories = await service.loadForGvvi(gvviId: gvviId);

    expect(memories, isEmpty);
  });

  test(
    'owner memory feed calls owner-wide RPC and parses card context',
    () async {
      final service = CollectorMemoryService(
        rpc: (functionName, {params}) async {
          expect(functionName, 'collector_memories_for_owner_v1');
          expect(params?['p_limit'], 40);
          return <Map<String, dynamic>>[
            <String, dynamic>{
              'id': memoryId,
              'vault_item_instance_id': '33333333-3333-3333-3333-333333333333',
              'gv_vi_id': gvviId,
              'card_print_id': '44444444-4444-4444-4444-444444444444',
              'card_name': 'Pikachu',
              'set_name': 'Scarlet & Violet Promos',
              'card_image_url': '/api/canon/cards/GV-PK-JPN-M5-118/image',
              'memory_type': 'note',
              'note': 'Trade night pull.',
              'created_at': '2026-07-10T12:00:00Z',
            },
          ];
        },
      );

      final memories = await service.loadOwnerMemories(limit: 40);

      expect(memories, hasLength(1));
      expect(memories.single.memory.id, memoryId);
      expect(memories.single.memory.gvviId, gvviId);
      expect(
        memories.single.cardPrintId,
        '44444444-4444-4444-4444-444444444444',
      );
      expect(memories.single.cardName, 'Pikachu');
      expect(memories.single.setName, 'Scarlet & Violet Promos');
      expect(
        memories.single.cardImageUrl,
        '/api/canon/cards/GV-PK-JPN-M5-118/image',
      );
    },
  );

  test('create memory calls the owner-only RPC and parses the row', () async {
    final service = CollectorMemoryService(
      rpc: (functionName, {params}) async {
        expect(functionName, 'collector_memory_create_v1');
        expect(params?['p_gv_vi_id'], gvviId);
        expect(params?['p_memory_type'], 'added_place');
        expect(params?['p_note'], 'Found this at a local show.');
        expect(params?['p_place_label'], 'Dallas card show');
        expect(params?['p_memory_date'], '2026-07-10');
        expect(params?['p_prompt_key'], 'added_place:$gvviId');
        return <String, dynamic>{
          'id': memoryId,
          'vault_item_instance_id': '33333333-3333-3333-3333-333333333333',
          'gv_vi_id': gvviId,
          'memory_type': 'added_place',
          'note': 'Found this at a local show.',
          'photo_path': null,
          'place_label': 'Dallas card show',
          'occasion_label': null,
          'memory_date': '2026-07-10',
          'prompt_key': 'added_place:$gvviId',
          'created_at': '2026-07-10T12:00:00Z',
          'updated_at': '2026-07-10T12:00:00Z',
        };
      },
    );

    final memory = await service.create(
      gvviId: gvviId,
      memoryType: CollectorMemoryType.addedPlace,
      note: 'Found this at a local show.',
      placeLabel: 'Dallas card show',
      memoryDate: DateTime.utc(2026, 7, 10),
      promptKey: 'added_place:$gvviId',
    );

    expect(memory.id, memoryId);
    expect(memory.memoryType, CollectorMemoryType.addedPlace);
    expect(memory.placeLabel, 'Dallas card show');
    expect(memory.memoryDate, DateTime(2026, 7, 10));
  });

  test(
    'update memory sends mutable fields only through the RPC boundary',
    () async {
      final service = CollectorMemoryService(
        rpc: (functionName, {params}) async {
          expect(functionName, 'collector_memory_update_v1');
          expect(params?['p_memory_id'], memoryId);
          expect(params?['p_note'], 'Birthday trade night.');
          expect(params?['p_photo_path'], '$userId/memories/$memoryId/photo');
          expect(params?['p_place_label'], isNull);
          expect(params?['p_occasion_label'], 'Birthday');
          return <String, dynamic>{
            'id': memoryId,
            'vault_item_instance_id': '33333333-3333-3333-3333-333333333333',
            'gv_vi_id': gvviId,
            'memory_type': 'occasion',
            'note': 'Birthday trade night.',
            'photo_path': '$userId/memories/$memoryId/photo',
            'place_label': null,
            'occasion_label': 'Birthday',
          };
        },
      );

      final memory = await service.update(
        memoryId: memoryId,
        note: 'Birthday trade night.',
        photoPath: '/$userId/memories/$memoryId/photo',
        occasionLabel: 'Birthday',
      );

      expect(memory.memoryType, CollectorMemoryType.occasion);
      expect(memory.photoPath, '$userId/memories/$memoryId/photo');
    },
  );

  test('archive removes known photo then soft-archives by RPC', () async {
    final removed = <String>[];
    final calls = <String>[];
    final service = CollectorMemoryService(
      remove: ({required bucket, required paths}) async {
        expect(bucket, CollectorMemoryService.memoryBucket);
        removed.addAll(paths);
      },
      rpc: (functionName, {params}) async {
        calls.add(functionName);
        expect(functionName, 'collector_memory_archive_v1');
        expect(params?['p_memory_id'], memoryId);
        return null;
      },
    );

    await service.archive(
      memoryId: memoryId,
      photoPath: '$userId/memories/$memoryId/photo',
    );

    expect(removed, <String>['$userId/memories/$memoryId/photo']);
    expect(calls, <String>['collector_memory_archive_v1']);
  });

  test(
    'photo upload uses the private memory bucket and deterministic path',
    () async {
      final uploaded = <String, dynamic>{};
      final service = CollectorMemoryService(
        upload:
            ({
              required bucket,
              required path,
              required bytes,
              required contentType,
            }) async {
              uploaded['bucket'] = bucket;
              uploaded['path'] = path;
              uploaded['bytes'] = bytes.length;
              uploaded['contentType'] = contentType;
            },
        rpc: (_, {params}) async => fail('photo upload must not call RPC'),
      );

      final path = await service.uploadPhotoBytes(
        userId: userId,
        memoryId: memoryId,
        bytes: Uint8List.fromList(<int>[1, 2, 3]),
        fileName: 'memory.webp',
      );

      expect(path, '$userId/memories/$memoryId/photo');
      expect(uploaded['bucket'], CollectorMemoryService.memoryBucket);
      expect(uploaded['path'], '$userId/memories/$memoryId/photo');
      expect(uploaded['bytes'], 3);
      expect(uploaded['contentType'], 'image/webp');
    },
  );

  test('photo preview signs the private storage object path', () async {
    final signed = <String, dynamic>{};
    final service = CollectorMemoryService(
      sign: ({required bucket, required path, required expiresIn}) async {
        signed['bucket'] = bucket;
        signed['path'] = path;
        signed['expiresIn'] = expiresIn;
        return 'https://storage.example.test/signed-memory-photo';
      },
      rpc: (_, {params}) async => fail('photo signing must not call RPC'),
    );

    final url = await service.createSignedPhotoUrl(
      '/$userId/memories/$memoryId/photo',
      expiresIn: 900,
    );

    expect(url, 'https://storage.example.test/signed-memory-photo');
    expect(signed['bucket'], CollectorMemoryService.memoryBucket);
    expect(signed['path'], '$userId/memories/$memoryId/photo');
    expect(signed['expiresIn'], 900);
  });

  test('collector memories UI is private and not public Wall', () {
    final privateScreen = File(
      'lib/screens/vault/vault_gvvi_screen.dart',
    ).readAsStringSync();
    final privateHome = File(
      'lib/screens/grookai_objects/collector_memories_screen.dart',
    ).readAsStringSync();
    final publicCard = File('lib/card_detail_screen.dart').readAsStringSync();
    final publicGvvi = File(
      'lib/screens/gvvi/public_gvvi_screen.dart',
    ).readAsStringSync();
    final publicWall = File(
      'lib/screens/public_collector/public_collector_screen.dart',
    ).readAsStringSync();

    expect(privateScreen, contains('CollectorMemoryService'));
    expect(privateScreen, contains('_CollectorMemoriesSurface'));
    expect(privateScreen, contains('kCollectorMemoriesEnabled'));
    expect(privateScreen, contains('showModalBottomSheet'));
    expect(privateScreen, contains('ImagePicker().pickImage'));
    expect(privateScreen, contains('createSignedPhotoUrl'));
    expect(privateHome, contains('loadOwnerMemories'));
    expect(privateHome, contains('VaultManageCardScreen'));
    expect(publicCard, contains('MemoryCardCaptureScreen'));
    expect(publicCard, contains('kCollectorMemoriesEnabled'));
    expect(publicGvvi, isNot(contains('CollectorMemory')));
    expect(publicWall, isNot(contains('CollectorMemory')));
  });

  test(
    'photo upload rejects empty and over-limit payloads before storage',
    () async {
      final service = CollectorMemoryService(
        upload:
            ({
              required bucket,
              required path,
              required bytes,
              required contentType,
            }) {
              fail('invalid payload should not reach storage');
            },
        rpc: (_, {params}) async => null,
      );

      await expectLater(
        service.uploadPhotoBytes(
          userId: userId,
          memoryId: memoryId,
          bytes: Uint8List(0),
        ),
        throwsA(isA<Exception>()),
      );

      await expectLater(
        service.uploadPhotoBytes(
          userId: userId,
          memoryId: memoryId,
          bytes: Uint8List(CollectorMemoryService.photoMaxBytes + 1),
        ),
        throwsA(isA<Exception>()),
      );
    },
  );

  test('prompt state and dismiss use owner-only prompt RPCs', () async {
    final calls = <String>[];
    final service = CollectorMemoryService(
      rpc: (functionName, {params}) async {
        calls.add(functionName);
        if (functionName == 'collector_memory_prompt_state_v1') {
          expect(params?['p_gv_vi_id'], gvviId);
          return <Map<String, dynamic>>[
            <String, dynamic>{
              'prompt_key': 'first_psa_10',
              'prompt_type': 'first',
              'prompt_title': 'First PSA 10',
              'prompt_body': 'Save this milestone privately.',
              'suggested_memory_date': '2026-07-10',
              'card_name': 'Pikachu',
              'card_image_url': 'https://example.test/pikachu.webp',
            },
          ];
        }
        expect(functionName, 'collector_memory_prompt_dismiss_v1');
        expect(params?['p_prompt_key'], 'first_psa_10');
        return null;
      },
    );

    final prompts = await service.loadPrompts(gvviId: gvviId);
    await service.dismissPrompt(promptKey: prompts.single.promptKey);

    expect(prompts.single.promptType, CollectorMemoryType.first);
    expect(prompts.single.cardName, 'Pikachu');
    expect(calls, <String>[
      'collector_memory_prompt_state_v1',
      'collector_memory_prompt_dismiss_v1',
    ]);
  });

  test(
    'private suppression is represented by empty owned-RPC output',
    () async {
      final service = CollectorMemoryService(
        rpc: (functionName, {params}) async {
          expect(functionName, 'collector_memories_for_gvvi_v1');
          return const <Map<String, dynamic>>[];
        },
      );

      final memories = await service.loadForGvvi(gvviId: 'OTHER-USER-GVVI');

      expect(memories, isEmpty);
    },
  );

  test('RPC failures surface the failed function name', () async {
    final service = CollectorMemoryService(
      rpc: (functionName, {params}) async {
        throw StateError('rpc unavailable');
      },
    );

    await expectLater(
      service.loadForGvvi(gvviId: gvviId),
      throwsA(
        isA<CollectorMemoryServiceException>()
            .having(
              (error) => error.operation,
              'operation',
              'collector_memories_for_gvvi_v1',
            )
            .having(
              (error) => error.cause.toString(),
              'cause',
              contains('rpc unavailable'),
            ),
      ),
    );
  });
}
