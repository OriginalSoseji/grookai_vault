import 'package:flutter/material.dart';

class AddToVaultResult {
  final int qty;
  final String conditionLabel;
  final String? notes;
  AddToVaultResult({
    required this.qty,
    required this.conditionLabel,
    this.notes,
  });
}

Future<AddToVaultResult?> showAddToVaultSheet(BuildContext context) {
  return showModalBottomSheet<AddToVaultResult>(
    context: context,
    isScrollControlled: true,
    builder: (context) => const _AddToVaultSheet(),
  );
}

class _AddToVaultSheet extends StatefulWidget {
  const _AddToVaultSheet();
  @override
  State<_AddToVaultSheet> createState() => _AddToVaultSheetState();
}

class _AddToVaultSheetState extends State<_AddToVaultSheet> {
  final _qtyCtrl = TextEditingController(text: '1');
  final _notesCtrl = TextEditingController();
  String _condition = 'NM';

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.of(context).viewInsets;
    return Padding(
      padding: EdgeInsets.only(bottom: padding.bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Add to Vault',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _qtyCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Quantity'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _condition,
                      items: const [
                        DropdownMenuItem(value: 'NM', child: Text('NM')),
                        DropdownMenuItem(value: 'LP', child: Text('LP')),
                        DropdownMenuItem(value: 'MP', child: Text('MP')),
                        DropdownMenuItem(value: 'HP', child: Text('HP')),
                        DropdownMenuItem(value: 'DMG', child: Text('DMG')),
                      ],
                      onChanged: (v) => setState(() => _condition = v ?? 'NM'),
                      decoration: const InputDecoration(labelText: 'Condition'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _notesCtrl,
                decoration: const InputDecoration(labelText: 'Notes'),
                minLines: 1,
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context, null),
                      icon: const Icon(Icons.close),
                      label: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () {
                        final qty = int.tryParse(_qtyCtrl.text.trim()) ?? 1;
                        Navigator.pop(
                          context,
                          AddToVaultResult(
                            qty: qty.clamp(1, 9999),
                            conditionLabel: _condition,
                            notes: _notesCtrl.text.trim().isEmpty
                                ? null
                                : _notesCtrl.text.trim(),
                          ),
                        );
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('Add'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
