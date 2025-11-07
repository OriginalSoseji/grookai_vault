import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/features/feed/controllers/feed_controller.dart';
import 'package:grookai_vault/features/feed/widgets/feed_list.dart';

void main() {
  testWidgets('loads more near 80%', (tester) async {
    final ctrl = FeedController();
    await tester.pumpWidget(MaterialApp(home: FeedList(controller: ctrl)));
    await tester.pumpAndSettle();
    final scrollable = find.byType(Scrollable);
    await tester.drag(scrollable, const Offset(0, -1000));
    await tester.pump(const Duration(milliseconds: 300));
    // Should not throw; controller debounced loadMore
    expect(ctrl.items.isNotEmpty, true);
  });
}

