import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/grookai_memory_card.dart';
import 'package:grookai_vault/services/vault/collector_memory_service.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';

void main() {
  test('collector memory maps to generic memory Grookai object object', () {
    final object = GrookaiMemoryCardAdapter.fromMemory(
      memory: CollectorMemory(
        id: '22222222-2222-2222-2222-222222222222',
        vaultItemInstanceId: '33333333-3333-3333-3333-333333333333',
        gvviId: 'GVVI-123',
        memoryType: CollectorMemoryType.addedPlace,
        note: 'Found this at a local show.',
        placeLabel: 'Dallas card show',
        memoryDate: DateTime.utc(2026, 7, 10),
      ),
      source: const GrookaiMemoryCardSource(
        cardName: 'Pikachu',
        setLine: 'SVP #001',
        cardImageUrl: 'https://example.test/pikachu.webp',
        authorName: 'Casey',
      ),
      skin: GrookaiObjectSkin.kraft,
      signedPhotoUrl: 'https://storage.example.test/memory-photo',
    );

    expect(object.type, 'memory');
    expect(object.layout, 'memory.v1');
    expect(object.skin, GrookaiObjectSkin.kraft);
    expect(object.fields['cardName'], 'Pikachu');
    expect(object.fields['setLine'], 'SVP #001');
    expect(object.fields['location'], 'Dallas card show');
    expect(object.fields['storyText'], 'Found this at a local show.');
    expect(
      object.fields['photoUrl'],
      'https://storage.example.test/memory-photo',
    );
    expect(
      object.metadata['memory_id'],
      '22222222-2222-2222-2222-222222222222',
    );
    expect(object.metadata['gvvi_id'], 'GVVI-123');
    expect(object.metadata['memory_type'], 'added_place');
  });

  test('draft mapping keeps skin in envelope and uses field fallbacks', () {
    final object = GrookaiMemoryCardAdapter.fromDraft(
      source: const GrookaiMemoryCardSource(cardName: '', setLine: ''),
      skin: GrookaiObjectSkin.ivory,
      memoryType: CollectorMemoryType.note,
    );

    expect(object.skin, GrookaiObjectSkin.ivory);
    expect(object.fields['cardName'], 'Card memory');
    expect(object.fields['location'], 'Vault memory');
    expect(object.fields['storyText'], 'A memory from the vault.');
    expect(object.metadata['memory_type'], 'note');
  });
}
