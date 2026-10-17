import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/sales/inventory_economics_service.dart';

void main() {
  test('equal allocation reconciles odd cents deterministically', () {
    expect(equalInventorySplit(30000, 50).fold(0, (a, b) => a + b), 30000);
    expect(equalInventorySplit(100, 3), [34, 33, 33]);
  });

  test('weighted allocation preserves the exact paid total', () {
    expect(weightedInventorySplit(600, [100, 10000]), [6, 594]);
    expect(weightedInventorySplit(601, [1, 1]), [301, 300]);
    expect(weightedInventorySplit(600, [0, 0]), [300, 300]);
  });

  test('manual allocation is passed through for reconciliation', () {
    expect(
      inventoryAllocationPreview(
        totalMinor: 900,
        referenceMinor: [1, 2],
        manualMinor: [100, 800],
        mode: 'manual',
      ),
      [100, 800],
    );
  });

  test('money parsing accepts cents and rejects malformed input', () {
    expect(inventoryMoneyInput('300'), 30000);
    expect(inventoryMoneyInput('6.5'), 650);
    expect(inventoryMoneyInput(''), isNull);
    expect(inventoryMoneyInput('-1'), isNull);
    expect(inventoryMoney(601), '6.01');
  });
}
