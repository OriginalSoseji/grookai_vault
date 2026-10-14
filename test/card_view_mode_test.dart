import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/widgets/card_view_mode.dart';

void main() {
  test('large text resolves grid view to a readable comfortable list', () {
    expect(
      resolveCardViewModeForTextScale(AppCardViewMode.grid, 1.5),
      AppCardViewMode.comfortableList,
    );
    expect(
      resolveCardViewModeForTextScale(AppCardViewMode.grid, 2.0),
      AppCardViewMode.comfortableList,
    );
  });

  test('ordinary text and explicit list choices preserve their view mode', () {
    expect(
      resolveCardViewModeForTextScale(AppCardViewMode.grid, 1.3),
      AppCardViewMode.grid,
    );
    expect(
      resolveCardViewModeForTextScale(AppCardViewMode.compactList, 2.0),
      AppCardViewMode.compactList,
    );
  });

  testWidgets('icon-only view control fits when large text is enabled', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(320, 120));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2)),
          child: Scaffold(
            body: Align(
              alignment: Alignment.centerRight,
              child: SharedCardViewModeButton(
                value: AppCardViewMode.comfortableList,
                iconOnly: true,
                onChanged: (_) {},
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.byTooltip('Card view'), findsOneWidget);
    expect(find.text('Comfortable'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
