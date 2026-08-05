import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/public/compare_service.dart';

void main() {
  final controller = CompareCardSelectionController.instance;

  setUp(controller.clear);
  tearDown(controller.clear);

  test('compare selection preserves exact child-printing context', () {
    controller.toggle(
      'GV-PK-MEW-173',
      cardPrintingId: 'printing-173-holo',
      printingGvId: 'GV-PK-MEW-173-H',
      finishLabel: 'Holo',
    );

    final context = controller.contextFor('GV-PK-MEW-173');
    expect(context, isNotNull);
    expect(context!.cardPrintingId, 'printing-173-holo');
    expect(context.printingGvId, 'GV-PK-MEW-173-H');
    expect(context.finishLabel, 'Holo');
    expect(context.hasExactPrinting, isTrue);
  });

  test('parent-only compare selection remains explicitly unresolved', () {
    controller.toggle('GV-PK-MEW-025');

    final context = controller.contextFor('GV-PK-MEW-025');
    expect(context, isNotNull);
    expect(context!.hasExactPrinting, isFalse);
    expect(context.finishLabel, isNull);
  });

  test('removing or clearing a card removes its printing context', () {
    controller.toggle(
      'GV-PK-MEW-173',
      cardPrintingId: 'printing-173-holo',
      finishLabel: 'Holo',
    );
    controller.toggle('GV-PK-MEW-173');
    expect(controller.contextFor('GV-PK-MEW-173'), isNull);

    controller.toggle('GV-PK-MEW-025');
    controller.clear();
    expect(controller.selectionContexts, isEmpty);
  });
}
