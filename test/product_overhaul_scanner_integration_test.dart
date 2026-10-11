import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sales/sales_desk_screen.dart';
import 'package:grookai_vault/screens/workspace/vendor_workspace_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'sales_desk_screen_test.dart' show FakeSalesService;

class DelayedWorkspaceScan extends FakeSalesService {
  final result = Completer<VendorPricingWorkspaceRow?>();
  @override
  Future<VendorPricingWorkspaceRow?> loadScannedCopy(String id) =>
      result.future;
  @override
  Future<List<VendorPricingWorkspaceRow>> loadInventory() async =>
      (await load()).rows;
}

void main() {
  testWidgets('phone workspace and scanner remain usable at double text size', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: child!,
        ),
        home: VendorWorkspaceScreen(
          accountChanges: const Stream.empty(),
          onScan: () async {},
          pageBuilder: (_, destination, select) =>
              destination == VendorDestination.desk
              ? SalesDeskScreen(service: FakeSalesService())
              : const SizedBox(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(find.text('Scan cards'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Scan cards'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(TextField, 'Scanner input'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'leaving and revisiting retained Desk cancels its earlier scanner result',
    (tester) async {
      tester.view.physicalSize = const Size(1194, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final service = DelayedWorkspaceScan();
      await tester.pumpWidget(
        MaterialApp(
          home: VendorWorkspaceScreen(
            accountChanges: const Stream.empty(),
            onScan: () async {},
            pageBuilder: (_, destination, select) =>
                destination == VendorDestination.desk
                ? SalesDeskScreen(service: service)
                : const SizedBox(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Scan cards'));
      await tester.pump();
      await tester.enterText(
        find.widgetWithText(TextField, 'Scanner input'),
        'GVVI-FIXTURE-000001',
      );
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();
      Future<void> tab(String name) async {
        await tester.tap(
          find.descendant(
            of: find.byType(NavigationRail),
            matching: find.text(name),
          ),
        );
        await tester.pump();
      }

      await tab('Inventory');
      await tab('Desk');
      expect(find.text('Scan cards'), findsOneWidget);
      await tester.tap(find.text('Scan cards'));
      await tester.pump();
      service.result.complete((await service.load()).rows.single);
      await tester.pumpAndSettle();
      expect(find.textContaining('Pikachu added'), findsNothing);
      expect(find.text('Checkout: 1 × USD 12.34'), findsNothing);
      expect(service.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
}
