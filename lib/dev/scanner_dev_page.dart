import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/scanner/scanner_pipeline.dart';
import 'package:grookai_vault/data/scans/scan_repository.dart';
import 'package:grookai_vault/features/scan/review_match_sheet.dart';
import 'package:grookai_vault/features/scan/models/scan_candidate.dart';
import 'package:grookai_vault/services/scan_resolver.dart';
import 'package:grookai_vault/services/vault_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ScannerDevPage extends StatefulWidget {
  const ScannerDevPage({super.key});
  @override
  State<ScannerDevPage> createState() => _ScannerDevPageState();
}

class _ScannerDevPageState extends State<ScannerDevPage> {
  final _picker = ImagePicker();
  final _pipeline = ScannerPipeline();
  ScannerOutput? _out;
  String? _err;
  bool _busy = false;
  ui.Image? _img;

  @override
  void initState() {
    super.initState();
    // ignore: discarded_futures
    _pipeline.init();
  }

  Future<void> _pick(ImageSource src) async {
    setState(() {
      _busy = true;
      _err = null;
      _out = null;
    });
    try {
      final x = await _picker.pickImage(source: src, maxWidth: 2048, imageQuality: 92);
      if (x == null) {
        setState(() => _busy = false);
        return;
      }
      final bytes = await x.readAsBytes();
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      _img = frame.image;
      final out = await _pipeline.analyze(fullImage: _img!);
      setState(() {
        _out = out;
      });

      // Resolve candidates from server based on image and hints
      final resolver = ScanResolver(Supabase.instance.client);
      final numHint = out.cardNo?.toString() ?? '';
      final candidatesResolved = await resolver.resolve(
        name: '',
        collectorNumber: numHint,
        imageJpegBytes: bytes,
      );
      final candidates = candidatesResolved
          .map((c) => ScanCandidate(
                cardId: c.cardPrintId,
                name: c.name,
                setCode: c.setCode,
                number: c.collectorNumber,
                confidence: c.confidence,
                imageUrl: c.imageUrl,
              ))
          .toList();

      if (mounted) {
        await showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          builder: (_) => ReviewMatchSheet(
            candidates: candidates,
            onReject: () {
              Navigator.of(context).pop();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Scan discarded')),
              );
            },
            onConfirm: (chosen) async {
              try {
                // Log scan event
                final repo = ScanRepository();
                await repo.saveScanResult(out, confirmToken: repo.confirmationToken);
                // Add to vault (optimistic add could be layered, but do real persist here)
                final vs = VaultService(Supabase.instance.client);
                await vs.addOrIncrement(cardId: chosen.cardId, deltaQty: 1, conditionLabel: 'NM');
                if (context.mounted) {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Added ${chosen.name} to vault')),
                  );
                }
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Save failed: $e')),
                  );
                }
              }
            },
          ),
        );
      }
    } catch (e) {
      setState(() {
        _err = e.toString();
      });
    } finally {
      setState(() {
        _busy = false;
      });
    }
  }

  Widget _kv(String k, String? v) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(k, style: const TextStyle(fontWeight: FontWeight.w600)),
      Flexible(child: Text(v ?? '-', textAlign: TextAlign.right)),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scanner (Dev)')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            Row(children: [
              ElevatedButton(onPressed: _busy ? null : () => _pick(ImageSource.camera), child: const Text('Camera')),
              const SizedBox(width: 12),
              OutlinedButton(onPressed: _busy ? null : () => _pick(ImageSource.gallery), child: const Text('Gallery')),
            ]),
            const SizedBox(height: 12),
            if (_busy) const LinearProgressIndicator(),
            if (_err != null) Text(_err!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            if (_out != null) ...[
              const Text('ID', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              _kv('Card No / Set Size', _out!.cardNo != null && _out!.setSize != null ? '${_out!.cardNo}/${_out!.setSize}' : '-'),
              _kv('Year', _out!.year?.toString()),
              _kv('Set ID (stub)', _out!.setId),
              const SizedBox(height: 12),
              const Text('Variant', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              _kv('Tag', _out!.variant.variantTag),
              _kv('Overlay', _out!.variant.hasOverlay ? 'Yes' : 'No'),
              _kv('Stamp Confidence', _out!.variant.stampConfidence?.toStringAsFixed(2)),
              const SizedBox(height: 12),
              // Condition metrics removed in this stubbed scanner; kept variant only.
            ],
          ],
        ),
      ),
    );
  }
}
