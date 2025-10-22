import 'package:flutter/material.dart';
import 'package:grookai_vault/features/lookup/card_lookup.dart';

class DebugImportButton extends StatefulWidget {
  const DebugImportButton({super.key});
  @override
  State<DebugImportButton> createState() => _DebugImportButtonState();
}

class _DebugImportButtonState extends State<DebugImportButton> {
  final controller = CardLookupController();
  String msg = '';

  Future<void> _run() async {
    setState(() => msg = 'Running...');
    await controller.find('sv4', '12');
    if (controller.card != null) {
      setState(() => msg = '✅ Card retrieved: ${controller.card!['name'] ?? 'ok'}');
    } else {
      setState(() => msg = '⚠️ ${controller.error ?? 'No data'}');
    }
  }

  @override
  Widget build(BuildContext context) => ElevatedButton(
        onPressed: _run,
        child: Text(msg.isEmpty ? 'Test Import-Card' : msg),
      );
}

