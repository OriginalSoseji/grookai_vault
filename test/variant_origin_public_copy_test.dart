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

  test('excludes promo rows that still need manual source review', () {
    final copy = getVariantOriginPublicCopy(gvId: 'GV-PK-PR-BLW-BW04');

    expect(copy, isNull);
  });
}
