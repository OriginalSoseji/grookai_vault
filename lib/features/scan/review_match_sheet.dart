import 'package:flutter/material.dart';
import 'models/scan_candidate.dart';

class ReviewMatchSheet extends StatelessWidget {
  final List<ScanCandidate> candidates;
  final void Function(ScanCandidate) onConfirm;
  final VoidCallback onReject;
  const ReviewMatchSheet({super.key, required this.candidates, required this.onConfirm, required this.onReject});

  bool get _ambiguous {
    if (candidates.isEmpty) return true;
    if (candidates.first.confidence < 0.92) return true;
    return candidates.length > 1;
  }

  @override
  Widget build(BuildContext context) {
    final top = candidates.isNotEmpty ? candidates.first : null;
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Confirm Match', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (top != null)
              ListTile(
                title: Text(top.name),
                subtitle: Text('${top.setCode} • ${top.number}'),
                trailing: Text('${(top.confidence * 100).toStringAsFixed(0)}%'),
              ),
            if (_ambiguous) ...[
              const SizedBox(height: 8),
              const Text('Other matches'),
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: candidates.length,
                  itemBuilder: (_, i) {
                    final c = candidates[i];
                    return Container(
                      width: 160,
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(8)),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(c.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 4),
                        Text('${c.setCode} ${c.number}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        const Spacer(),
                        Align(alignment: Alignment.bottomRight, child: Text('${(c.confidence * 100).toStringAsFixed(0)}%')),
                      ]),
                    );
                  },
                ),
              ),
            ],
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton(onPressed: onReject, child: const Text('Not this')),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: top == null ? null : () => onConfirm(top),
                  child: const Text('This is my card'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}

