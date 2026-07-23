import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/network/pulse_service.dart';

void main() {
  test('Pulse uses hosted artwork with repaired provider fallback', () {
    final item = PulseItem.fromJson(<String, dynamic>{
      'pulse_item_id': 'card_event:event-1',
      'card_event_id': 'event-1',
      'gv_id': 'GV-PK-CRI-120',
      'display_image_url': 'https://assets.tcgdex.net/en/me/me04/120',
      'payload': <String, dynamic>{},
    });

    expect(item, isNotNull);
    expect(
      item!.displayImageUrl,
      'https://grookaivault.com/api/canon/cards/GV-PK-CRI-120/image',
    );
    expect(
      item.fallbackImageUrl,
      contains(
        Uri.encodeQueryComponent(
          'https://assets.tcgdex.net/en/me/me04/120/high.webp',
        ),
      ),
    );
  });

  test('Pulse retains legacy image fallback without a valid GV-ID', () {
    final item = PulseItem.fromJson(<String, dynamic>{
      'pulse_item_id': 'card_event:event-2',
      'card_event_id': 'event-2',
      'display_image_url': 'https://example.com/card.webp',
      'payload': <String, dynamic>{},
    });

    expect(item, isNotNull);
    expect(item!.displayImageUrl, 'https://example.com/card.webp');
    expect(item.fallbackImageUrl, isNull);
  });
}
