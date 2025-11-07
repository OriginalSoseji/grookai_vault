import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/scanner/widgets/scan_result_sheet.dart';

void main() {
  testWidgets('ScanResultSheet renders card info', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Builder(builder: (context) {
        return Scaffold(
          body: Center(
            child: TextButton(
              onPressed: () async {
                await ScanResultSheet.show(
                  context,
                  name: 'Test Card',
                  setCode: 'SET',
                  number: '123',
                  imageUrl: '',
                  conditionLabel: 'NM',
                  priceDisplay: '\$1.23',
                  onAdd: () {},
                  onScanAgain: () {},
                );
              },
              child: const Text('Open'),
            ),
          ),
        );
      }),
    ));

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(find.text('Test Card'), findsOneWidget);
    expect(find.textContaining('SET #123'), findsOneWidget);
    expect(find.textContaining('Condition: NM'), findsOneWidget);
  });
}
