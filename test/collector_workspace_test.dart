import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/screens/vault/collector_workspace_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';

class _Service extends VendorPricingWorkspaceService {
  bool sold = false;
  @override
  Future<VendorPricingWorkspaceData> load() async =>
      const VendorPricingWorkspaceData(
        rows: [
          VendorPricingWorkspaceRow(
            instanceId: 'instance',
            gvviId: 'GVVI-EXACT-000001',
            vaultItemId: 'bucket',
            cardPrintId: 'parent',
            gvId: 'GV-PK-SVP-173',
            name: 'Eevee',
            displayName: 'Eevee',
            number: '173',
            printingLabel: 'Holofoil',
            conditionLabel: 'LP',
            intent: 'hold',
            isGraded: false,
            marketPrice: 8.37,
            askingPrice: null,
            currency: 'USD',
            sectionIds: {},
          ),
        ],
        sections: [],
      );
  @override
  Future<void> disposeCopy({
    required VendorPricingWorkspaceRow row,
    required VendorDispositionSubmission submission,
  }) async {
    sold = true;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Supabase.initialize(
      url: 'http://127.0.0.1:54321',
      publishableKey: 'fixture',
      authOptions: const FlutterAuthClientOptions(
        detectSessionInUri: false,
        autoRefreshToken: false,
      ),
    );
  });
  tearDownAll(() => Supabase.instance.dispose());

  testWidgets(
    'explicit selection reviews exact GVVIs and records a sale from immutable loaded rows',
    (tester) async {
      tester.view.physicalSize = const Size(384, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final service = _Service();
      await tester.pumpWidget(
        MaterialApp(home: CollectorWorkspaceScreen(service: service)),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('0 selected'), findsOneWidget);
      await tester.tap(find.byType(CheckboxListTile));
      await tester.pump();
      expect(find.textContaining('1 selected · 1 priced'), findsOneWidget);
      await tester.tap(find.text('Review bulk intent'));
      await tester.pumpAndSettle();
      expect(find.textContaining('GVVI-EXACT-000001'), findsWidgets);
      await tester.tap(find.text('Keep editing'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sold / Traded'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const Key('vendor_disposition_sale_price')),
        '10.07',
      );
      await tester.tap(find.text('Record sold'));
      await tester.pumpAndSettle();
      expect(service.sold, true);
      expect(find.textContaining('0 selected'), findsOneWidget);
      expect(
        find.text('Outcome recorded for GVVI-EXACT-000001.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
