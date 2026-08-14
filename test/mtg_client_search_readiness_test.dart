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
}
