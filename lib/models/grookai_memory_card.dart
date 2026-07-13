import '../services/vault/collector_memory_service.dart';
import '../widgets/grookai_objects/grookai_object_models.dart';
import '../widgets/grookai_objects/grookai_object.dart';
import '../widgets/grookai_objects/grookai_object_skin.dart';

class GrookaiMemoryCardSource {
  const GrookaiMemoryCardSource({
    required this.cardName,
    required this.setLine,
    this.cardImageUrl,
    this.authorName = 'You',
  });

  final String cardName;
  final String setLine;
  final String? cardImageUrl;
  final String authorName;
}

class GrookaiMemoryCardAdapter {
  const GrookaiMemoryCardAdapter._();

  static GrookaiObject fromMemory({
    required CollectorMemory memory,
    required GrookaiMemoryCardSource source,
    required GrookaiObjectSkin skin,
    String? signedPhotoUrl,
  }) {
    final date = memory.memoryDate ?? memory.createdAt ?? DateTime.now();
    return _object(
      skin: skin,
      source: source,
      listingNo: listingNoFor(memory.id),
      date: date,
      location: memory.placeLabel,
      photoUrl: signedPhotoUrl,
      storyText: memory.note,
      metadata: <String, dynamic>{
        'memory_id': memory.id,
        'gvvi_id': memory.gvviId,
        'vault_item_instance_id': memory.vaultItemInstanceId,
        'memory_type': memory.memoryType.rpcValue,
      },
    );
  }

  static GrookaiObject fromDraft({
    required GrookaiMemoryCardSource source,
    required GrookaiObjectSkin skin,
    required CollectorMemoryType memoryType,
    DateTime? memoryDate,
    String? note,
    String? placeLabel,
    String? photoUrl,
  }) {
    return _object(
      skin: skin,
      source: source,
      listingNo: 'DRAFT',
      date: memoryDate ?? DateTime.now(),
      location: placeLabel,
      photoUrl: photoUrl,
      storyText: note,
      metadata: <String, dynamic>{'memory_type': memoryType.rpcValue},
    );
  }

  static String listingNoFor(String id) {
    final cleaned = id.replaceAll(RegExp(r'[^A-Za-z0-9]'), '').toUpperCase();
    if (cleaned.isEmpty) {
      return '001';
    }
    return cleaned.length <= 6
        ? cleaned.padLeft(3, '0')
        : cleaned.substring(cleaned.length - 6);
  }

  static GrookaiObject _object({
    required GrookaiObjectSkin skin,
    required GrookaiMemoryCardSource source,
    required String listingNo,
    required DateTime date,
    required Map<String, dynamic> metadata,
    String? location,
    String? photoUrl,
    String? storyText,
  }) {
    final data = MemoryCardData(
      skin: skin,
      card: CardObjectRef(
        cardName: _fallback(source.cardName, 'Card memory'),
        setLine: source.setLine,
        cardImageUrl: _blankToNull(source.cardImageUrl),
      ),
      listingNo: listingNo,
      date: date,
      location: _fallback(location, 'Vault memory'),
      photoUrl: _blankToNull(photoUrl),
      storyText: _fallback(storyText, 'A memory from the vault.'),
      authorName: _fallback(source.authorName, 'You'),
    );
    return GrookaiObject(
      type: 'memory',
      skin: skin,
      layout: 'memory.v1',
      fields: data.toFields(),
      metadata: metadata,
    );
  }
}

String _fallback(String? value, String fallback) {
  final normalized = (value ?? '').trim();
  return normalized.isEmpty ? fallback : normalized;
}

String? _blankToNull(String? value) {
  final normalized = (value ?? '').trim();
  return normalized.isEmpty ? null : normalized;
}
