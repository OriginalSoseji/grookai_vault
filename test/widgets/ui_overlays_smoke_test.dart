import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/ui/overlays/action_sheet.dart';
import 'package:grookai_vault/ui/overlays/confirm_dialog.dart';
import 'package:grookai_vault/ui/overlays/toast_banner.dart';

void main() {
  testWidgets('open/close overlays', (tester) async {
    await tester.pumpWidget(MaterialApp(home: Builder(builder: (context) {
      return Scaffold(
        body: Column(children: [
          TextButton(onPressed: () => showActionSheet(context, title: 'Title', items: [ActionSheetItem(icon: Icons.add, label: 'Add', onTap: () {})]), child: const Text('Action')),
          TextButton(onPressed: () => showConfirm(context, title: 'T', message: 'M'), child: const Text('Confirm')),
          TextButton(onPressed: () => showToastSuccess(context, 'OK'), child: const Text('Toast')),
        ]),
      );
    })));
    await tester.tap(find.text('Action'));
    await tester.pumpAndSettle();
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm'));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.tap(find.text('Confirm'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Toast'));
    await tester.pump(const Duration(milliseconds: 200));
  });
}

