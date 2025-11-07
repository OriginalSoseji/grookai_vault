import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/scan/scan_page.dart';

void main() {
  testWidgets('ScanPage shows CTA', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: ScanPage())));
    expect(find.textContaining('Scan & Add to Vault'), findsOneWidget);
  });
}

