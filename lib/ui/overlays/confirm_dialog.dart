import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/core/platform.dart';

Future<bool> showConfirm(BuildContext context, {String? title, String? message, String confirmLabel = 'Confirm', String cancelLabel = 'Cancel'}) async {
  if (isIOS) {
    final res = await showCupertinoDialog<bool>(
      context: context,
      builder: (_) => CupertinoAlertDialog(
        title: title != null ? Text(title) : null,
        content: message != null ? Text(message) : null,
        actions: [
          CupertinoDialogAction(onPressed: () => Navigator.of(context).pop(false), child: Text(cancelLabel)),
          CupertinoDialogAction(onPressed: () => Navigator.of(context).pop(true), child: Text(confirmLabel)),
        ],
      ),
    );
    return res == true;
  }
  final res = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      title: title != null ? Text(title) : null,
      content: message != null ? Text(message) : null,
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(false), child: Text(cancelLabel)),
        ElevatedButton(onPressed: () => Navigator.of(context).pop(true), child: Text(confirmLabel)),
      ],
    ),
  );
  return res == true;
}

