import 'package:flutter/material.dart';

class ScanConfirmSheet extends StatefulWidget {
  final String? cardId;
  final String? name;
  final String? setCode;
  final String? number;
  final String? imageUrl;
  final Future<void> Function(String condition) onAddToVault;
  final Future<void> Function(String condition) onCreateListing;
  const ScanConfirmSheet({super.key, this.cardId, this.name, this.setCode, this.number, this.imageUrl, required this.onAddToVault, required this.onCreateListing});
  @override
  State<ScanConfirmSheet> createState() => _ScanConfirmSheetState();
}

class _ScanConfirmSheetState extends State<ScanConfirmSheet> {
  String _condition = 'NM';
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              if ((widget.imageUrl ?? '').isNotEmpty) Image.network(widget.imageUrl!, width: 72, height: 96, fit: BoxFit.cover),
              const SizedBox(width: 12),
              Expanded(child: Text(widget.name ?? 'Card', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
            ]),
            const SizedBox(height: 8),
            Text('${widget.setCode ?? ''} • ${widget.number ?? ''}'),
            const SizedBox(height: 12),
            Row(children: [
              const Text('Condition:'),
              const SizedBox(width: 12),
              DropdownButton<String>(
                value: _condition,
                items: const [DropdownMenuItem(value: 'NM', child: Text('NM')), DropdownMenuItem(value: 'LP', child: Text('LP')), DropdownMenuItem(value: 'MP', child: Text('MP')), DropdownMenuItem(value: 'HP', child: Text('HP')), DropdownMenuItem(value: 'SKIP', child: Text('Skip'))],
                onChanged: (v) => setState(() => _condition = v ?? 'NM'),
              ),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () async {
                    await widget.onAddToVault(_condition);
                    if (mounted) Navigator.of(context).pop();
                  },
                  child: const Text('Add to Vault'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () async {
                    await widget.onCreateListing(_condition);
                    if (mounted) Navigator.of(context).pop();
                  },
                  child: const Text('Create Listing'),
                ),
              ),
            ]),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

