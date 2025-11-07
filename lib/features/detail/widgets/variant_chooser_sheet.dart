import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/overlays/adaptive_sheet.dart';

Future<void> showVariantChooserSheet(BuildContext context, {required List<String> variants, required void Function(String) onChoose}) async {
  await showAdaptiveSheet(
    context,
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 8),
        const Text('Choose Variant', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        for (final v in variants)
          ListTile(
            title: Text(v),
            onTap: () {
              onChoose(v);
              Navigator.of(context).pop();
            },
          ),
        const SizedBox(height: 12),
      ],
    ),
  );
}

