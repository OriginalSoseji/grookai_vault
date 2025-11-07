import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'widgets/scanner_overlay.dart';
import 'widgets/scan_hint_subtitle.dart';

/// Dev-only advanced scanner scaffold. Uses extracted widgets but avoids
/// managing the live camera to keep maintenance light.
class ScannerAdvancedPage extends StatelessWidget {
  const ScannerAdvancedPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Advanced Scanner (Dev)')),
      body: ScannerOverlay(
        hint: 'Framing and hints are provided by reusable widgets.',
        child: ListView(
          padding: const EdgeInsets.all(GVSpacing.s16),
          children: const [
            Text('This page is for development only and mirrors the legacy UI.'),
            SizedBox(height: GVSpacing.s12),
            ScanHintSubtitle(setCode: 'ABC', collectorNumber: '123', language: 'EN'),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => HapticFeedback.selectionClick(),
        child: const Icon(Icons.camera_alt),
      ),
    );
  }
}

