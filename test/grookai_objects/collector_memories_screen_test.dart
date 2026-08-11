import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/grookai_objects/collector_memories_screen.dart';
import 'package:grookai_vault/screens/grookai_objects/collector_memory_detail_screen.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/services/grookai_objects/memory_card_print_service.dart';
import 'package:grookai_vault/services/vault/collector_memory_service.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_renderer.dart';
import 'package:share_plus/share_plus.dart';

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

  testWidgets('tapping a Memory opens its Memory detail, not card detail', (
    tester,
  ) async {
    const fullNote =
        'Found at trade night after looking for this exact printing all year.';
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
                  memoryType: CollectorMemoryType.occasion,
                  note: fullNote,
                  placeLabel: 'Denver',
                  occasionLabel: 'Trade night',
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

    await tester.tap(find.text('Pikachu').first);
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('collector-memory-detail')), findsOneWidget);
    expect(find.byType(GrookaiObjectRenderer), findsOneWidget);
    expect(find.text('Memory'), findsWidgets);
    await tester.scrollUntilVisible(
      find.byKey(const Key('collector-memory-full-note')),
      300,
    );
    expect(find.byKey(const Key('collector-memory-full-note')), findsOneWidget);
    expect(find.text(fullNote), findsWidgets);
    expect(find.text('Trade night'), findsWidgets);
    expect(find.text('Jul 10, 2026'), findsWidgets);
    await tester.scrollUntilVisible(
      find.byKey(const Key('view-memory-card-button')),
      300,
    );
    expect(find.byKey(const Key('view-memory-card-button')), findsOneWidget);
  });

  testWidgets('Memory detail opens card only from the explicit action', (
    tester,
  ) async {
    var viewCardCalls = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoryDetailScreen(
          item: const OwnerCollectorMemory(
            memory: CollectorMemory(
              id: 'memory-1',
              vaultItemInstanceId: 'instance-1',
              gvviId: 'GVVI-1',
              memoryType: CollectorMemoryType.note,
              note: 'A complete memory.',
            ),
            cardPrintId: 'card-1',
            cardName: 'Pikachu',
            setName: 'Promo',
          ),
          onViewCard: () => viewCardCalls += 1,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(viewCardCalls, 0);
    await tester.scrollUntilVisible(
      find.byKey(const Key('view-memory-card-button')),
      300,
    );
    await tester.tap(find.byKey(const Key('view-memory-card-button')));
    await tester.pump();
    expect(viewCardCalls, 1);
  });

  testWidgets('Memory detail prepares an exact-size Memory insert for print', (
    tester,
  ) async {
    final printService = _FakeMemoryPrintService();
    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoryDetailScreen(
          item: const OwnerCollectorMemory(
            memory: CollectorMemory(
              id: 'memory-1',
              vaultItemInstanceId: 'instance-1',
              gvviId: 'GVVI-1',
              memoryType: CollectorMemoryType.note,
              note: 'A complete memory.',
            ),
            cardPrintId: 'card-1',
            cardName: 'Pikachu',
            setName: 'Promo',
          ),
          printService: printService,
          exportService: _FakeObjectExportService(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('print-memory-button')));
    await tester.pumpAndSettle();
    expect(find.text('Memory insert'), findsOneWidget);

    await tester.tap(find.byKey(const Key('print-memory-insert-option')));
    await tester.pumpAndSettle();

    expect(printService.printCalls, 1);
    expect(printService.lastMode, MemoryCardPrintMode.memoryInsert);
    expect(printService.lastMemorySide, isNotNull);
    expect(printService.lastMemorySide, isNotEmpty);
  });

  testWidgets(
    'Memory detail shares through the existing destination workflow',
    (tester) async {
      final exportService = _FakeObjectExportService();
      await tester.pumpWidget(
        MaterialApp(
          home: CollectorMemoryDetailScreen(
            item: const OwnerCollectorMemory(
              memory: CollectorMemory(
                id: 'memory-1',
                vaultItemInstanceId: 'instance-1',
                gvviId: 'GVVI-1',
                memoryType: CollectorMemoryType.note,
                note: 'A complete memory.',
              ),
              cardPrintId: 'card-1',
              cardName: 'Pikachu',
              setName: 'Promo',
            ),
            exportService: exportService,
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('share-memory-button')));
      await tester.pumpAndSettle();

      expect(find.text('Instagram Feed'), findsOneWidget);
      expect(find.text('Story'), findsOneWidget);
      expect(find.text('Save Image'), findsOneWidget);
      expect(find.text('eBay Listing'), findsNothing);

      await tester.tap(find.text('Story'));
      await tester.pumpAndSettle();

      expect(exportService.shareCalls, 1);
      expect(exportService.lastFileName, 'grookai-memory-story-pikachu.png');
      expect(exportService.lastSubject, 'Grookai memory card');
      expect(exportService.lastBytes, isNotEmpty);
    },
  );

  testWidgets('maximum-length Memory note renders without overflow', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CollectorMemoryDetailScreen(
          item: OwnerCollectorMemory(
            memory: CollectorMemory(
              id: 'memory-long',
              vaultItemInstanceId: 'instance-1',
              gvviId: 'GVVI-1',
              memoryType: CollectorMemoryType.note,
              note: List.filled(
                120,
                'remembered detail',
              ).join(' ').substring(0, 1200),
            ),
            cardPrintId: 'card-1',
            cardName: 'Pikachu',
            setName: 'Promo',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
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

class _FakeMemoryPrintService extends MemoryCardPrintService {
  int printCalls = 0;
  MemoryCardPrintMode? lastMode;
  Uint8List? lastMemorySide;

  @override
  Future<bool> printMemory({
    required Uint8List memorySidePng,
    Uint8List? cardSidePng,
    required MemoryCardPrintMode mode,
    required String documentName,
  }) async {
    printCalls += 1;
    lastMode = mode;
    lastMemorySide = memorySidePng;
    return true;
  }
}

class _FakeObjectExportService extends GrookaiObjectExportService {
  int shareCalls = 0;
  Uint8List? lastBytes;
  String? lastFileName;
  String? lastSubject;

  @override
  Future<Uint8List> capturePng(
    GlobalKey repaintBoundaryKey, {
    double pixelRatio = 3,
  }) async {
    return Uint8List.fromList(const [137, 80, 78, 71]);
  }

  @override
  Future<ShareResult> sharePng({
    required Uint8List bytes,
    required String fileName,
    String? text,
    String? subject,
    Rect? sharePositionOrigin,
  }) async {
    shareCalls += 1;
    lastBytes = bytes;
    lastFileName = fileName;
    lastSubject = subject;
    return ShareResult.unavailable;
  }
}
