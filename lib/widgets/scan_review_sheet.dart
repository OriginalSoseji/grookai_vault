import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:grookai_vault/data/scans/scan_draft.dart';

class ScanReviewSheet extends StatelessWidget {
  final ScanDraft draft;
  final Future<void> Function() onConfirm;
  final VoidCallback onReject;

  const ScanReviewSheet({
    super.key,
    required this.draft,
    required this.onConfirm,
    required this.onReject,
  });

  Future<Image> _toWidget(ui.Image img) async {
    final bytes = await img.toByteData(format: ui.ImageByteFormat.png);
    return Image.memory(bytes!.buffer.asUint8List(), fit: BoxFit.contain);
  }

  Widget _kv(String k, String? v) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(k, style: const TextStyle(fontWeight: FontWeight.w600)),
        Flexible(child: Text(v ?? '-', textAlign: TextAlign.right)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Image>(
      future: _toWidget(draft.image),
      builder: (context, snap) {
        final img = snap.data;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(height: 180, alignment: Alignment.center, child: img ?? const SizedBox()),
                const SizedBox(height: 12),
                const Text('Confirm Card Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _kv('Card No / Set Size',
                    (draft.out.cardNo != null && draft.out.setSize != null) ? '${draft.out.cardNo}/${draft.out.setSize}' : null),
                _kv('Year', draft.out.year?.toString()),
                _kv('Set (detected)', draft.out.setId),
                const SizedBox(height: 8),
                const Text('Variant / Stamp', style: TextStyle(fontWeight: FontWeight.bold)),
                _kv('Tag', draft.out.variant.variantTag),
                _kv('Overlay', draft.out.variant.hasOverlay ? 'Yes' : 'No'),
                _kv('Confidence', draft.out.variant.stampConfidence?.toStringAsFixed(2)),
                const SizedBox(height: 8),
                if (draft.out.condition != null) ...[
                  const Text('Condition (quick view)', style: TextStyle(fontWeight: FontWeight.bold)),
                  _kv('Grade', (draft.out.condition as dynamic).grade?.label),
                  _kv('Quality Index', (draft.out.condition as dynamic).qualityIndex?.toStringAsFixed(1)),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: onReject,
                        child: const Text('Not this card'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          await onConfirm();
                        },
                        child: const Text('Add to Vault'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        );
      },
    );
  }
}
