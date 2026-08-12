import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/grookai_objects/collector_memory_route_screen.dart';
import 'package:grookai_vault/services/vault/collector_memory_service.dart';

void main() {
  const memoryId = '22222222-2222-2222-2222-222222222222';

  testWidgets('shared route renders the Memory rather than card detail', (
    tester,
  ) async {
    final service = CollectorMemoryService(
      rpc: (functionName, {params}) async => <Map<String, dynamic>>[
        _memoryRow(viewerIsOwner: false, isPublic: true),
      ],
      sign: ({required bucket, required path, required expiresIn}) async {
        expect(bucket, CollectorMemoryService.memoryBucket);
        expect(path, 'owner/memories/$memoryId/photo');
        expect(expiresIn, 300);
        return 'https://storage.example.test/memory.jpg';
      },
    );

    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoryRouteScreen(memoryId: memoryId, service: service),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('shared-collector-memory-detail')), findsOne);
    expect(find.text('Shared by Collector One'), findsOne);
    await tester.scrollUntilVisible(
      find.byKey(const Key('shared-collector-memory-note')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Trade night pull.'), findsOne);
    expect(find.byKey(const Key('collector-memory-detail')), findsNothing);
  });

  testWidgets('owner route renders editable owner Memory detail', (
    tester,
  ) async {
    final service = CollectorMemoryService(
      rpc: (functionName, {params}) async => <Map<String, dynamic>>[
        _memoryRow(viewerIsOwner: true, isPublic: false),
      ],
      sign: ({required bucket, required path, required expiresIn}) async =>
          'https://storage.example.test/memory.jpg',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoryRouteScreen(memoryId: memoryId, service: service),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('collector-memory-detail')), findsOne);
    await tester.scrollUntilVisible(
      find.byKey(const Key('memory-public-switch')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.byKey(const Key('memory-public-switch')), findsOne);
  });

  testWidgets('missing optional photo does not hide a shared Memory', (
    tester,
  ) async {
    final service = CollectorMemoryService(
      rpc: (functionName, {params}) async => <Map<String, dynamic>>[
        _memoryRow(viewerIsOwner: false, isPublic: true),
      ],
      sign: ({required bucket, required path, required expiresIn}) async {
        throw Exception('Object not found');
      },
    );

    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoryRouteScreen(memoryId: memoryId, service: service),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('shared-collector-memory-detail')), findsOne);
    expect(find.text('Shared by Collector One'), findsOne);
    expect(
      find.byKey(const Key('collector-memory-route-unavailable')),
      findsNothing,
    );
  });

  testWidgets('private or removed Memory is unavailable to another viewer', (
    tester,
  ) async {
    final service = CollectorMemoryService(
      rpc: (functionName, {params}) async => const <Map<String, dynamic>>[],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoryRouteScreen(memoryId: memoryId, service: service),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.byKey(const Key('collector-memory-route-unavailable')),
      findsOne,
    );
    expect(find.text('Memory unavailable'), findsOne);
    expect(find.textContaining('private, removed'), findsOne);
  });
}

Map<String, dynamic> _memoryRow({
  required bool viewerIsOwner,
  required bool isPublic,
}) {
  return <String, dynamic>{
    'id': '22222222-2222-2222-2222-222222222222',
    'vault_item_instance_id': '33333333-3333-3333-3333-333333333333',
    'gv_vi_id': 'GVVI-1',
    'card_print_id': '44444444-4444-4444-4444-444444444444',
    'card_name': 'Pikachu',
    'set_name': 'Promo',
    'gv_id': 'GV-PK-TEST-001',
    'owner_user_id': '11111111-1111-1111-1111-111111111111',
    'owner_slug': 'collector-one',
    'owner_display_name': 'Collector One',
    'viewer_is_owner': viewerIsOwner,
    'memory_type': 'note',
    'note': 'Trade night pull.',
    'photo_path': 'owner/memories/22222222-2222-2222-2222-222222222222/photo',
    'is_public': isPublic,
    'publication_version': isPublic ? 1 : 0,
  };
}
