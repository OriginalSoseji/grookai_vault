import 'package:flutter/material.dart';
import 'package:grookai_vault/features/scanner/scanner_page.dart';

class ScanEntry extends StatelessWidget {
  const ScanEntry({super.key});

  @override
  Widget build(BuildContext context) {
    // Minimal telemetry
    // ignore: avoid_print
    print('telemetry: scan_tap');
    return const ScannerPage();
  }
}

