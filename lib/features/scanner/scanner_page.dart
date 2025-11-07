import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:grookai_vault/services/scanner/scanner_pipeline.dart';
import 'package:grookai_vault/features/scanner/scan_confirm_sheet.dart';

class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  final _picker = ImagePicker();
  final _pipeline = ScannerPipeline();
  bool _busy = false;

  Future<void> _pick(ImageSource src) async {
    setState(() => _busy = true);
    try {
      final x = await _picker.pickImage(source: src, maxWidth: 2048, imageQuality: 92);
      if (x == null) {
        setState(() => _busy = false);
        return;
      }
      final bytes = await x.readAsBytes();
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      final img = frame.image;
      final out = await _pipeline.analyze(fullImage: img);

      if (!mounted) return;
      await showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) => ScanConfirmSheet(
          cardId: null, // optional hookup if you add resolver
          name: 'Scanned Card',
          setCode: out.setId,
          number: out.cardNo?.toString(),
          imageUrl: null,
          onAddToVault: (condition) async {
            try {
              // If you have a resolved id, pass it here
              // For now, simply log
              // await vs.addToVault(cardId: cardId, condition: condition == 'SKIP' ? 'NM' : condition, qty: 1);
            } catch (e) {
              debugPrint('[SCAN] addToVault failed: $e');
            }
          },
          onCreateListing: (condition) async {
            try {
              // Navigate to your listing screen if available
              Navigator.of(context).pushNamed('/create-listing', arguments: {
                // 'cardId': cardId,
                'condition': condition,
              });
            } catch (e) {
              debugPrint('[SCAN] createListing failed: $e');
            }
          },
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Scan failed: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scanner')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Row(children: [
            ElevatedButton(onPressed: _busy ? null : () => _pick(ImageSource.camera), child: const Text('Camera')),
            const SizedBox(width: 12),
            OutlinedButton(onPressed: _busy ? null : () => _pick(ImageSource.gallery), child: const Text('Gallery')),
          ]),
          const SizedBox(height: 12),
          if (_busy) const LinearProgressIndicator(),
          const Expanded(child: Center(child: Text('Pick an image to scan.'))),
        ]),
      ),
    );
  }
}
