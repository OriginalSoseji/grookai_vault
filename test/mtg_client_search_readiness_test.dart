import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/models/card_print.dart';
import 'package:grookai_vault/services/identity/display_identity.dart';

void main() {
  test('MTG finish labels are deterministic in Flutter', () {
    expect(formatFinishLabel(finishKey: 'normal'), 'Normal');
    expect(formatFinishLabel(finishKey: 'foil'), 'Foil');
    expect(formatFinishLabel(finishKey: 'etched'), 'Etched Foil');
  });

  test('CardPrint preserves an exact nonnumeric collector token', () {
    final card = CardPrint.fromJson(<String, dynamic>{
      'id': 'fixture-card',
      'gv_id': 'GV-MTG-FIXTURE',
      'name': 'Fixture Card',
      'set_code': 'tst',
      'number': '123a',
      'number_plain': null,
      'rarity': 'rare',
    });

    expect(card.number, '123a');
    expect(card.displayNumber, '123a');
  });

  test(
    'MTG collector search preserves suffix, prefix, hyphen, and symbol tokens',
    () {
      expect(normalizeMtgCollectorNumberToken('78s'), '78s');
      expect(normalizeMtgCollectorNumberToken('BL6'), 'bl6');
      expect(normalizeMtgCollectorNumberToken('A-123'), 'a-123');
      expect(normalizeMtgCollectorNumberToken('#123a/281'), '123a');
      expect(normalizeMtgCollectorNumberToken('★'), '★');
      expect(normalizeMtgCollectorNumberToken('†'), '†');
    },
  );

  test('ordinary card names cannot be reclassified as collector numbers', () {
    expect(normalizeMtgCollectorNumberToken('Black'), isEmpty);
    expect(normalizeMtgCollectorNumberToken('Lotus'), isEmpty);
    expect(normalizeMtgCollectorNumberToken(''), isEmpty);
  });
}
