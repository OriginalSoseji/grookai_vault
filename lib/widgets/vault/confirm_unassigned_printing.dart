import 'package:flutter/material.dart';

Future<bool> confirmUnassignedVaultPrinting(BuildContext context) async {
  return await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Add with printing unassigned?'),
          content: const Text(
            'This card is cataloged, but its finishes are not verified yet. '
            'Your copy will be saved as Printing unassigned, without an exact '
            'finish or market value.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Add unassigned copy'),
            ),
          ],
        ),
      ) ??
      false;
}
