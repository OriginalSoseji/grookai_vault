import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/vault/copy_cost_review_screen.dart';
import 'package:grookai_vault/services/vault/copy_cost_review_service.dart';
import 'package:grookai_vault/theme/gv_tokens.dart';
import 'copy_cost_review_screen_test.dart' show copy;
import 'support/copy_cost_review_fakes.dart';

void main() {
  testWidgets(
    'synthetic cost review phone visual',
    (tester) async {
      await (FontLoader(
        'MaterialIcons',
      )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
      await (FontLoader('ReviewVisual')..addFont(
            Future.value(
              ByteData.sublistView(
                File('C:/Windows/Fonts/segoeui.ttf').readAsBytesSync(),
              ),
            ),
          ))
          .load();
      tester.view.physicalSize = const Size(400, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final gateway = ReviewGateway()
        ..rows.addAll([
          reviewRow(0),
          reviewRow(1, cost: reviewCost('missing_currency', amount: '12.00')),
          reviewRow(
            2,
            cost: reviewCost('known', amount: '0', currency: 'USD', minor: '0'),
          ),
          reviewRow(
            3,
            cost: reviewCost(
              'known',
              amount: '8',
              currency: 'CAD',
              minor: '800',
            ),
          ),
        ]);
      final service = CopyCostReviewService(gateway);
      addTearDown(() async {
        service.dispose();
        await gateway.changes.close();
      });
      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            colorScheme: GvPalette.scheme(Brightness.light),
            fontFamily: 'ReviewVisual',
          ),
          home: CopyCostReviewScreen(
            service: service,
            copies: List.generate(4, copy),
            onEdit: (_) async {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile(
          Uri.file(
            'C:/grookai_vault_operator_artifacts/product_cost_review_20261007/cost-review-phone.png',
            windows: true,
          ),
        ),
      );
      await tester.tap(find.byKey(const Key('cost_review_filter_known')));
      await tester.pumpAndSettle();
      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile(
          Uri.file(
            'C:/grookai_vault_operator_artifacts/product_cost_review_20261007/cost-review-recorded.png',
            windows: true,
          ),
        ),
      );
      expect(tester.takeException(), isNull);
    },
    skip: !const bool.fromEnvironment('COST_REVIEW_VISUALS'),
  );
}
