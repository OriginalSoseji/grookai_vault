import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/intake/intake_screens.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/services/intake/intake_controller.dart';
import 'package:grookai_vault/services/intake/intake_draft_store.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_v5_identity_service.dart';
import 'intake_recovery_test.dart' show Service, Scanner;

void main() {
  testWidgets(
    'full lot allocation requires an explicit all-remaining-cost acknowledgement',
    (tester) async {
      tester.view.physicalSize = const Size(1100, 1800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final directory = Directory.systemTemp.createTempSync('intake-widget-');
      final service = (await tester.runAsync(() => Future.value(Service())))!;
      final batch = IntakeBatch(
        title: 'Test',
        userId: 'owner',
        items: [
          IntakeItem(
            captureId: 'manual',
            imagePath: '',
            state: 'confirmed',
            selected: ScannerV5Candidate.fromJson({
              'card_id': '00000000-0000-4000-8000-000000000001',
              'name': 'Test card',
            }),
            referenceValueCents: 1000,
          ),
        ],
      );
      final controller = IntakeController(
        batch: batch,
        store: IntakeDraftStore(directory),
        service: service,
        scanner: Scanner(),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: IntakeCostReviewScreen(
            controller: controller,
            lot: PurchaseLot(name: 'Today', totalCostCents: 10000),
          ),
        ),
      );
      expect(tester.takeException(), isNull);
      FilledButton save() => tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Save confirmed copies to Vault'),
      );
      expect(save().onPressed, isNull);
      await tester.ensureVisible(
        find.text('I reviewed identities, quantities and intake costs'),
      );
      await tester.tap(
        find.text('I reviewed identities, quantities and intake costs'),
      );
      await tester.pump();
      expect(save().onPressed, isNull);
      await tester.ensureVisible(
        find.text('These cards should receive all remaining lot cost'),
      );
      await tester.tap(
        find.text('These cards should receive all remaining lot cost'),
      );
      await tester.pump();
      expect(save().onPressed, isNotNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
      await tester.runAsync(() => service.client.dispose());
      directory.deleteSync(recursive: true);
    },
  );
  testWidgets(
    'unpriced cards block a known-lot allocation until reserve is entered',
    (tester) async {
      tester.view.physicalSize = const Size(1100, 1800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final directory = Directory.systemTemp.createTempSync('intake-widget-');
      final service = (await tester.runAsync(() => Future.value(Service())))!;
      final controller = IntakeController(
        batch: IntakeBatch(
          title: 'Test',
          userId: 'owner',
          items: [
            IntakeItem(
              captureId: 'manual',
              imagePath: '',
              state: 'confirmed',
              selected: ScannerV5Candidate.fromJson({
                'card_id': '00000000-0000-4000-8000-000000000001',
                'name': 'Unknown value',
              }),
            ),
          ],
        ),
        store: IntakeDraftStore(directory),
        service: service,
        scanner: Scanner(),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: IntakeCostReviewScreen(
            controller: controller,
            lot: PurchaseLot(name: 'Today', totalCostCents: 10000),
          ),
        ),
      );
      expect(
        find.text(
          'Enter a cost for unpriced cards or retain a reserve for their unknown costs.',
        ),
        findsOneWidget,
      );
      await tester.enterText(find.byType(TextField), '100.00');
      await tester.pump();
      expect(
        find.text(
          'Enter a cost for unpriced cards or retain a reserve for their unknown costs.',
        ),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      controller.dispose();
      await tester.runAsync(() => service.client.dispose());
      directory.deleteSync(recursive: true);
    },
  );
}
