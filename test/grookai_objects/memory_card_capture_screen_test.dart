import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:grookai_vault/models/grookai_memory_card.dart';
import 'package:grookai_vault/screens/grookai_objects/memory_card_capture_screen.dart';
import 'package:grookai_vault/services/vault/collector_memory_service.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('capture flow validates an empty memory draft', (tester) async {
    _useTallViewport(tester);
    final service = _FakeMemoryService();
    await tester.pumpWidget(
      MaterialApp(
        home: MemoryCardCaptureScreen(
          gvviId: 'GVVI-123',
          cardPrintId: 'CARD-123',
          source: const GrookaiMemoryCardSource(
            cardName: 'Pikachu',
            setLine: 'SVP #001',
          ),
          memoryService: service,
          currentUserId: 'user-1',
        ),
      ),
    );

    await tester.tap(find.text('Save memory card'));
    await tester.pump();

    expect(find.text('Add a note, place, occasion, or photo.'), findsOneWidget);
    expect(service.createCalls, 0);
  });

  testWidgets(
    'capture flow saves via CollectorMemoryService and previews result',
    (tester) async {
      _useTallViewport(tester);
      final service = _FakeMemoryService();
      await tester.pumpWidget(
        MaterialApp(
          home: MemoryCardCaptureScreen(
            gvviId: 'GVVI-123',
            cardPrintId: 'CARD-123',
            source: const GrookaiMemoryCardSource(
              cardName: 'Pikachu',
              setLine: 'SVP #001',
              authorName: 'Casey',
            ),
            memoryService: service,
            currentUserId: 'user-1',
          ),
        ),
      );

      await tester.enterText(
        find.byType(TextField).first,
        'Found at trade night.',
      );
      await tester.enterText(find.byType(TextField).at(1), 'Denver');
      await tester.tap(find.text('Save memory card'));
      await tester.pumpAndSettle();

      expect(service.createCalls, 1);
      expect(service.lastGvviId, 'GVVI-123');
      expect(service.lastNote, 'Found at trade night.');
      expect(service.lastPlace, 'Denver');
      expect(find.text('Memory card saved.'), findsOneWidget);
    },
  );
}

void _useTallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(900, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(() {
    tester.view.resetPhysicalSize();
    tester.view.resetDevicePixelRatio();
  });
}

class _FakeMemoryService extends CollectorMemoryService {
  _FakeMemoryService() : super(rpc: (_, {params}) async => null);

  int createCalls = 0;
  String? lastGvviId;
  String? lastNote;
  String? lastPlace;

  @override
  Future<CollectorMemory> create({
    required String gvviId,
    required CollectorMemoryType memoryType,
    String? note,
    String? photoPath,
    String? placeLabel,
    String? occasionLabel,
    DateTime? memoryDate,
    String? promptKey,
  }) async {
    createCalls += 1;
    lastGvviId = gvviId;
    lastNote = note;
    lastPlace = placeLabel;
    return CollectorMemory(
      id: '22222222-2222-2222-2222-222222222222',
      vaultItemInstanceId: '33333333-3333-3333-3333-333333333333',
      gvviId: gvviId,
      memoryType: memoryType,
      note: note,
      placeLabel: placeLabel,
      occasionLabel: occasionLabel,
      memoryDate: memoryDate,
      createdAt: DateTime.utc(2026, 7, 12),
    );
  }

  @override
  Future<String?> createSignedPhotoUrl(
    String? photoPath, {
    int expiresIn = 3600,
  }) async {
    return null;
  }
}
