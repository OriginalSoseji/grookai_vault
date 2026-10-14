import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/utils/pokemon_sprite_url.dart';

void main() {
  test('Pokemon sprite URLs use the governed Grookai-hosted corpus', () {
    expect(
      pokemonSpriteUrl(1),
      'https://grookaivault.com/dex/sprites/v1/1.png',
    );
  });

  test('invalid National Dex numbers do not produce an image URL', () {
    expect(pokemonSpriteUrl(0), isNull);
    expect(pokemonSpriteUrl(-1), isNull);
  });
}
