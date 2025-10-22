import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../ui/widgets/scan_frame.dart';
import '../../widgets/fix_card_image.dart';
import '../../ui/tokens/spacing.dart';
import '../../services/vault_service.dart';
import 'scan_controller.dart';

class ScannerPage extends StatefulWidget {
  const ScannerPage({super.key});
  @override
  State<ScannerPage> createState() => _ScannerPageState();
}

class _ScannerPageState extends State<ScannerPage> {
  final supabase = Supabase.instance.client;
  CameraController? _cam;
  Future<void>? _init;
  late final ScanController _scan;

  @override
  void initState() {
    super.initState();
    _scan = ScanController(supabase)..addListener(() { if (mounted) setState(() {}); });
    _init = _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cams = await availableCameras();
      final back = cams.firstWhere((c) => c.lensDirection == CameraLensDirection.back, orElse: () => cams.first);
      final ctrl = CameraController(back, ResolutionPreset.medium, enableAudio: false, imageFormatGroup: ImageFormatGroup.jpeg);
      await ctrl.initialize();
      if (!mounted) return;
      setState(() => _cam = ctrl);
    } catch (e) {
      if (kDebugMode) debugPrint('[SCAN] camera.init error: $e');
      rethrow;
    }
  }

  @override
  void dispose() {
    _cam?.dispose();
    _scan.removeListener((){});
    super.dispose();
  }

  Future<void> _capture() async {
    if (_cam == null || !_cam!.value.isInitialized) return;
    try {
      final file = await _cam!.takePicture();
      await _scan.processCapture(File(file.path));
      if (mounted && _scan.candidates.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No match found – Try again')),
        );
      }
      if (mounted && _scan.candidates.isNotEmpty) {
        await _showConfirmationSheet();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Capture failed: $e')));
    }
  }

  Future<void> _showConfirmationSheet() async {
    final list = [..._scan.candidates];
    if (list.isEmpty) return;
    list.sort((a, b) => b.confidence.compareTo(a.confidence));
    final best = list.first;
    final viable = list.where((c) => (best.confidence - c.confidence).abs() <= 0.05).take(3).toList();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: false,
      builder: (ctx) {
        ResolvedCandidate sel = best;
        bool adding = false;
        bool added = false;
        return StatefulBuilder(builder: (context, setS) {
          Future<void> doAdd() async {
            if (adding) return;
            setS(() { adding = true; added = true; });
            final prev = added;
            try {
              await _addToVault(sel);
            } catch (_) {
              setS(() { added = prev; });
            } finally {
              setS(() { adding = false; });
            }
          }

          return Padding(
            padding: const EdgeInsets.all(GVSpacing.s16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    FixCardImage(setCode: sel.setCode, number: sel.collectorNumber, width: 72, height: 72, fit: BoxFit.cover),
                    const SizedBox(width: GVSpacing.s12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(sel.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                          const SizedBox(height: GVSpacing.s4),
                          Text('${sel.setCode} #${sel.collectorNumber} • ${sel.language}'),
                          const SizedBox(height: GVSpacing.s4),
                          Text('Confidence ${(sel.confidence * 100).toStringAsFixed(0)}%'),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: GVSpacing.s12),
                Row(
                  children: [
                    FilledButton.icon(
                      onPressed: adding ? null : doAdd,
                      icon: Icon(added ? Icons.check : Icons.add),
                      label: Text(added ? 'Added' : 'Add to Vault'),
                    ),
                    const SizedBox(width: GVSpacing.s8),
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('Scan again')),
                  ],
                ),
                if (viable.length >= 2) ...[
                  const SizedBox(height: GVSpacing.s12),
                  const Text('Other matches', style: TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: GVSpacing.s8),
                  ...viable.skip(1).map((c) => ListTile(
                        leading: FixCardImage(setCode: c.setCode, number: c.collectorNumber, width: 40, height: 40, fit: BoxFit.cover),
                        title: Text(c.name),
                        subtitle: Text('${c.setCode} #${c.collectorNumber} • ${c.language} • ${(c.confidence * 100).toStringAsFixed(0)}%'),
                        onTap: () => setS(() => sel = c),
                      )),
                ],
              ],
            ),
          );
        });
      },
    );
  }

  Future<void> _addToVault(ResolvedCandidate c) async {
    try {
      final vs = VaultService(supabase);
      await vs.addOrIncrement(cardId: c.cardPrintId, deltaQty: 1, conditionLabel: 'NM');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to Vault')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to add: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final cam = _cam;
    final hasResult = _scan.candidates.isNotEmpty;
    return Scaffold(
      appBar: AppBar(title: const Text('Scan Card')),
      body: Column(
        children: [
          Expanded(
            child: FutureBuilder(
              future: _init,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done || cam == null || !cam.value.isInitialized) {
                  return const Center(child: CircularProgressIndicator());
                }
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    CameraPreview(cam),
                    const Positioned.fill(child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(color: Colors.transparent)))),
                    const ScanFrame(size: 260),
                  ],
                );
              },
            ),
          ),
          if (_scan.ocrResult != null) _buildOcrHint(),
          if (hasResult) _buildResults(),
          const SizedBox(height: GVSpacing.s12),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _capture,
        child: const Icon(Icons.camera_alt),
      ),
    );
  }

  Widget _buildOcrHint() {
    final o = _scan.ocrResult!;
    final txt = '${o.name}  #${o.collectorNumber}';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: GVSpacing.s16, vertical: GVSpacing.s8),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(txt, style: const TextStyle(fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildResults() {
    final results = _scan.candidates.take(3).toList();
    if (results.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(GVSpacing.s16),
        child: Row(
          children: [
            const Icon(Icons.error_outline),
            const SizedBox(width: GVSpacing.s8),
            const Expanded(child: Text('No match found – Try again')),
          ],
        ),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: GVSpacing.s16, vertical: GVSpacing.s8),
          child: Text('Matches', style: TextStyle(fontWeight: FontWeight.w700)),
        ),
        ...results.map((c) => _buildCandidateTile(c)).toList(),
      ],
    );
  }

  Widget _buildCandidateTile(ResolvedCandidate c) {
    return ListTile(
      leading: FixCardImage(
        setCode: c.setCode,
        number: c.collectorNumber,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
      ),
      title: Text('${c.name}'),
      subtitle: Text('${c.setCode} #${c.collectorNumber} • ${c.language}'),
      trailing: FilledButton(
        onPressed: () => _addToVault(c),
        child: const Text('Add to Vault'),
      ),
      onTap: () => _scan.choose(c),
    );
  }
}
