import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/identity/variant_origin_public_copy.dart';

void main() {
  test('integration preserves current-main lowercase grookai origin copy', () {
    for (final gvId in ['GV-PK-MISC-001', 'GV-PK-PR-BLW-BW04', 'GV-PK-PR-10']) {
      final copy = getVariantOriginPublicCopy(gvId: gvId);
      expect(copy, isNotNull);
      expect(copy!.grookaiRule, startsWith('grookai'));
      expect(copy.grookaiRule, isNot(contains('Grookai')));
    }
  });
  final cases = <(String, String, String, String, bool)>[
    (
      'GV-PK-PR-SV-173',
      'a36f8d8a-353f-4cca-ba89-912eb7f10c3a',
      'Eevee',
      'Prismatic Evolutions',
      false,
    ),
    (
      'GV-PK-SVP-173-POKEMON-CENTER-STAMP',
      'cffe987c-a680-4f7e-b1cf-96c89bc9e229',
      'Eevee',
      'Prismatic Evolutions',
      true,
    ),
    (
      'GV-PK-PR-SV-051',
      'c7171ec8-743d-453d-bc8b-47517986916f',
      'Snorlax',
      '151',
      false,
    ),
    (
      'GV-PK-SVP-051-POKEMON-CENTER-STAMP',
      'f605056d-5521-4dcf-a6e2-176b6d2ca7b5',
      'Snorlax',
      '151',
      true,
    ),
  ];
  for (final (gvId, uuid, name, expansion, stamped) in cases) {
    test('$gvId describes its exact ETB and logo treatment', () {
      final byGv = getVariantOriginPublicCopy(gvId: gvId.toLowerCase());
      final byId = getVariantOriginPublicCopy(cardPrintId: uuid);
      expect(byGv, isNotNull);
      expect(byId!.whyItExists, byGv!.whyItExists);
      expect(byGv.whyItExists, contains(name));
      expect(byGv.whyItExists, contains(expansion));
      expect(byGv.whyItExists, contains('Elite Trainer Box'));
      expect(
        byGv.howToIdentify,
        contains(
          stamped
              ? 'and the Pokémon Center logo above the retreat cost'
              : 'and the absence of the Pokémon Center logo above the retreat cost',
        ),
      );
      expect(byGv.confidence, 'high');
      expect(byGv.sourceUrls, isNotEmpty);
      expect(
        byGv.sourceUrls.every(
          (url) =>
              Uri.parse(url).host == 'www.pokemon.com' ||
              Uri.parse(url).host == 'press.pokemon.com',
        ),
        isTrue,
      );
    });
  }
}
