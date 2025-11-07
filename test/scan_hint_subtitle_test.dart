import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/scanner/widgets/scan_hint_subtitle.dart';
import 'package:grookai_vault/ui/app/theme.dart';

void main() {
  testWidgets('ScanHintSubtitle formats text', (tester) async {
    await tester.pumpWidget(GVTheme.adaptive(
      child: const MaterialApp(
        home: Scaffold(
          body: ScanHintSubtitle(setCode: 'ABC', collectorNumber: '007', language: 'EN'),
        ),
      ),
    ));
    expect(find.text('ABC #007 · EN'), findsOneWidget);
  });
}
