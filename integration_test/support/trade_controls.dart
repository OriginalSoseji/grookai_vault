import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Reveal lazily built controls in either direction before interacting.
/// This uses scroll gestures and is not a user-speed measurement.
Future<void> revealTradeControl(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    final scroll = find
        .byWidgetPredicate(
          (widget) =>
              widget is Scrollable &&
              widget.axisDirection == AxisDirection.down,
        )
        .last;
    for (var i = 0; i < 35 && finder.evaluate().isEmpty; i++) {
      final before = tester.state<ScrollableState>(scroll).position.pixels;
      await tester.drag(scroll, const Offset(0, 500));
      await tester.pumpAndSettle();
      if (tester.state<ScrollableState>(scroll).position.pixels == before) {
        break;
      }
    }
    if (finder.evaluate().isEmpty) {
      await tester.scrollUntilVisible(
        finder,
        220,
        scrollable: scroll,
        maxScrolls: 35,
      );
    }
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}
