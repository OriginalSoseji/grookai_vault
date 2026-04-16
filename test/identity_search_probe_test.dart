import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/services/identity/display_identity.dart';
import 'package:grookai_vault/services/identity/identity_search.dart';

void main() {
  CardPrint buildCard({
    required String id,
    required String name,
    required String setCode,
    required String setName,
    required String number,
    String? variantKey,
    String? printedIdentityModifier,
    String? setIdentityModel,
  }) {
    return CardPrint(
      id: id,
      name: name,
      setCode: setCode,
      setName: setName,
      number: number,
      variantKey: variantKey,
      printedIdentityModifier: printedIdentityModifier,
      setIdentityModel: setIdentityModel,
    );
  }

  test('identity filter and display helpers stay aligned', () {
    final pikachuStamp = buildCard(
      id: 'pikachu-stamp',
      name: 'Pikachu',
      setCode: 'sv3pt5',
      setName: '151',
      number: '025',
      variantKey: 'pokemon_together_stamp',
      setIdentityModel: 'standard',
    );
    final umbreonAlt = buildCard(
      id: 'umbreon-alt',
      name: 'Umbreon VMAX',
      setCode: 'evs',
      setName: 'Evolving Skies',
      number: '215',
      variantKey: 'alt',
      setIdentityModel: 'standard',
    );
    final umbreonCc = buildCard(
      id: 'umbreon-cc',
      name: 'Umbreon ★',
      setCode: 'cel25c',
      setName: 'Celebrations',
      number: '17',
      variantKey: 'cc',
      setIdentityModel: 'reprint_anthology',
    );
    final unownA = buildCard(
      id: 'unown-a',
      name: 'Unown',
      setCode: 'uf',
      setName: 'Unseen Forces',
      number: 'A',
      variantKey: 'A',
      setIdentityModel: 'standard',
    );
    final zapdos = buildCard(
      id: 'zapdos',
      name: 'Zapdos',
      setCode: 'base1',
      setName: 'Base Set',
      number: '16',
      setIdentityModel: 'standard',
    );

    expect(
      resolveDisplayName(pikachuStamp),
      'Pikachu · Pokémon Together Stamp',
    );
    expect(matchesIdentityFilter(pikachuStamp, kIdentityFilterPokemonTogetherStamp), isTrue);
    expect(getIdentitySearchTokens(pikachuStamp), contains('stamp'));

    expect(resolveDisplayName(umbreonAlt), 'Umbreon VMAX · Alternate Art');
    expect(matchesIdentityFilter(umbreonAlt, kIdentityFilterAlternateArt), isTrue);
    expect(getIdentitySearchTokens(umbreonAlt), contains('alt art'));

    expect(resolveDisplayName(umbreonCc), 'Umbreon ★ · Classic Collection');
    expect(matchesIdentityFilter(umbreonCc, kIdentityFilterClassicCollection), isTrue);
    expect(getIdentitySearchTokens(umbreonCc), contains('classic collection'));

    expect(getIdentitySearchTokens(unownA), contains('a'));
    expect(resolveDisplayName(zapdos), 'Zapdos');
    expect(getCardIdentityFilterKeys(zapdos), isEmpty);
  });
}
