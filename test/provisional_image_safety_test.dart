import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/provisional_card.dart';

Map<String, dynamic> _payload({String? imageUrl}) => <String, dynamic>{
  'candidate_id': 'candidate-1',
  'display_name': 'Pikachu',
  'set_hint': 'sv01',
  'number_hint': '025/198',
  'provisional_state': 'RAW',
  'provisional_label': 'UNCONFIRMED',
  'public_explanation': 'Not part of the canonical catalog yet.',
  if (imageUrl != null) 'image_url': imageUrl,
};

void main() {
  test('safe public provisional image remains allowed', () {
    final card = PublicProvisionalCard.fromJson(
      _payload(imageUrl: 'https://images.example.com/pikachu.png'),
    );

    expect(card.displayImageUrl, 'https://images.example.com/pikachu.png');
  });

  test('private signed provisional image is filtered', () {
    final card = PublicProvisionalCard.fromJson(
      _payload(
        imageUrl:
            'https://example.supabase.co/storage/v1/object/sign/founder-review/private.png?token=secret',
      ),
    );

    expect(card.displayImageUrl, isNull);
  });

  test('non-http provisional image is filtered', () {
    final card = PublicProvisionalCard.fromJson(
      _payload(imageUrl: 'storage/private/path.webp'),
    );

    expect(card.displayImageUrl, isNull);
  });
}
