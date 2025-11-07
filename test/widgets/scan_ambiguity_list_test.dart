import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/scan/review_match_sheet.dart';
import 'package:grookai_vault/features/scan/models/scan_candidate.dart';

void main() {
  testWidgets('shows other matches when <0.92', (tester) async {
    final list = [
      const ScanCandidate(cardId: '1', name: 'A', setCode: 'X', number: '1', confidence: 0.90),
      const ScanCandidate(cardId: '2', name: 'B', setCode: 'Y', number: '2', confidence: 0.80),
    ];
    await tester.pumpWidget(MaterialApp(home: ReviewMatchSheet(candidates: list, onConfirm: (_) {}, onReject: () {})));
    expect(find.text('Other matches'), findsOneWidget);
  });
}

