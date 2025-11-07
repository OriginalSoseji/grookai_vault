import 'package:flutter/material.dart';
import 'package:grookai_vault/config/flags.dart';

class ScanEntry extends StatelessWidget {
  const ScanEntry({super.key});

  @override
  Widget build(BuildContext context) {
    // Minimal telemetry
    // ignore: avoid_print
    print('telemetry: scan_tap');
    if (!gvFeatureScanner) {
      return const Scaffold(
        body: Center(child: Text('Scanner is disabled in this build')),
      );
    }
    // In scanner-enabled builds, this entry can be replaced to route to the real page.
    return const Scaffold(
      body: Center(child: Text('Scanner entry point (enable full page)')),
    );
  }
}
