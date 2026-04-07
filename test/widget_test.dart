import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:grookai_vault/main.dart';

void main() {
  testWidgets(
    'Grookai app frame renders a stable home without Supabase bootstrap',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const GrookaiAppFrame(
          home: Scaffold(body: Center(child: Text('Smoke shell ready'))),
        ),
      );

      expect(find.byType(MaterialApp), findsOneWidget);
      expect(find.text('Smoke shell ready'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
