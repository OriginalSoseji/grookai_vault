import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/search/search_screen.dart';

void main() {
  testWidgets('debounces typing and Enter bypasses', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: SearchScreen()));
    await tester.enterText(find.byType(TextField), 'Pik');
    await tester.pump(const Duration(milliseconds: 100));
    await tester.enterText(find.byType(TextField), 'Pikachu');
    await tester.pump(const Duration(milliseconds: 260));
    expect(find.textContaining('Query tokens'), findsOneWidget);
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    expect(find.textContaining('Query tokens'), findsOneWidget);
  });
}

