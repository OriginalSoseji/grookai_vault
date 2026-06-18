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
}
