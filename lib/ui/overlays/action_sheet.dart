import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/core/platform.dart';

class ActionSheetItem {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  ActionSheetItem({required this.icon, required this.label, required this.onTap});
}

Future<void> showActionSheet(BuildContext context, {required String title, required List<ActionSheetItem> items}) async {
  if (isIOS) {
    await showCupertinoModalPopup(
      context: context,
      builder: (_) => CupertinoActionSheet(
        title: Text(title),
        actions: [
          for (final it in items)
            CupertinoActionSheetAction(onPressed: () { Navigator.of(context).pop(); it.onTap(); }, child: Row(children: [Icon(it.icon), const SizedBox(width: 8), Text(it.label)])),
        ],
        cancelButton: CupertinoActionSheetAction(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
      ),
    );
  } else {
    await showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          for (final it in items)
            ListTile(leading: Icon(it.icon), title: Text(it.label), onTap: () { Navigator.of(context).pop(); it.onTap(); }),
        ]),
      ),
    );
  }
}

