import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/pickers/quantity_stepper.dart';
import 'package:grookai_vault/ui/pickers/condition_picker.dart';
import 'package:grookai_vault/ui/overlays/adaptive_sheet.dart';
import 'package:grookai_vault/ui/overlays/toast_banner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/vault_service.dart';

Future<void> showAddToVaultSheet(BuildContext context, {required String cardId}) async {
  int qty = 1;
  String condition = 'NM';
  final notesCtrl = TextEditingController();
  await showAdaptiveSheet(
    context,
    child: StatefulBuilder(builder: (context, setState) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Add to Vault', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                const Text('Quantity'),
                const Spacer(),
                QuantityStepper(value: qty, onChanged: (v) => setState(() => qty = v)),
              ],
            ),
            const SizedBox(height: 12),
            Row(children: [const Text('Condition'), const Spacer(), ConditionPicker(value: condition, onChanged: (v) => setState(() => condition = v))]),
            const SizedBox(height: 12),
            TextField(controller: notesCtrl, decoration: const InputDecoration(labelText: 'Notes'), maxLines: 2),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () async {
                    try {
                      // Optimistic add
                      // ignore: use_build_context_synchronously
                      Navigator.of(context).pop();
                      showToastSuccess(context, 'Added to vault');
                      // Persist
                      // ignore: use_build_context_synchronously
                      final vs = VaultService(Supabase.instance.client);
                      await vs.addToVault(cardId: cardId, condition: condition, qty: qty, notes: notesCtrl.text);
                    } catch (e) {
                      // ignore: use_build_context_synchronously
                      showToastError(context, 'Add failed: $e');
                    }
                  },
                  child: const Text('Confirm'),
                ),
              ),
            ]),
          ],
        ),
      );
    }),
  );
}
