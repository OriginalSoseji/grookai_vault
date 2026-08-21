import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/grookai_objects/lot_share_identity_service.dart';

void main() {
  test('sole Holo printing is not displayed as a variant', () {
    final result = LotShareIdentityService.deriveMeaningfulFinishLabels(
      instanceRows: const [
        {'card_print_id': 'CARD-1', 'card_printing_id': 'PRINT-1'},
      ],
      printingRows: const [
        {
          'id': 'PRINT-1',
          'card_print_id': 'CARD-1',
          'finish_key': 'holo',
          'finish_keys': {'label': 'Holo'},
        },
      ],
    );

    expect(result, isEmpty);
  });

  test('selected finish is shown when sibling printings exist', () {
    final result = LotShareIdentityService.deriveMeaningfulFinishLabels(
      instanceRows: const [
        {'card_print_id': 'CARD-1', 'card_printing_id': 'PRINT-2'},
      ],
      printingRows: const [
        {
          'id': 'PRINT-1',
          'card_print_id': 'CARD-1',
          'finish_key': 'holo',
          'finish_keys': {'label': 'Holo'},
        },
        {
          'id': 'PRINT-2',
          'card_print_id': 'CARD-1',
          'finish_key': 'reverse',
          'finish_keys': {'label': 'Reverse Holo'},
        },
      ],
    );

    expect(result, {'CARD-1': 'Reverse Holo'});
  });

  test('unknown selected printing does not guess a finish', () {
    final result = LotShareIdentityService.deriveMeaningfulFinishLabels(
      instanceRows: const [
        {'card_print_id': 'CARD-1', 'card_printing_id': 'MISSING'},
      ],
      printingRows: const [
        {'id': 'PRINT-1', 'card_print_id': 'CARD-1', 'finish_key': 'holo'},
        {'id': 'PRINT-2', 'card_print_id': 'CARD-1', 'finish_key': 'reverse'},
      ],
    );

    expect(result, isEmpty);
  });
}
