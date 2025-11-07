import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/overlays/adaptive_sheet.dart';

Future<void> showSearchFilterSheet(BuildContext context) async {
  await showAdaptiveSheet(
    context,
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('Filters', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 12),
          Text('TODO: Set, Rarity, Price range, Language'),
          SizedBox(height: 16),
        ],
      ),
    ),
  );
}

