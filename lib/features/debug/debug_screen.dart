import 'package:flutter/material.dart';
import 'package:grookai_vault/features/debug/debug_import_button.dart';

class DebugScreen extends StatelessWidget {
  const DebugScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Debug Tools')),
      body: const Center(child: DebugImportButton()),
    );
  }
}
