import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin.dart';
import 'package:grookai_vault/widgets/grookai_objects/grookai_object_skin_picker.dart';

void main() {
  testWidgets('skin picker exposes all skins and reports changes', (
    tester,
  ) async {
    var selected = GrookaiObjectSkin.onyx;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: GrookaiObjectSkinPicker(
            selected: selected,
            onChanged: (value) => selected = value,
          ),
        ),
      ),
    );

    expect(find.text('Onyx'), findsOneWidget);
    expect(find.text('Ivory'), findsOneWidget);
    expect(find.text('Kraft'), findsOneWidget);

    await tester.tap(find.text('Kraft'));
    await tester.pumpAndSettle();

    expect(selected, GrookaiObjectSkin.kraft);
  });
}
