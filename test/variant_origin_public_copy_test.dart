import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/identity/variant_origin_public_copy.dart';

void main() {
  test('returns source-backed copy for public-safe special variants', () {
    final copy = getVariantOriginPublicCopy(
      gvId: 'GV-PK-BASE2-1-NO-SYMBOL',
    );

    expect(copy, isNotNull);
    expect(copy!.familyLabel, 'Jungle No Symbol Error');
    expect(copy.whyItExists, contains('holo rare'));
    expect(copy.whyCollectorsCare, contains('collectors identify separately'));
    expect(copy.sourceUrls, isNotEmpty);
  });

  test('does not return copy for ordinary parent rows', () {
    final copy = getVariantOriginPublicCopy(gvId: 'GV-PK-BASE1-58');

    expect(copy, isNull);
  });

  test('returns family-level promo origin copy without source URLs', () {
    final copy = getVariantOriginPublicCopy(gvId: 'GV-PK-PR-10');

    expect(copy, isNotNull);
    expect(copy!.familyLabel, 'Wizards Black Star Promo');
    expect(copy.whyItExists, contains('promotional checklist'));
    expect(copy.grookaiRule, contains('does not assert exact distribution origin'));
    expect(copy.sourceUrls, isEmpty);
  });

  test('returns exact promo origin copy with source URLs', () {
    final reshiram = getVariantOriginPublicCopy(gvId: 'GV-PK-PR-BLW-BW04');

    expect(reshiram, isNotNull);
    expect(reshiram!.familyLabel, 'New Legends Tins BW Promo');
    expect(reshiram.whyItExists, contains('Reshiram BW04 and Zekrom BW05'));
    expect(reshiram.sourceUrls, hasLength(2));

    final ancientMew = getVariantOriginPublicCopy(gvId: 'GV-PK-MISC-001');

    expect(ancientMew, isNotNull);
    expect(ancientMew!.familyLabel, 'Ancient Mew The Power of One Promo');
    expect(ancientMew.whyItExists, contains('The Power of One'));
    expect(ancientMew.sourceUrls, isNotEmpty);

    final greninja = getVariantOriginPublicCopy(gvId: 'GV-PK-PR-SW-SWSH144');

    expect(greninja, isNotNull);
    expect(greninja!.familyLabel, 'Celebrations Elite Trainer Box Greninja Star Promo');
    expect(greninja.whyItExists, contains('Elite Trainer Box'));
    expect(greninja.sourceUrls, isNotEmpty);
  });
}
