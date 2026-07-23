import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/grookai_objects/collector_memories_screen.dart';
import 'package:grookai_vault/services/vault/collector_memory_service.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';

void main() {
  testWidgets('Memories home renders empty state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoriesScreen(
          service: _FakeMemoryService(memories: const []),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No memories yet'), findsOneWidget);
  });

  testWidgets('Memories home renders error state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoriesScreen(
          service: _FakeMemoryService(error: StateError('rpc unavailable')),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Unable to load memories'), findsOneWidget);
    expect(find.text('Try again'), findsOneWidget);
  });

  testWidgets('Memories home renders populated state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoriesScreen(
          service: _FakeMemoryService(
            memories: [
              OwnerCollectorMemory(
                memory: CollectorMemory(
                  id: 'memory-1',
                  vaultItemInstanceId: 'instance-1',
                  gvviId: 'GVVI-1',
                  memoryType: CollectorMemoryType.note,
                  note: 'Found at trade night.',
                  placeLabel: 'Denver',
                  memoryDate: DateTime.utc(2026, 7, 10),
                ),
                cardPrintId: 'card-1',
                cardName: 'Pikachu',
                setName: 'Scarlet & Violet Promos',
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Pikachu'), findsWidgets);
    expect(find.text('Found at trade night.'), findsOneWidget);
    expect(find.text('Scarlet & Violet Promos'), findsOneWidget);
    expect(find.textContaining('Denver'), findsOneWidget);
  });

  testWidgets('catalog thumbnail uses hosted primary and provider fallback', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoriesScreen(
          service: _FakeMemoryService(
            memories: [
              OwnerCollectorMemory(
                memory: const CollectorMemory(
                  id: 'memory-1',
                  vaultItemInstanceId: 'instance-1',
                  gvviId: 'GVVI-1',
                  memoryType: CollectorMemoryType.note,
                ),
                cardPrintId: 'card-1',
                cardName: 'Pikachu',
                setName: 'Promo',
                gvId: 'GV-PK-TEST-001',
                cardImageUrl: 'https://images.pokemontcg.io/test/001_hires.png',
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final artwork = tester.widget<CardSurfaceArtwork>(
      find.byType(CardSurfaceArtwork),
    );
    expect(
      Uri.parse(artwork.imageUrl!).path,
      '/api/canon/cards/GV-PK-TEST-001/image',
    );
    expect(artwork.fallbackImageUrl, isNotNull);
  });

  testWidgets('signed memory photo remains primary over catalog artwork', (
    tester,
  ) async {
    const signedPhotoUrl = 'https://storage.example.test/signed-memory-photo';
    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoriesScreen(
          service: _FakeMemoryService(
            signedPhotoUrl: signedPhotoUrl,
            memories: [
              OwnerCollectorMemory(
                memory: const CollectorMemory(
                  id: 'memory-1',
                  vaultItemInstanceId: 'instance-1',
                  gvviId: 'GVVI-1',
                  memoryType: CollectorMemoryType.note,
                  photoPath: 'user/memories/memory-1/photo',
                ),
                cardPrintId: 'card-1',
                cardName: 'Pikachu',
                setName: 'Promo',
                gvId: 'GV-PK-TEST-001',
                cardImageUrl: 'https://images.pokemontcg.io/test/001_hires.png',
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final artwork = tester.widget<CardSurfaceArtwork>(
      find.byType(CardSurfaceArtwork),
    );
    expect(artwork.imageUrl, signedPhotoUrl);
    expect(
      Uri.parse(artwork.fallbackImageUrl!).path,
      '/api/canon/cards/GV-PK-TEST-001/image',
    );
  });
}

class _FakeMemoryService extends CollectorMemoryService {
  _FakeMemoryService({
    this.memories = const [],
    this.error,
    this.signedPhotoUrl,
  }) : super(rpc: (_, {params}) async => null);

  final List<OwnerCollectorMemory> memories;
  final Object? error;
  final String? signedPhotoUrl;

  @override
  Future<List<OwnerCollectorMemory>> loadOwnerMemories({
    int limit = 50,
    DateTime? beforeCreatedAt,
    String? beforeId,
  }) async {
    final failure = error;
    if (failure != null) {
      throw failure;
    }
    return memories;
  }

  @override
  Future<String?> createSignedPhotoUrl(
    String? photoPath, {
    int expiresIn = 3600,
  }) async {
    return photoPath == null ? null : signedPhotoUrl;
  }
}
