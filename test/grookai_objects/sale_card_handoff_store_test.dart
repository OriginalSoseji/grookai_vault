import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grookai_vault/models/grookai_sale_listing.dart';
import 'package:grookai_vault/services/grookai_objects/grookai_object_export_service.dart';
import 'package:grookai_vault/services/grookai_objects/sale_card_handoff_store.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';

const _owner = 'a1000000-0000-4000-8000-000000000001';
const _otherOwner = 'a1000000-0000-4000-8000-000000000002';
const _instance = 'a1000000-0000-4000-8000-000000000003';
const _vaultItem = 'a1000000-0000-4000-8000-000000000004';
const _cardPrint = 'a1000000-0000-4000-8000-000000000005';

void main() {
  late SaleCardHandoffStore store;

  setUp(() {
    SharedPreferences.setMockInitialValues({});
    store = SaleCardHandoffStore();
  });

  test(
    'handoff retains only the selected owner, copy, and sale-card edits',
    () async {
      await store.save(_draft());

      final restored = await store.load(_owner);
      expect(restored?.ownerId, _owner);
      expect(restored?.instanceId, _instance);
      expect(restored?.saleCard?.copy.gvviId, 'GVVI-123');
      expect(restored?.saleCard?.source.cardName, 'Umbreon VMAX');
      expect(restored?.saleCard?.skin, GrookaiObjectSkin.kraft);
      expect(restored?.saleCard?.condition, 'Raw LP');
      expect(restored?.saleCard?.priceText, '42.50');
      expect(restored?.saleCard?.note, 'Ship in a sleeve');
      expect(restored?.saleCard?.firm, isFalse);
      expect(restored?.saleCard?.allowDms, isTrue);
      expect(restored?.saleCard?.showFront, isFalse);
      expect(
        restored?.saleCard?.destination,
        GrookaiObjectExportDestination.story,
      );
      expect(await store.load(_otherOwner), isNull);
    },
  );

  test(
    'selected-copy refresh preserves its matching sale-card handoff',
    () async {
      await store.save(_draft());
      await store.saveSelectedCopy(ownerId: _owner, instanceId: _instance);

      final restored = await store.load(_owner);
      expect(restored?.instanceId, _instance);
      expect(restored?.saleCard?.priceText, '42.50');
    },
  );

  test(
    'a different selected copy cannot inherit the previous card draft',
    () async {
      await store.save(_draft());
      await store.saveSelectedCopy(
        ownerId: _owner,
        instanceId: 'a1000000-0000-4000-8000-000000000006',
      );

      final restored = await store.load(_owner);
      expect(restored?.instanceId, 'a1000000-0000-4000-8000-000000000006');
      expect(restored?.saleCard, isNull);
    },
  );

  test('expired return context is removed and cannot be resumed', () async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      'grookai.sale-card.handoff.v1.$_owner',
      jsonEncode({
        'version': 1,
        'ownerId': _owner,
        'instanceId': _instance,
        'savedAtMillis': DateTime.now()
            .subtract(const Duration(days: 2))
            .millisecondsSinceEpoch,
        'saleCard': _draft().toJson(),
      }),
    );

    expect(await store.load(_owner), isNull);
    expect(prefs.getString('grookai.sale-card.handoff.v1.$_owner'), isNull);
  });
}

SaleCardHandoff _draft() => SaleCardHandoff(
  ownerId: _owner,
  copy: const SaleListingCopyContext(
    instanceId: _instance,
    gvviId: 'GVVI-123',
    vaultItemId: _vaultItem,
    cardPrintId: _cardPrint,
    conditionLabel: 'LP',
    askingPriceAmount: 42.5,
    askingPriceNote: 'Ship in a sleeve',
  ),
  source: const GrookaiSaleListingSource(
    cardName: 'Umbreon VMAX',
    setLine: 'Evolving Skies #215',
    printingIdentityLabel: 'Reverse Holofoil · English',
  ),
  skin: GrookaiObjectSkin.kraft,
  condition: 'Raw LP',
  priceText: '42.50',
  note: 'Ship in a sleeve',
  firm: false,
  allowDms: true,
  showFront: false,
  destination: GrookaiObjectExportDestination.story,
  savedAtMillis: DateTime.now().millisecondsSinceEpoch,
);
