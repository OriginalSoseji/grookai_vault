import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/gvvi/vendor_pricing_rules_screen.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_rules_service.dart';

void main() {
  const definition = {
    'markupBps': 1250,
    'flatMinor': 10,
    'rounding': 'up',
    'stepMinor': 25,
    'minMinor': 200,
    'maxMinor': 5000,
  };
  final workspace = {
    'enabled': true,
    'settings': {
      'default_rule_id': 'rule-1',
      'auto_for_new': true,
      'revision': 7,
    },
    'rules': [
      {
        'id': 'rule-1',
        'name': 'Show prices',
        'revision': 4,
        'definition': definition,
      },
    ],
  };
  Future<void> render(
    WidgetTester tester,
    PricingRulesCall call, {
    double width = 375,
    double scale = 1,
  }) async {
    tester.view.physicalSize = Size(width, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(scale)),
          child: child!,
        ),
        home: VendorPricingRulesScreen(
          service: VendorPricingRulesService(call: call),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  Future<void> tap(WidgetTester tester, String label) async {
    final finder = find.text(label);
    if (finder.evaluate().isEmpty) {
      await tester.scrollUntilVisible(
        finder,
        label == 'Cancel edit' ? -200 : 200,
        scrollable: find.byType(Scrollable).first,
      );
    }
    await tester.ensureVisible(finder);
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  testWidgets(
    'default preview uses saved server definition without opening or writing a preset',
    (tester) async {
      final actions = <String>[];
      await render(tester, (action, data) async {
        actions.add(action);
        if (action == 'workspace') return workspace;
        expect(action, 'calculate');
        expect(data['definition'], definition);
        expect(data['marketAmount'], '10.00');
        return {'amountMinor': 1150};
      });
      expect(find.text('Preset name'), findsNothing);
      await tap(tester, 'Preview default');
      expect(find.textContaining(r'$11.50'), findsOneWidget);
      expect(actions, ['workspace', 'calculate']);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'editing retains hidden limits and revision; cancel never writes',
    (tester) async {
      var writes = 0;
      await render(tester, (action, data) async {
        if (action == 'workspace') return workspace;
        expect(action, 'save_rule');
        expect(data['ruleId'], 'rule-1');
        expect(data['expectedRevision'], 4);
        expect(data['definition'], definition);
        writes++;
        return workspace;
      });
      await tap(tester, 'Edit');
      expect(find.text('USD adjustment'), findsOneWidget);
      await tap(tester, 'Hide more options');
      expect(find.text('USD adjustment'), findsNothing);
      await tap(tester, 'Save preset');
      expect(writes, 1);
      expect(find.text('Preset name'), findsNothing);
      await tap(tester, 'New preset');
      await tap(tester, 'Cancel edit');
      expect(writes, 1);
      expect(find.text('Preset name'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'compact editor supports narrow screens and large text without overflow',
    (tester) async {
      await render(
        tester,
        (action, data) async {
          expect(action, 'workspace');
          return workspace;
        },
        width: 320,
        scale: 2,
      );
      expect(tester.takeException(), isNull);
      await tap(tester, 'New preset');
      expect(tester.takeException(), isNull);
      await tap(tester, 'More options · adjustments and limits');
      expect(tester.takeException(), isNull);
      await tap(tester, 'Cancel edit');
      expect(tester.takeException(), isNull);
    },
  );
}
