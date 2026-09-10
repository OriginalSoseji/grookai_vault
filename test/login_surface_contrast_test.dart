import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/main.dart';

void main() {
  for (final brightness in Brightness.values) {
    testWidgets('email form remains legible in $brightness', (tester) async {
      await tester.pumpWidget(MaterialApp(
        theme: ThemeData(brightness: brightness),
        home: const LoginPage(),
      ));
      await tester.tap(find.widgetWithText(OutlinedButton, 'Sign in with email'));
      await tester.pumpAndSettle();
      final fields = find.byType(TextField);
      expect(fields, findsNWidgets(2));
      for (final element in fields.evaluate()) {
        final theme = Theme.of(element);
        expect(theme.brightness, Brightness.dark);
        expect(theme.colorScheme.onSurface.computeLuminance(), greaterThan(0.5));
        final field = element.widget as TextField;
        expect(field.decoration!.fillColor!.computeLuminance(), lessThan(0.1));
      }
      expect(tester.takeException(), isNull);
    });
  }
}
