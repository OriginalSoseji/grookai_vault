import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/grookai_objects/grookai_objects_hub_screen.dart';
import 'package:grookai_vault/screens/grookai_objects/lot_pricing_screen.dart';
import 'package:grookai_vault/screens/grookai_objects/for_sale_terms_screen.dart';
import 'package:grookai_vault/services/grookai_objects/object_inventory_service.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import '../support/owner_copy_fixture.dart';

class FixtureInventory extends VendorPricingWorkspaceService {
  int loads = 0;
  bool fail = false;
  @override
  Future<VendorPricingWorkspaceData> load() async {
    loads++;
    if (fail) throw StateError('Fixture inventory unavailable');
    return VendorPricingWorkspaceData(
      rows: [
        copy('one', finish: 'Holo', price: 2),
        copy('two', finish: 'Reverse Holo', price: 3),
        copy('slab', slab: true),
      ],
      sections: const [],
    );
  }
}

VendorPricingWorkspaceRow copy(
  String id, {
  String? finish,
  double? price,
  bool slab = false,
}) => VendorPricingWorkspaceRow(
  instanceId: id,
  gvviId: 'GVVI-$id',
  vaultItemId: 'anchor-$id',
  cardPrintId: 'same-parent',
  cardPrintingId: slab ? null : 'printing-$id',
  gvId: '',
  name: 'Fixture card',
  displayName: 'Fixture card',
  number: '1',
  setName: 'Fixture Set',
  printingLabel: finish ?? 'Slab',
  conditionLabel: 'NM',
  intent: 'hold',
  isGraded: slab,
  gradeCompany: slab ? 'PSA' : null,
  gradeLabel: slab ? '10' : null,
  marketPrice: price,
  askingPrice: id == 'two' ? 7.50 : null,
  askingPriceNote: id == 'two' ? 'Existing copy note' : null,
  currency: 'USD',
  sectionIds: const {},
);

void main() {
  testWidgets('Sale opens the selected exact copy without a reconciling RPC', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 4500);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final f = OwnerCopyFixture();
    await tester.runAsync(f.signIn);
    await tester.pumpWidget(
      MaterialApp(
        home: GrookaiObjectsHubScreen(
          client: f.client,
          inventoryService: ObjectInventoryService(
            inventory: FixtureInventory(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sale'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('GVVI-two'));
    await tester.pumpAndSettle();
    final screen = tester.widget<ForSaleTermsScreen>(
      find.byType(ForSaleTermsScreen),
    );
    expect(screen.initialCopy?.instanceId, 'two');
    expect(screen.initialCopy?.vaultItemId, 'anchor-two');
    expect(screen.initialCopy?.gvviId, 'GVVI-two');
    expect(find.text('7.50'), findsOneWidget);
    expect(find.text('Existing copy note'), findsOneWidget);
    expect(f.requests, isEmpty);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.runAsync(f.client.dispose);
  });
  test(
    'actual Objects inventory reader includes slab identity and survives unavailable optional prices',
    () async {
      final f = OwnerCopyFixture()..priceFails = true;
      f.tableReads.addAll({
        'vault_item_instances': [
          {
            'id': 'raw',
            'gv_vi_id': 'GVVI-raw',
            'card_print_id': 'same-parent',
            'card_printing_id': 'reverse',
            'intent': 'hold',
          },
          {
            'id': 'slab',
            'gv_vi_id': 'GVVI-slab',
            'slab_cert_id': 'cert',
            'intent': 'hold',
          },
        ],
        'slab_certs': [
          {
            'id': 'cert',
            'card_print_id': 'same-parent',
            'grader': 'PSA',
            'grade': '10',
          },
        ],
        'card_prints': [
          {
            'id': 'same-parent',
            'name': 'Fixture',
            'number': '1',
            'set': {'name': 'Fixture Set'},
          },
        ],
        'card_printings': [
          {
            'id': 'reverse',
            'card_print_id': 'same-parent',
            'finish_keys': {'label': 'Reverse Holo', 'is_active': true},
          },
        ],
      });
      await f.signIn();
      final rows = await const ObjectInventoryService().load(f.client);
      expect(rows.map((r) => r['gv_vi_id']).toSet(), {'GVVI-raw', 'GVVI-slab'});
      expect(rows.every((r) => r['card_id'] == 'same-parent'), isTrue);
      expect(rows.every((r) => r['market_price'] == null), isTrue);
      expect(
        rows.firstWhere((r) => r['gv_vi_id'] == 'GVVI-slab')['condition_label'],
        'PSA 10',
      );
      final read = f.requests.firstWhere(
        (r) => r.url.path.endsWith('/vault_item_instances'),
      );
      expect(read.url.queryParameters['user_id'], 'eq.owner');
      expect(read.url.queryParameters['archived_at'], 'is.null');
      expect(
        f.requests.every(
          (r) =>
              r.method == 'GET' ||
              r.url.path.endsWith('/get_market_pricing_read_model_v1'),
        ),
        isTrue,
      );
      expect(
        f.requests.any((r) => r.url.path.contains('wall_section')),
        isFalse,
      );
      await f.client.dispose();
    },
  );
  test(
    'Objects retains separate raw/slab copy identities and exact price evidence',
    () async {
      final f = OwnerCopyFixture();
      await f.signIn();
      final rows = await ObjectInventoryService(
        inventory: FixtureInventory(),
      ).load(f.client);
      expect(rows.map((r) => r['gv_vi_id']), [
        'GVVI-one',
        'GVVI-two',
        'GVVI-slab',
      ]);
      expect(rows.map((r) => r['card_id']).toSet(), {'same-parent'});
      expect(rows[0]['finish_label'], 'Holo');
      expect(rows[1]['finish_label'], 'Reverse Holo');
      expect(rows[0]['market_price'], 2);
      expect(rows[1]['market_price'], 3);
      expect(rows[2]['market_price'], isNull);
      expect(rows[2]['condition_label'], 'PSA 10');
      expect(rows.every((r) => r['owned_count'] == 1), isTrue);
      expect(f.requests, isEmpty);
      await f.client.dispose();
    },
  );
  test(
    'Objects guest does not read inventory and read failure stays visible',
    () async {
      final f = OwnerCopyFixture();
      final inventory = FixtureInventory();
      final service = ObjectInventoryService(inventory: inventory);
      expect(await service.load(f.client), isEmpty);
      expect(inventory.loads, 0);
      await f.signIn();
      inventory.fail = true;
      await expectLater(service.load(f.client), throwsStateError);
      await f.client.dispose();
    },
  );
  testWidgets(
    'two copies of one parent can be selected separately and reach the lot builder',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 4500);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final f = OwnerCopyFixture();
      await tester.runAsync(f.signIn);
      await tester.pumpWidget(
        MaterialApp(
          home: GrookaiObjectsHubScreen(
            client: f.client,
            inventoryService: ObjectInventoryService(
              inventory: FixtureInventory(),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lot'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('GVVI-one'));
      await tester.pumpAndSettle();
      expect(find.text('1/12 selected'), findsOneWidget);
      await tester.tap(find.text('GVVI-two'));
      await tester.pumpAndSettle();
      expect(find.text('2/12 selected'), findsOneWidget);
      await tester.tap(find.text('Price Lot'));
      await tester.pumpAndSettle();
      final screen = tester.widget<LotPricingScreen>(
        find.byType(LotPricingScreen),
      );
      expect(screen.source.items.map((i) => i.gvviId), [
        'GVVI-one',
        'GVVI-two',
      ]);
      expect(screen.source.items.map((i) => i.marketPrice), [2, 3]);
      expect(screen.metadata['gvvi_ids'], ['GVVI-one', 'GVVI-two']);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.runAsync(f.client.dispose);
    },
  );
}
